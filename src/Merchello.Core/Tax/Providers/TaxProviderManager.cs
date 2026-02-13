using Merchello.Core.Data;
using Merchello.Core.Tax.Models;
using Merchello.Core.Tax.Providers.Interfaces;
using Merchello.Core.Tax.Providers.Models;
using Merchello.Core.Shared.Reflection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Tax.Providers;

public class TaxProviderManager(
    ExtensionManager extensionManager,
    IServiceScopeFactory serviceScopeFactory,
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IProviderSettingsProtector providerSettingsProtector,
    ILogger<TaxProviderManager> logger) : ITaxProviderManager, IDisposable
{
    private readonly SemaphoreSlim _cacheLock = new(1, 1);
    private volatile IReadOnlyCollection<RegisteredTaxProvider>? _cachedProviders;
    private IServiceScope? _providerScope;
    private bool _disposed;

    public async Task<IReadOnlyCollection<RegisteredTaxProvider>> GetProvidersAsync(
        CancellationToken cancellationToken = default)
    {
        var cached = _cachedProviders;
        if (cached != null)
        {
            return cached;
        }

        await _cacheLock.WaitAsync(cancellationToken);
        try
        {
            cached = _cachedProviders;
            if (cached != null)
            {
                return cached;
            }

            _providerScope?.Dispose();
            _providerScope = serviceScopeFactory.CreateScope();

            var providerInstances = extensionManager.GetInstances<ITaxProvider>(
                    predicate: null,
                    useCaching: true,
                    serviceProvider: _providerScope.ServiceProvider)
                .Where(p => p != null)
                .Cast<ITaxProvider>()
                .ToList();

            using var scope = efCoreScopeProvider.CreateScope();
            var settings = await scope.ExecuteWithContextAsync(async db =>
                await db.ProviderConfigurations
                    .OfType<TaxProviderSetting>()
                    .AsNoTracking()
                    .ToListAsync(cancellationToken));
            scope.Complete();

            List<RegisteredTaxProvider> registeredProviders = [];
            HashSet<string> aliases = new(StringComparer.OrdinalIgnoreCase);

            foreach (var provider in providerInstances)
            {
                var metadata = provider.Metadata;
                if (string.IsNullOrWhiteSpace(metadata.Alias))
                {
                    logger.LogWarning(
                        "Tax provider {ProviderType} has an empty alias and will be ignored.",
                        provider.GetType().FullName);
                    continue;
                }

                if (!aliases.Add(metadata.Alias))
                {
                    logger.LogWarning(
                        "Duplicate tax provider alias '{Alias}' detected. Provider {ProviderType} will be skipped.",
                        metadata.Alias,
                        provider.GetType().FullName);
                    continue;
                }

                var setting = settings.FirstOrDefault(s =>
                    string.Equals(s.ProviderKey, metadata.Alias, StringComparison.OrdinalIgnoreCase));

                try
                {
                    TaxProviderConfiguration? configuration = null;
                    if (setting != null && !string.IsNullOrWhiteSpace(setting.SettingsJson))
                    {
                        var settingsJson = DecryptSettingsJson(setting.SettingsJson);
                        configuration = new TaxProviderConfiguration(settingsJson);
                    }

                    await provider.ConfigureAsync(configuration, cancellationToken);
                    registeredProviders.Add(new RegisteredTaxProvider(provider, setting, configuration));
                }
                catch (Exception ex)
                {
                    logger.LogError(
                        ex,
                        "Failed to configure tax provider '{Alias}'. Provider will be skipped.",
                        metadata.Alias);
                }
            }

            _cachedProviders = registeredProviders;
            return registeredProviders;
        }
        finally
        {
            _cacheLock.Release();
        }
    }

    public async Task<RegisteredTaxProvider?> GetActiveProviderAsync(
        CancellationToken cancellationToken = default)
    {
        var providers = await GetProvidersAsync(cancellationToken);
        var active = providers.FirstOrDefault(p => p.IsActive);
        if (active != null)
        {
            return active;
        }

        var defaultProvider = providers
            .OrderBy(p => !string.Equals(p.Metadata.Alias, "manual", StringComparison.OrdinalIgnoreCase))
            .FirstOrDefault();

        if (defaultProvider == null)
        {
            return null;
        }

        var activated = await SetActiveProviderAsync(defaultProvider.Metadata.Alias, cancellationToken);
        if (!activated)
        {
            return null;
        }

        RefreshCache();
        providers = await GetProvidersAsync(cancellationToken);
        return providers.FirstOrDefault(p => p.IsActive)
               ?? providers.FirstOrDefault(p =>
                   string.Equals(p.Metadata.Alias, defaultProvider.Metadata.Alias, StringComparison.OrdinalIgnoreCase));
    }

    public async Task<bool> SetActiveProviderAsync(
        string alias,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(alias))
        {
            return false;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        var success = await scope.ExecuteWithContextAsync(async db =>
        {
            var allSettings = await db.ProviderConfigurations
                .OfType<TaxProviderSetting>()
                .ToListAsync(cancellationToken);

            foreach (var setting in allSettings.Where(s => s.IsEnabled))
            {
                setting.IsEnabled = false;
                setting.UpdateDate = DateTime.UtcNow;
            }

            var target = allSettings.FirstOrDefault(s =>
                string.Equals(s.ProviderKey, alias, StringComparison.OrdinalIgnoreCase));

            if (target == null)
            {
                target = new TaxProviderSetting
                {
                    ProviderKey = alias,
                    IsEnabled = true,
                    CreateDate = DateTime.UtcNow,
                    UpdateDate = DateTime.UtcNow
                };
                db.ProviderConfigurations.Add(target);
            }
            else
            {
                target.IsEnabled = true;
                target.UpdateDate = DateTime.UtcNow;
            }

            await db.SaveChangesAsync(cancellationToken);
            return true;
        });
        scope.Complete();

        if (success)
        {
            RefreshCache();
        }

        return success;
    }

    public async Task<bool> SaveProviderSettingsAsync(
        string alias,
        Dictionary<string, string> settings,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(alias))
        {
            return false;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        var success = await scope.ExecuteWithContextAsync(async db =>
        {
            var existing = await db.ProviderConfigurations
                .OfType<TaxProviderSetting>()
                .FirstOrDefaultAsync(s => s.ProviderKey == alias, cancellationToken);

            var json = new TaxProviderConfiguration(settings).ToJson();
            var protectedJson = providerSettingsProtector.Protect(json);

            if (existing == null)
            {
                db.ProviderConfigurations.Add(new TaxProviderSetting
                {
                    ProviderKey = alias,
                    SettingsJson = protectedJson,
                    IsEnabled = false,
                    CreateDate = DateTime.UtcNow,
                    UpdateDate = DateTime.UtcNow
                });
            }
            else
            {
                existing.SettingsJson = protectedJson;
                existing.UpdateDate = DateTime.UtcNow;
            }

            await db.SaveChangesAsync(cancellationToken);
            return true;
        });
        scope.Complete();

        if (success)
        {
            RefreshCache();
        }

        return success;
    }

    public async Task<ShippingTaxConfigurationResult> GetShippingTaxConfigurationAsync(
        string countryCode,
        string? stateCode,
        CancellationToken cancellationToken = default)
    {
        var activeProvider = await GetActiveProviderAsync(cancellationToken);
        if (activeProvider?.Provider == null)
        {
            return ShippingTaxConfigurationResult.NotTaxed();
        }

        var configuration = await activeProvider.Provider.GetShippingTaxConfigurationAsync(
            countryCode,
            stateCode,
            cancellationToken);

        return configuration ?? ShippingTaxConfigurationResult.NotTaxed();
    }

    private string DecryptSettingsJson(string settingsJson)
    {
        if (!providerSettingsProtector.IsProtected(settingsJson))
        {
            return settingsJson;
        }

        try
        {
            return providerSettingsProtector.Unprotect(settingsJson);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to decrypt tax provider settings payload.");
            throw;
        }
    }

    private void RefreshCache()
    {
        DisposeProviders();
        _providerScope?.Dispose();
        _providerScope = null;
        _cachedProviders = null;
    }

    private void DisposeProviders()
    {
        var providers = _cachedProviders;
        if (providers == null)
        {
            return;
        }

        foreach (var registered in providers)
        {
            if (registered.Provider is not IDisposable disposable)
            {
                continue;
            }

            try
            {
                disposable.Dispose();
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Error disposing tax provider {ProviderAlias}", registered.Metadata.Alias);
            }
        }
    }

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;

        DisposeProviders();
        _providerScope?.Dispose();
        _providerScope = null;
        _cachedProviders = null;
        _cacheLock.Dispose();

        GC.SuppressFinalize(this);
    }
}

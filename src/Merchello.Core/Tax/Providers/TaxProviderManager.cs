using Merchello.Core.Data;
using Merchello.Core.Tax.Models;
using Merchello.Core.Tax.Providers.BuiltIn;
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

            // Create a scope that lives as long as the cached providers
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
                await db.TaxProviderSettings
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
                        metadata.Alias, provider.GetType().FullName);
                    continue;
                }

                var setting = settings.FirstOrDefault(s =>
                    string.Equals(s.ProviderAlias, metadata.Alias, StringComparison.OrdinalIgnoreCase));

                try
                {
                    TaxProviderConfiguration? configuration = null;
                    if (setting != null && !string.IsNullOrWhiteSpace(setting.ConfigurationJson))
                    {
                        configuration = new TaxProviderConfiguration(setting.ConfigurationJson);
                    }

                    await provider.ConfigureAsync(configuration, cancellationToken);
                }
                catch (Exception ex)
                {
                    logger.LogError(
                        ex,
                        "Failed to configure tax provider '{Alias}'. Provider will be skipped.",
                        metadata.Alias);
                    continue;
                }

                registeredProviders.Add(new RegisteredTaxProvider(provider, setting));
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

        // Default to manual provider if no active provider is set
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
            var allSettings = await db.TaxProviderSettings.ToListAsync(cancellationToken);

            // Deactivate all providers
            foreach (var setting in allSettings.Where(s => s.IsActive))
            {
                setting.IsActive = false;
                setting.UpdateDate = DateTime.UtcNow;
            }

            var target = allSettings.FirstOrDefault(s =>
                string.Equals(s.ProviderAlias, alias, StringComparison.OrdinalIgnoreCase));

            if (target == null)
            {
                target = new TaxProviderSetting
                {
                    ProviderAlias = alias,
                    IsActive = true,
                    CreateDate = DateTime.UtcNow,
                    UpdateDate = DateTime.UtcNow
                };
                db.TaxProviderSettings.Add(target);
            }
            else
            {
                target.IsActive = true;
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
            var existing = await db.TaxProviderSettings
                .FirstOrDefaultAsync(s => s.ProviderAlias == alias, cancellationToken);

            var json = new TaxProviderConfiguration(settings).ToJson();

            if (existing == null)
            {
                db.TaxProviderSettings.Add(new TaxProviderSetting
                {
                    ProviderAlias = alias,
                    ConfigurationJson = json,
                    IsActive = false,
                    CreateDate = DateTime.UtcNow,
                    UpdateDate = DateTime.UtcNow
                });
            }
            else
            {
                existing.ConfigurationJson = json;
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

    public async Task<bool> IsShippingTaxedForLocationAsync(
        string countryCode,
        string? stateCode,
        CancellationToken cancellationToken = default)
    {
        var activeProvider = await GetActiveProviderAsync(cancellationToken);
        if (activeProvider == null)
            return false; // No active provider = no tax

        // For ManualTaxProvider, use its specific implementation
        if (activeProvider.Provider is ManualTaxProvider manualProvider)
        {
            return await manualProvider.IsShippingTaxedForLocationAsync(countryCode, stateCode, cancellationToken);
        }

        // For other providers (Avalara, etc.), assume shipping is taxed if provider is active
        // Each provider can implement its own logic if needed
        return true;
    }

    public async Task<decimal?> GetShippingTaxRateForLocationAsync(
        string countryCode,
        string? stateCode,
        CancellationToken cancellationToken = default)
    {
        var activeProvider = await GetActiveProviderAsync(cancellationToken);
        if (activeProvider?.Provider == null)
            return null;

        return await activeProvider.Provider.GetShippingTaxRateForLocationAsync(
            countryCode, stateCode, cancellationToken);
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
        if (providers == null) return;

        foreach (var registered in providers)
        {
            if (registered.Provider is IDisposable disposable)
            {
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
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;

        DisposeProviders();
        _providerScope?.Dispose();
        _providerScope = null;
        _cachedProviders = null;
        _cacheLock.Dispose();

        GC.SuppressFinalize(this);
    }
}

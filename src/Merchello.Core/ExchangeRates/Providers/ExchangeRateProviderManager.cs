using Merchello.Core.Data;
using Merchello.Core.ExchangeRates.Models;
using Merchello.Core.ExchangeRates.Providers.Interfaces;
using Merchello.Core.Shared.Reflection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.ExchangeRates.Providers;

public class ExchangeRateProviderManager(
    ExtensionManager extensionManager,
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    ILogger<ExchangeRateProviderManager> logger) : IExchangeRateProviderManager, IDisposable
{
    private readonly SemaphoreSlim _cacheLock = new(1, 1);
    private volatile IReadOnlyCollection<RegisteredExchangeRateProvider>? _cachedProviders;
    private bool _disposed;

    public async Task<IReadOnlyCollection<RegisteredExchangeRateProvider>> GetProvidersAsync(
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

            var providerInstances = extensionManager.GetInstances<IExchangeRateProvider>(useCaching: true)
                .Where(p => p != null)
                .Cast<IExchangeRateProvider>()
                .ToList();

            using var scope = efCoreScopeProvider.CreateScope();
            var settings = await scope.ExecuteWithContextAsync(async db =>
                await db.ExchangeRateProviderSettings
                    .AsNoTracking()
                    .ToListAsync(cancellationToken));
            scope.Complete();

            List<RegisteredExchangeRateProvider> registeredProviders = [];
            HashSet<string> aliases = new(StringComparer.OrdinalIgnoreCase);

            foreach (var provider in providerInstances)
            {
                var metadata = provider.Metadata;
                if (string.IsNullOrWhiteSpace(metadata.Alias))
                {
                    logger.LogWarning(
                        "Exchange rate provider {ProviderType} has an empty alias and will be ignored.",
                        provider.GetType().FullName);
                    continue;
                }

                if (!aliases.Add(metadata.Alias))
                {
                    logger.LogWarning(
                        "Duplicate exchange rate provider alias '{Alias}' detected. Provider {ProviderType} will be skipped.",
                        metadata.Alias, provider.GetType().FullName);
                    continue;
                }

                var setting = settings.FirstOrDefault(s =>
                    string.Equals(s.ProviderAlias, metadata.Alias, StringComparison.OrdinalIgnoreCase));

                try
                {
                    ExchangeRateProviderConfiguration? configuration = null;
                    if (setting != null && !string.IsNullOrWhiteSpace(setting.ConfigurationJson))
                    {
                        configuration = new ExchangeRateProviderConfiguration(setting.ConfigurationJson);
                    }

                    await provider.ConfigureAsync(configuration, cancellationToken);
                }
                catch (Exception ex)
                {
                    logger.LogError(
                        ex,
                        "Failed to configure exchange rate provider '{Alias}'. Provider will be skipped.",
                        metadata.Alias);
                    continue;
                }

                registeredProviders.Add(new RegisteredExchangeRateProvider(provider, setting));
            }

            _cachedProviders = registeredProviders;
            return registeredProviders;
        }
        finally
        {
            _cacheLock.Release();
        }
    }

    public async Task<RegisteredExchangeRateProvider?> GetActiveProviderAsync(
        CancellationToken cancellationToken = default)
    {
        var providers = await GetProvidersAsync(cancellationToken);
        var active = providers.FirstOrDefault(p => p.IsActive);
        if (active != null)
        {
            return active;
        }

        var defaultProvider = providers
            .OrderBy(p => !string.Equals(p.Metadata.Alias, "frankfurter", StringComparison.OrdinalIgnoreCase))
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
            var allSettings = await db.ExchangeRateProviderSettings.ToListAsync(cancellationToken);

            foreach (var setting in allSettings.Where(s => s.IsActive))
            {
                setting.IsActive = false;
                setting.UpdateDate = DateTime.UtcNow;
            }

            var target = allSettings.FirstOrDefault(s =>
                string.Equals(s.ProviderAlias, alias, StringComparison.OrdinalIgnoreCase));

            if (target == null)
            {
                target = new ExchangeRateProviderSetting
                {
                    ProviderAlias = alias,
                    IsActive = true,
                    CreateDate = DateTime.UtcNow,
                    UpdateDate = DateTime.UtcNow
                };
                db.ExchangeRateProviderSettings.Add(target);
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
            var existing = await db.ExchangeRateProviderSettings
                .FirstOrDefaultAsync(s => s.ProviderAlias == alias, cancellationToken);

            var json = new ExchangeRateProviderConfiguration(settings).ToJson();

            if (existing == null)
            {
                db.ExchangeRateProviderSettings.Add(new ExchangeRateProviderSetting
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

    private void RefreshCache()
    {
        DisposeProviders();
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
                    logger.LogWarning(ex, "Error disposing exchange rate provider {ProviderAlias}", registered.Metadata.Alias);
                }
            }
        }
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;

        DisposeProviders();
        _cachedProviders = null;
        _cacheLock.Dispose();

        GC.SuppressFinalize(this);
    }
}


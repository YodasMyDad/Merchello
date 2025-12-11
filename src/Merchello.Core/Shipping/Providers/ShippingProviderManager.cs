using Merchello.Core.Data;
using Merchello.Core.Shared.Reflection;
using Merchello.Core.Shipping.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Shipping.Providers;

/// <summary>
/// Discovers and configures shipping provider implementations.
/// </summary>
public class ShippingProviderManager(
    ExtensionManager extensionManager,
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    ILogger<ShippingProviderManager> logger) : IShippingProviderManager, IDisposable
{
    private readonly SemaphoreSlim _cacheLock = new(1, 1);
    private volatile IReadOnlyCollection<RegisteredShippingProvider>? _cachedProviders;
    private bool _disposed;

    public async Task<IReadOnlyCollection<RegisteredShippingProvider>> GetProvidersAsync(CancellationToken cancellationToken = default)
    {
        // Fast path - volatile read ensures we see latest value
        var cached = _cachedProviders;
        if (cached != null)
        {
            return cached;
        }

        // Thread-safe initialization using semaphore
        await _cacheLock.WaitAsync(cancellationToken);
        try
        {
            // Double-check after acquiring lock
            cached = _cachedProviders;
            if (cached != null)
            {
                return cached;
            }

            var providerInstances = extensionManager.GetInstances<IShippingProvider>(useCaching: true)
                .Where(p => p != null)
                .Cast<IShippingProvider>()
                .ToList();

            using var scope = efCoreScopeProvider.CreateScope();
            var configurations = await scope.ExecuteWithContextAsync(async db =>
                await db.ShippingProviderConfigurations
                    .AsNoTracking()
                    .ToListAsync(cancellationToken));
            scope.Complete();

            List<RegisteredShippingProvider> registeredProviders = [];
            HashSet<string> keys = new(StringComparer.OrdinalIgnoreCase);

            foreach (var provider in providerInstances)
            {
                var metadata = provider.Metadata;
                if (string.IsNullOrWhiteSpace(metadata.Key))
                {
                    logger.LogWarning("Shipping provider {ProviderType} has an empty metadata key and will be ignored.", provider.GetType().FullName);
                    continue;
                }

                if (!keys.Add(metadata.Key))
                {
                    logger.LogWarning("Duplicate shipping provider key '{ProviderKey}' detected. Provider {ProviderType} will be skipped.", metadata.Key, provider.GetType().FullName);
                    continue;
                }

                var configuration = configurations.FirstOrDefault(cfg =>
                    string.Equals(cfg.ProviderKey, metadata.Key, StringComparison.OrdinalIgnoreCase));

                try
                {
                    await provider.ConfigureAsync(configuration, cancellationToken);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Failed to configure shipping provider {ProviderKey}. Provider will be skipped.", metadata.Key);
                    continue;
                }

                registeredProviders.Add(new RegisteredShippingProvider(provider, configuration));
            }

            // Thread-safe assignment - volatile write ensures visibility
            _cachedProviders = registeredProviders;
            return registeredProviders;
        }
        finally
        {
            _cacheLock.Release();
        }
    }

    public async Task<IReadOnlyCollection<RegisteredShippingProvider>> GetEnabledProvidersAsync(CancellationToken cancellationToken = default)
    {
        var providers = await GetProvidersAsync(cancellationToken);
        return providers
            .Where(p => p.IsEnabled)
            .OrderBy(p => p.SortOrder)
            .ToList();
    }

    public async Task<RegisteredShippingProvider?> GetProviderAsync(string providerKey, bool requireEnabled = true, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(providerKey))
        {
            return null;
        }

        var providers = await GetProvidersAsync(cancellationToken);
        var provider = providers.FirstOrDefault(p =>
            string.Equals(p.Metadata.Key, providerKey, StringComparison.OrdinalIgnoreCase));

        if (provider == null)
        {
            return null;
        }

        if (requireEnabled && !provider.IsEnabled)
        {
            return null;
        }

        return provider;
    }

    public async Task<ShippingProviderConfiguration> SaveConfigurationAsync(ShippingProviderConfiguration configuration, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();

        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var existing = await db.ShippingProviderConfigurations
                .FirstOrDefaultAsync(c => c.Id == configuration.Id, cancellationToken);

            if (existing != null)
            {
                existing.DisplayName = configuration.DisplayName;
                existing.IsEnabled = configuration.IsEnabled;
                existing.SettingsJson = configuration.SettingsJson;
                existing.SortOrder = configuration.SortOrder;
                existing.UpdateDate = DateTime.UtcNow;
                await db.SaveChangesAsync(cancellationToken);
                return existing;
            }

            configuration.CreateDate = DateTime.UtcNow;
            configuration.UpdateDate = DateTime.UtcNow;
            db.ShippingProviderConfigurations.Add(configuration);
            await db.SaveChangesAsync(cancellationToken);
            return configuration;
        });

        scope.Complete();
        ClearCache();
        return result;
    }

    public async Task<bool> SetProviderEnabledAsync(Guid configurationId, bool enabled, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();

        var success = await scope.ExecuteWithContextAsync(async db =>
        {
            var config = await db.ShippingProviderConfigurations
                .FirstOrDefaultAsync(c => c.Id == configurationId, cancellationToken);

            if (config == null)
            {
                return false;
            }

            config.IsEnabled = enabled;
            config.UpdateDate = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
            return true;
        });

        scope.Complete();
        ClearCache();
        return success;
    }

    public async Task UpdateSortOrderAsync(IEnumerable<Guid> orderedIds, CancellationToken cancellationToken = default)
    {
        var idList = orderedIds.ToList();

        using var scope = efCoreScopeProvider.CreateScope();

        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var configurations = await db.ShippingProviderConfigurations
                .Where(c => idList.Contains(c.Id))
                .ToListAsync(cancellationToken);

            for (var i = 0; i < idList.Count; i++)
            {
                var config = configurations.FirstOrDefault(c => c.Id == idList[i]);
                if (config != null)
                {
                    config.SortOrder = i;
                    config.UpdateDate = DateTime.UtcNow;
                }
            }

            await db.SaveChangesAsync(cancellationToken);
            return true;
        });

        scope.Complete();
        ClearCache();
    }

    public async Task<bool> DeleteConfigurationAsync(Guid configurationId, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();

        var success = await scope.ExecuteWithContextAsync(async db =>
        {
            var config = await db.ShippingProviderConfigurations
                .FirstOrDefaultAsync(c => c.Id == configurationId, cancellationToken);

            if (config == null)
            {
                return false;
            }

            db.ShippingProviderConfigurations.Remove(config);
            await db.SaveChangesAsync(cancellationToken);
            return true;
        });

        scope.Complete();
        ClearCache();
        return success;
    }

    public void ClearCache()
    {
        DisposeProviders();
        _cachedProviders = null;
    }

    /// <summary>
    /// Disposes all cached providers that implement IDisposable.
    /// </summary>
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
                    logger.LogWarning(ex, "Error disposing shipping provider {ProviderKey}", registered.Metadata.Key);
                }
            }
        }
    }

    /// <summary>
    /// Disposes resources used by the manager.
    /// </summary>
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

using Merchello.Core.AddressLookup.Models;
using Merchello.Core.AddressLookup.Providers.Interfaces;
using Merchello.Core.AddressLookup.Providers.Models;
using Merchello.Core.Data;
using Merchello.Core.Shared.Reflection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.AddressLookup.Providers;

public class AddressLookupProviderManager(
    ExtensionManager extensionManager,
    IServiceScopeFactory serviceScopeFactory,
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    ILogger<AddressLookupProviderManager> logger) : IAddressLookupProviderManager, IDisposable
{
    private readonly SemaphoreSlim _cacheLock = new(1, 1);
    private volatile IReadOnlyCollection<RegisteredAddressLookupProvider>? _cachedProviders;
    private IServiceScope? _providerScope;
    private bool _disposed;

    public async Task<IReadOnlyCollection<RegisteredAddressLookupProvider>> GetProvidersAsync(
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

            var providerInstances = extensionManager.GetInstances<IAddressLookupProvider>(
                    predicate: null,
                    useCaching: true,
                    serviceProvider: _providerScope.ServiceProvider)
                .Where(p => p != null)
                .Cast<IAddressLookupProvider>()
                .ToList();

            using var scope = efCoreScopeProvider.CreateScope();
            var settings = await scope.ExecuteWithContextAsync(async db =>
                await db.ProviderConfigurations
                    .OfType<AddressLookupProviderSetting>()
                    .AsNoTracking()
                    .ToListAsync(cancellationToken));
            scope.Complete();

            List<RegisteredAddressLookupProvider> registeredProviders = [];
            HashSet<string> aliases = new(StringComparer.OrdinalIgnoreCase);

            foreach (var provider in providerInstances)
            {
                var metadata = provider.Metadata;
                if (string.IsNullOrWhiteSpace(metadata.Alias))
                {
                    logger.LogWarning(
                        "Address lookup provider {ProviderType} has an empty alias and will be ignored.",
                        provider.GetType().FullName);
                    continue;
                }

                if (!aliases.Add(metadata.Alias))
                {
                    logger.LogWarning(
                        "Duplicate address lookup provider alias '{Alias}' detected. Provider {ProviderType} will be skipped.",
                        metadata.Alias, provider.GetType().FullName);
                    continue;
                }

                var setting = settings.FirstOrDefault(s =>
                    string.Equals(s.ProviderKey, metadata.Alias, StringComparison.OrdinalIgnoreCase));

                try
                {
                    AddressLookupProviderConfiguration? configuration = null;
                    if (setting != null && !string.IsNullOrWhiteSpace(setting.SettingsJson))
                    {
                        configuration = new AddressLookupProviderConfiguration(setting.SettingsJson);
                    }

                    await provider.ConfigureAsync(configuration, cancellationToken);
                }
                catch (Exception ex)
                {
                    logger.LogError(
                        ex,
                        "Failed to configure address lookup provider '{Alias}'. Provider will be skipped.",
                        metadata.Alias);
                    continue;
                }

                registeredProviders.Add(new RegisteredAddressLookupProvider(provider, setting));
            }

            _cachedProviders = registeredProviders;
            return registeredProviders;
        }
        finally
        {
            _cacheLock.Release();
        }
    }

    public async Task<RegisteredAddressLookupProvider?> GetActiveProviderAsync(
        CancellationToken cancellationToken = default)
    {
        var providers = await GetProvidersAsync(cancellationToken);
        return providers.FirstOrDefault(p => p.IsActive);
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
                .OfType<AddressLookupProviderSetting>()
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
                target = new AddressLookupProviderSetting
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

    public async Task<bool> DeactivateAllProvidersAsync(
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var success = await scope.ExecuteWithContextAsync(async db =>
        {
            var settings = await db.ProviderConfigurations
                .OfType<AddressLookupProviderSetting>()
                .Where(s => s.IsEnabled)
                .ToListAsync(cancellationToken);

            if (settings.Count == 0)
            {
                return true;
            }

            foreach (var setting in settings)
            {
                setting.IsEnabled = false;
                setting.UpdateDate = DateTime.UtcNow;
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
                .OfType<AddressLookupProviderSetting>()
                .FirstOrDefaultAsync(s => s.ProviderKey == alias, cancellationToken);

            var json = new AddressLookupProviderConfiguration(settings).ToJson();

            if (existing == null)
            {
                db.ProviderConfigurations.Add(new AddressLookupProviderSetting
                {
                    ProviderKey = alias,
                    SettingsJson = json,
                    IsEnabled = false,
                    CreateDate = DateTime.UtcNow,
                    UpdateDate = DateTime.UtcNow
                });
            }
            else
            {
                existing.SettingsJson = json;
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
                    logger.LogWarning(ex, "Error disposing address lookup provider {ProviderAlias}", registered.Metadata.Alias);
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

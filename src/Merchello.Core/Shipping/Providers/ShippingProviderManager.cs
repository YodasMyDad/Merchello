using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Merchello.Core.Data;
using Merchello.Core.Shared.Reflection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.Shipping.Providers;

/// <summary>
/// Discovers and configures shipping provider implementations.
/// </summary>
public class ShippingProviderManager : IShippingProviderManager
{
    private readonly ExtensionManager _extensionManager;
    private readonly IMerchDbContext _dbContext;
    private readonly ILogger<ShippingProviderManager> _logger;
    private IReadOnlyCollection<RegisteredShippingProvider>? _cachedProviders;

    public ShippingProviderManager(
        ExtensionManager extensionManager,
        IMerchDbContext dbContext,
        ILogger<ShippingProviderManager> logger)
    {
        _extensionManager = extensionManager;
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<IReadOnlyCollection<RegisteredShippingProvider>> GetProvidersAsync(CancellationToken cancellationToken = default)
    {
        if (_cachedProviders != null)
        {
            return _cachedProviders;
        }

        var providerInstances = _extensionManager.GetInstances<IShippingProvider>(useCaching: true)
            .Where(p => p != null)
            .Cast<IShippingProvider>()
            .ToList();

        var configurations = await _dbContext.ShippingProviderConfigurations
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var registeredProviders = new List<RegisteredShippingProvider>();
        var keys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var provider in providerInstances)
        {
            var metadata = provider.Metadata;
            if (string.IsNullOrWhiteSpace(metadata.Key))
            {
                _logger.LogWarning("Shipping provider {ProviderType} has an empty metadata key and will be ignored.", provider.GetType().FullName);
                continue;
            }

            if (!keys.Add(metadata.Key))
            {
                _logger.LogWarning("Duplicate shipping provider key '{ProviderKey}' detected. Provider {ProviderType} will be skipped.", metadata.Key, provider.GetType().FullName);
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
                _logger.LogError(ex, "Failed to configure shipping provider {ProviderKey}. Provider will be skipped.", metadata.Key);
                continue;
            }

            registeredProviders.Add(new RegisteredShippingProvider(provider, configuration));
        }

        _cachedProviders = registeredProviders;
        return _cachedProviders;
    }

    public async Task<IReadOnlyCollection<RegisteredShippingProvider>> GetEnabledProvidersAsync(CancellationToken cancellationToken = default)
    {
        var providers = await GetProvidersAsync(cancellationToken);
        return providers
            .Where(IsProviderEnabled)
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

        if (requireEnabled && !IsProviderEnabled(provider))
        {
            return null;
        }

        return provider;
    }

    private static bool IsProviderEnabled(RegisteredShippingProvider registeredProvider)
    {
        var config = registeredProvider.Configuration;
        if (config == null)
        {
            return registeredProvider.Metadata.EnabledByDefault;
        }

        return config.IsEnabled;
    }
}

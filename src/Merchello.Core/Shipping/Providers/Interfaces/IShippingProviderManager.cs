using Merchello.Core.Shipping.Models;
using Merchello.Core.Shared.Models;

namespace Merchello.Core.Shipping.Providers.Interfaces;

public interface IShippingProviderManager
{
    /// <summary>
    /// Gets all discovered shipping providers (both configured and unconfigured).
    /// </summary>
    Task<IReadOnlyCollection<RegisteredShippingProvider>> GetProvidersAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets only enabled shipping providers, ordered by sort order.
    /// </summary>
    Task<IReadOnlyCollection<RegisteredShippingProvider>> GetEnabledProvidersAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a specific provider by key.
    /// </summary>
    Task<RegisteredShippingProvider?> GetProviderAsync(string providerKey, bool requireEnabled = true, CancellationToken cancellationToken = default);

    /// <summary>
    /// Saves a provider configuration (creates or updates).
    /// </summary>
    Task<ShippingProviderConfiguration> SaveConfigurationAsync(ShippingProviderConfiguration configuration, CancellationToken cancellationToken = default);

    /// <summary>
    /// Toggles a provider's enabled status.
    /// </summary>
    Task<bool> SetProviderEnabledAsync(Guid configurationId, bool enabled, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates the sort order of providers.
    /// </summary>
    Task<CrudResult<bool>> UpdateSortOrderAsync(IEnumerable<Guid> orderedIds, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a provider configuration.
    /// </summary>
    Task<bool> DeleteConfigurationAsync(Guid configurationId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Clears the provider cache, forcing a reload on next access.
    /// </summary>
    void ClearCache();
}

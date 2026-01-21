using Merchello.Core.Fulfilment.Models;

namespace Merchello.Core.Fulfilment.Providers.Interfaces;

/// <summary>
/// Manages discovery and resolution of fulfilment provider implementations.
/// </summary>
public interface IFulfilmentProviderManager
{
    /// <summary>
    /// Gets all discovered fulfilment providers (both configured and unconfigured).
    /// </summary>
    Task<IReadOnlyCollection<RegisteredFulfilmentProvider>> GetProvidersAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets only enabled fulfilment providers, ordered by sort order.
    /// </summary>
    Task<IReadOnlyCollection<RegisteredFulfilmentProvider>> GetEnabledProvidersAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a specific provider by key.
    /// </summary>
    Task<RegisteredFulfilmentProvider?> GetProviderAsync(string providerKey, bool requireEnabled = true, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets a configured provider instance by configuration ID.
    /// </summary>
    Task<RegisteredFulfilmentProvider?> GetConfiguredProviderAsync(Guid configurationId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Saves a provider configuration (creates or updates).
    /// </summary>
    Task<FulfilmentProviderConfiguration> SaveConfigurationAsync(FulfilmentProviderConfiguration configuration, CancellationToken cancellationToken = default);

    /// <summary>
    /// Toggles a provider's enabled status.
    /// </summary>
    Task<bool> SetProviderEnabledAsync(Guid configurationId, bool enabled, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates the sort order of providers.
    /// </summary>
    Task UpdateSortOrderAsync(IEnumerable<Guid> orderedIds, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a provider configuration.
    /// </summary>
    Task<bool> DeleteConfigurationAsync(Guid configurationId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Clears the provider cache, forcing a reload on next access.
    /// </summary>
    void ClearCache();
}

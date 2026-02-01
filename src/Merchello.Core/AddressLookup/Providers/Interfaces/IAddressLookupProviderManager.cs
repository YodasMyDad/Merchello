namespace Merchello.Core.AddressLookup.Providers.Interfaces;

/// <summary>
/// Manages address lookup providers.
/// </summary>
public interface IAddressLookupProviderManager
{
    /// <summary>
    /// Get all registered address lookup providers.
    /// </summary>
    Task<IReadOnlyCollection<RegisteredAddressLookupProvider>> GetProvidersAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get the currently active address lookup provider.
    /// </summary>
    Task<RegisteredAddressLookupProvider?> GetActiveProviderAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Activate the specified provider and deactivate all others.
    /// </summary>
    Task<bool> SetActiveProviderAsync(
        string alias,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Deactivate all providers.
    /// </summary>
    Task<bool> DeactivateAllProvidersAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Save configuration settings for a provider.
    /// </summary>
    Task<bool> SaveProviderSettingsAsync(
        string alias,
        Dictionary<string, string> settings,
        CancellationToken cancellationToken = default);
}

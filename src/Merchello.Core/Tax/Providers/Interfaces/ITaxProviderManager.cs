using Merchello.Core.Tax.Providers.Models;

namespace Merchello.Core.Tax.Providers.Interfaces;

/// <summary>
/// Manages tax providers - discovery, configuration, and activation.
/// </summary>
public interface ITaxProviderManager
{
    /// <summary>
    /// Gets all registered tax providers.
    /// </summary>
    Task<IReadOnlyCollection<RegisteredTaxProvider>> GetProvidersAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the currently active tax provider.
    /// </summary>
    Task<RegisteredTaxProvider?> GetActiveProviderAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Sets the active tax provider by alias.
    /// </summary>
    Task<bool> SetActiveProviderAsync(
        string alias,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Saves configuration settings for a provider.
    /// </summary>
    Task<bool> SaveProviderSettingsAsync(
        string alias,
        Dictionary<string, string> settings,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets shipping tax configuration for a location from the active tax provider.
    /// </summary>
    Task<ShippingTaxConfigurationResult> GetShippingTaxConfigurationAsync(
        string countryCode,
        string? stateCode,
        CancellationToken cancellationToken = default);
}

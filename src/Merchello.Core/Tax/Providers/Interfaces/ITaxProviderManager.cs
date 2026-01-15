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
    /// Checks if shipping is taxed for the given location using the active tax provider's configuration.
    /// Uses the provider's priority system (regional overrides → global config).
    /// </summary>
    Task<bool> IsShippingTaxedForLocationAsync(
        string countryCode,
        string? stateCode,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the shipping tax rate for a location using the active tax provider.
    /// Returns the percentage (e.g., 20 for 20% VAT).
    /// Returns null if rate cannot be determined without a full calculation.
    /// </summary>
    Task<decimal?> GetShippingTaxRateForLocationAsync(
        string countryCode,
        string? stateCode,
        CancellationToken cancellationToken = default);
}

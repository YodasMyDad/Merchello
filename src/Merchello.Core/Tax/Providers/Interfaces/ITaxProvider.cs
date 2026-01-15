using Merchello.Core.Tax.Providers.Models;

namespace Merchello.Core.Tax.Providers.Interfaces;

/// <summary>
/// Interface for tax calculation providers (e.g., Manual, Avalara, TaxJar).
/// </summary>
public interface ITaxProvider
{
    /// <summary>
    /// Provider metadata (alias, name, capabilities).
    /// </summary>
    TaxProviderMetadata Metadata { get; }

    /// <summary>
    /// Configuration fields required by this provider for the admin UI.
    /// </summary>
    ValueTask<IEnumerable<TaxProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Configure the provider with saved settings.
    /// </summary>
    ValueTask ConfigureAsync(
        TaxProviderConfiguration? configuration,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Calculate tax for a set of line items.
    /// </summary>
    Task<TaxCalculationResult> CalculateTaxAsync(
        TaxCalculationRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Validate configuration (e.g., test API credentials).
    /// </summary>
    Task<TaxProviderValidationResult> ValidateConfigurationAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the shipping tax rate for a location.
    /// Returns the percentage (e.g., 20 for 20% VAT).
    /// Returns null if rate cannot be determined without a full calculation (e.g., API-based providers).
    /// </summary>
    /// <param name="countryCode">ISO 3166-1 country code (e.g., "US", "GB")</param>
    /// <param name="stateCode">ISO 3166-2 state/province code (e.g., "CA", "TX") or null</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Tax rate percentage, or null if rate requires full calculation</returns>
    Task<decimal?> GetShippingTaxRateForLocationAsync(
        string countryCode,
        string? stateCode,
        CancellationToken cancellationToken = default);
}

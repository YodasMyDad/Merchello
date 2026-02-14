using Merchello.Core.Shared.Providers;
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
    ValueTask<IEnumerable<ProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Configure the provider with saved settings.
    /// </summary>
    ValueTask ConfigureAsync(
        TaxProviderConfiguration? configuration,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Calculates complete order tax including line items (products) and shipping.
    /// </summary>
    Task<TaxCalculationResult> CalculateOrderTaxAsync(
        TaxCalculationRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Validate configuration (for example, API credentials).
    /// </summary>
    Task<TaxProviderValidationResult> ValidateConfigurationAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets shipping tax configuration for a location.
    /// </summary>
    Task<ShippingTaxConfigurationResult> GetShippingTaxConfigurationAsync(
        string countryCode,
        string? stateCode,
        CancellationToken cancellationToken = default);
}

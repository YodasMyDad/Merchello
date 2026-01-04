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
}

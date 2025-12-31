using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Shipping.Providers.Interfaces;

/// <summary>
/// Contract that shipping provider plugins must implement.
/// </summary>
public interface IShippingProvider
{
    /// <summary>
    /// Static metadata describing the provider.
    /// </summary>
    ShippingProviderMetadata Metadata { get; }

    /// <summary>
    /// Gets the global configuration fields required by this provider (API keys, account numbers, etc.).
    /// Used to generate dynamic configuration UI in the backoffice Providers section.
    /// </summary>
    ValueTask<IEnumerable<ShippingProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets configuration fields for per-warehouse shipping method setup.
    /// Returns fields like name, delivery days, markup percentage.
    /// These are rendered as a dynamic form in the shipping method configuration UI.
    /// </summary>
    /// <remarks>
    /// Service type selection is handled separately via <see cref="GetSupportedServiceTypesAsync"/>.
    /// </remarks>
    ValueTask<IEnumerable<ShippingProviderConfigurationField>> GetMethodConfigFieldsAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the service types supported by this provider (e.g., FedEx Ground, FedEx 2Day).
    /// Used to generate service type dropdowns in the UI and for filtering shipping rates.
    /// </summary>
    /// <remarks>
    /// Returns an empty list for providers that don't use service types (e.g., flat-rate).
    /// External carrier providers should return all available service types.
    /// </remarks>
    /// <returns>A list of supported service types with their codes and display names.</returns>
    ValueTask<IReadOnlyList<ShippingServiceType>> GetSupportedServiceTypesAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Applies persisted configuration for the provider.
    /// </summary>
    ValueTask ConfigureAsync(ShippingProviderConfiguration? configuration, CancellationToken cancellationToken = default);

    /// <summary>
    /// Determines whether the provider can service the given request before performing any heavy work.
    /// </summary>
    bool IsAvailableFor(ShippingQuoteRequest request);

    /// <summary>
    /// Requests live rates from the provider.
    /// </summary>
    /// <returns>A quote with service levels, or null when no services are available.</returns>
    Task<ShippingRateQuote?> GetRatesAsync(ShippingQuoteRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Requests live rates from the provider, filtered to specific service types.
    /// Used when a warehouse has enabled only specific service types from this provider.
    /// </summary>
    /// <param name="request">The shipping quote request.</param>
    /// <param name="serviceTypes">Service type codes to include (e.g., "FEDEX_GROUND", "FEDEX_2_DAY").</param>
    /// <param name="shippingOptions">The ShippingOption records for each service type (contains markup settings).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A quote with only the requested service levels, or null when no services are available.</returns>
    Task<ShippingRateQuote?> GetRatesForServicesAsync(
        ShippingQuoteRequest request,
        IReadOnlyList<string> serviceTypes,
        IReadOnlyList<ShippingOptionSnapshot> shippingOptions,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets available delivery dates for a specific service level.
    /// Returns empty list if delivery date selection is not supported.
    /// </summary>
    Task<List<DateTime>> GetAvailableDeliveryDatesAsync(
        ShippingQuoteRequest request,
        ShippingServiceLevel serviceLevel,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Calculates any surcharge for selecting a specific delivery date.
    /// Returns 0 if no surcharge applies.
    /// </summary>
    Task<decimal> CalculateDeliveryDateSurchargeAsync(
        ShippingQuoteRequest request,
        ShippingServiceLevel serviceLevel,
        DateTime requestedDate,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Validates whether a requested delivery date is still available.
    /// </summary>
    Task<bool> ValidateDeliveryDateAsync(
        ShippingQuoteRequest request,
        ShippingServiceLevel serviceLevel,
        DateTime requestedDate,
        CancellationToken cancellationToken = default);
}

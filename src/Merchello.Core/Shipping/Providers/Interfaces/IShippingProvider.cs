using Merchello.Core.Shipping.Models;
using Merchello.Core.Shared.Providers;

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
    ValueTask<IEnumerable<ProviderConfigurationField>> GetConfigurationFieldsAsync(
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets configuration fields for per-warehouse shipping method setup.
    /// Returns fields like name, delivery days, markup percentage.
    /// These are rendered as a dynamic form in the shipping method configuration UI.
    /// </summary>
    /// <remarks>
    /// Service type selection is handled separately via <see cref="GetSupportedServiceTypesAsync"/>.
    /// </remarks>
    ValueTask<IEnumerable<ProviderConfigurationField>> GetMethodConfigFieldsAsync(
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
    /// Discovers available services for a specific origin/destination route.
    /// Returns null if provider doesn't support dynamic discovery (use GetSupportedServiceTypesAsync instead).
    /// </summary>
    /// <param name="originCountryCode">Warehouse country (ISO 2-letter code).</param>
    /// <param name="originPostalCode">Warehouse postal/zip code.</param>
    /// <param name="destinationCountryCode">Customer country.</param>
    /// <param name="destinationPostalCode">Customer postal/zip code (optional for country-level check).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Available service types for the route, or null if dynamic discovery is not supported.</returns>
    Task<IReadOnlyList<ShippingServiceType>?> GetAvailableServicesAsync(
        string originCountryCode,
        string originPostalCode,
        string destinationCountryCode,
        string? destinationPostalCode = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Fetches rates for ALL available services on the route without pre-filtering.
    /// Used by dynamic providers instead of GetRatesForServicesAsync.
    /// Applies exclusions and markup from the warehouse config.
    /// </summary>
    /// <param name="request">The shipping quote request.</param>
    /// <param name="warehouseConfig">Per-warehouse provider configuration (markup, exclusions).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A quote with all available service levels after config is applied, or null.</returns>
    Task<ShippingRateQuote?> GetRatesForAllServicesAsync(
        ShippingQuoteRequest request,
        WarehouseProviderConfig warehouseConfig,
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

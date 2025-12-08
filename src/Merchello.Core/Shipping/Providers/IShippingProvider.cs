using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Shipping.Providers;

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
    /// Returns fields like name, delivery days, service level selection, markup.
    /// These are rendered as a dynamic form in the shipping method configuration UI.
    /// </summary>
    ValueTask<IEnumerable<ShippingProviderConfigurationField>> GetMethodConfigFieldsAsync(
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

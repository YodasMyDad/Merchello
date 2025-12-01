using Merchello.Core.Accounting.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Providers.Models;

namespace Merchello.Core.Shipping.Providers;

/// <summary>
/// Contract for pluggable delivery date calculation and pricing logic
/// </summary>
public interface IDeliveryDateProvider
{
    /// <summary>
    /// Provider metadata
    /// </summary>
    DeliveryDateProviderMetadata Metadata { get; }

    /// <summary>
    /// Gets list of available delivery dates based on shipping option configuration
    /// </summary>
    Task<List<DateTime>> GetAvailableDatesAsync(
        ShippingOption shippingOption,
        Address shippingAddress,
        List<LineItem> items,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Calculates any surcharge for selecting a specific delivery date
    /// </summary>
    Task<decimal> CalculateSurchargeAsync(
        ShippingOption shippingOption,
        DateTime requestedDate,
        Address shippingAddress,
        List<LineItem> items,
        decimal baseShippingCost,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Validates that the selected date is still valid at order creation time
    /// </summary>
    Task<bool> ValidateDeliveryDateAsync(
        ShippingOption shippingOption,
        DateTime requestedDate,
        Address shippingAddress,
        CancellationToken cancellationToken = default);
}


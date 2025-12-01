using Merchello.Core.Accounting.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Shipping.Services.Interfaces;

public interface IDeliveryDateService
{
    /// <summary>
    /// Gets available delivery dates for a shipping option
    /// </summary>
    Task<List<DateTime>> GetAvailableDatesForShippingOptionAsync(
        ShippingOption shippingOption,
        Address shippingAddress,
        List<LineItem> items,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Calculates surcharge for a specific delivery date
    /// </summary>
    Task<decimal> CalculateDeliveryDateSurchargeAsync(
        ShippingOption shippingOption,
        DateTime requestedDate,
        Address shippingAddress,
        List<LineItem> items,
        decimal baseShippingCost,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Validates a selected delivery date
    /// </summary>
    Task<bool> ValidateDeliveryDateAsync(
        ShippingOption shippingOption,
        DateTime requestedDate,
        Address shippingAddress,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Parses allowed days of week string (e.g., "1,2,3,4,5") into a set of integers
    /// </summary>
    HashSet<int>? ParseAllowedDaysOfWeek(string? allowedDaysOfWeek);
}


using System.Collections.Generic;

namespace Merchello.Core.Shipping.Providers;

/// <summary>
/// Describes a purchasable shipping service.
/// </summary>
public class ShippingServiceLevel
{
    public required string ServiceCode { get; init; }
    public required string ServiceName { get; init; }
    public required decimal TotalCost { get; init; }
    public string CurrencyCode { get; init; } = "GBP";
    public TimeSpan? TransitTime { get; init; }
    public DateTime? EstimatedDeliveryDate { get; init; }
    public string? Description { get; init; }
    public IDictionary<string, string>? ExtendedProperties { get; init; }
}

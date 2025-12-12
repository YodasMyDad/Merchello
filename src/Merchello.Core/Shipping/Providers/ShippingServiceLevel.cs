using System.Collections.Generic;
using Merchello.Core.Shipping.Models;

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

    /// <summary>
    /// The service type for this shipping level. Required for external providers (FedEx, UPS, etc.),
    /// null for flat-rate or simple providers that don't use carrier service types.
    /// </summary>
    public ShippingServiceType? ServiceType { get; init; }

    /// <summary>
    /// Additional provider-specific metadata (e.g., tracking URL templates).
    /// Not used for service type identification - use <see cref="ServiceType"/> instead.
    /// </summary>
    public IDictionary<string, string>? ExtendedProperties { get; init; }
}

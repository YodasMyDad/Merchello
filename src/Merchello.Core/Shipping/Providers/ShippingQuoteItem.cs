using System.Collections.Generic;

namespace Merchello.Core.Shipping.Providers;

/// <summary>
/// Represents a product line that requires shipping.
/// </summary>
public class ShippingQuoteItem
{
    public Guid? LineItemId { get; init; }

    public Guid? ProductId { get; init; }
    public ShippingProductSnapshot? ProductSnapshot { get; init; }

    public Guid? WarehouseId { get; init; }

    public int Quantity { get; init; }

    /// <summary>
    /// Total weight for the quantity in kilograms.
    /// </summary>
    public decimal? TotalWeightKg { get; init; }

    /// <summary>
    /// Optional volumetric data in centimetres.
    /// </summary>
    public decimal? LengthCm { get; init; }
    public decimal? WidthCm { get; init; }
    public decimal? HeightCm { get; init; }

    /// <summary>
    /// True when the item requires shipping.
    /// </summary>
    public bool IsShippable { get; init; } = true;

    /// <summary>
    /// Calculated destination cost based on default logic, if available.
    /// </summary>
    public decimal? DestinationCost { get; init; }

    /// <summary>
    /// Optional extra data for providers.
    /// </summary>
    public IDictionary<string, string>? ExtendedProperties { get; init; }
}

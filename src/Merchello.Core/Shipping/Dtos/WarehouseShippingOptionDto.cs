namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Shipping option available from a warehouse for a destination
/// </summary>
public class WarehouseShippingOptionDto : ShippingOptionBaseDto
{
    /// <summary>
    /// Estimated cost for this destination (null for live-rate providers)
    /// </summary>
    public decimal? EstimatedCost { get; set; }

    /// <summary>
    /// Whether the cost is an estimate (true) or fixed (false)
    /// </summary>
    public bool IsEstimate { get; set; }

    /// <summary>
    /// Human-readable delivery time description
    /// </summary>
    public string DeliveryTimeDescription { get; set; } = string.Empty;
}

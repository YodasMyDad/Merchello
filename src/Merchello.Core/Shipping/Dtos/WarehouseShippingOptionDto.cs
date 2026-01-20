namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Shipping option available from a warehouse for a destination
/// </summary>
public class WarehouseShippingOptionDto
{
    /// <summary>
    /// Shipping option ID
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Display name of the shipping option
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Provider key (e.g., "flat-rate", "fedex", "ups")
    /// </summary>
    public string ProviderKey { get; set; } = "flat-rate";

    /// <summary>
    /// Service type code for external providers
    /// </summary>
    public string? ServiceType { get; set; }

    /// <summary>
    /// Minimum delivery days
    /// </summary>
    public int DaysFrom { get; set; }

    /// <summary>
    /// Maximum delivery days
    /// </summary>
    public int DaysTo { get; set; }

    /// <summary>
    /// Whether this is next-day delivery
    /// </summary>
    public bool IsNextDay { get; set; }

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

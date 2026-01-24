using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Checkout.Strategies.Models;

/// <summary>
/// Represents a group of line items that will become a single order.
/// Each group typically ships from one location or fulfillment source.
/// </summary>
public class OrderGroup
{
    /// <summary>
    /// Unique identifier for this group. Should be deterministic based on
    /// grouping criteria so the same basket produces consistent GroupIds.
    /// </summary>
    public Guid GroupId { get; set; }

    /// <summary>
    /// Display name for this group (e.g., "Warehouse: London", "Vendor: Acme Corp").
    /// Shown to customers during checkout when multiple groups exist.
    /// </summary>
    public string GroupName { get; set; } = string.Empty;

    /// <summary>
    /// The warehouse ID if this group ships from a specific warehouse.
    /// Nullable to support non-warehouse fulfillment (e.g., drop-shipping, vendor fulfillment).
    /// </summary>
    public Guid? WarehouseId { get; set; }

    /// <summary>
    /// Line items in this group with their allocated quantities.
    /// A single basket line item may be split across multiple groups
    /// (e.g., multi-warehouse fulfillment).
    /// </summary>
    public List<ShippingLineItem> LineItems { get; set; } = [];

    /// <summary>
    /// Shipping options available for this group.
    /// </summary>
    public List<ShippingOptionInfo> AvailableShippingOptions { get; set; } = [];

    /// <summary>
    /// Currently selected shipping option SelectionKey for this group (if any).
    /// Format: "so:{guid}" for flat-rate, "dyn:{provider}:{serviceCode}" for dynamic.
    /// </summary>
    public string? SelectedShippingOptionId { get; set; }

    /// <summary>
    /// Extended data for custom strategy implementations.
    /// Can store vendor ID, fulfillment source, or other custom grouping metadata.
    /// </summary>
    public Dictionary<string, object> Metadata { get; set; } = [];
}


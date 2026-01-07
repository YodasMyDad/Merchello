using Merchello.Core.Locality.Models;

namespace Merchello.Core.Shipping.Services.Parameters;

/// <summary>
/// Parameters for creating shipments from an order (bulk creation by warehouse)
/// </summary>
public class CreateShipmentsParameters
{
    /// <summary>
    /// The order to create shipments from
    /// </summary>
    public Guid OrderId { get; set; }

    /// <summary>
    /// Shipping address for the shipments
    /// </summary>
    public Address ShippingAddress { get; set; } = new();

    /// <summary>
    /// Optional: specific line items to ship (if not provided, ships all order line items)
    /// Key: LineItemId, Value: Quantity to ship
    /// </summary>
    public Dictionary<Guid, int>? LineItemsToShip { get; set; }

    /// <summary>
    /// Optional: Warehouse ID to create shipment for (if splitting order into multiple shipments)
    /// </summary>
    public Guid? WarehouseId { get; set; }

    /// <summary>
    /// Optional: Tracking number for the shipment
    /// </summary>
    public string? TrackingNumber { get; set; }

    /// <summary>
    /// Optional: Tracking URL for the shipment
    /// </summary>
    public string? TrackingUrl { get; set; }

    /// <summary>
    /// Optional: Carrier name for the shipment
    /// </summary>
    public string? Carrier { get; set; }
}

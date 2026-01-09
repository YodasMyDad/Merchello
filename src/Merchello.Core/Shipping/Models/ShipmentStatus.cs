namespace Merchello.Core.Shipping.Models;

/// <summary>
/// Represents the lifecycle status of a shipment
/// </summary>
public enum ShipmentStatus
{
    /// <summary>
    /// Shipment has been created, warehouse is preparing items for shipment
    /// </summary>
    Preparing = 0,

    /// <summary>
    /// Shipment has been handed to the carrier (tracking info may be available)
    /// </summary>
    Shipped = 10,

    /// <summary>
    /// Shipment has been delivered to the customer
    /// </summary>
    Delivered = 20,

    /// <summary>
    /// Shipment has been cancelled
    /// </summary>
    Cancelled = 30
}

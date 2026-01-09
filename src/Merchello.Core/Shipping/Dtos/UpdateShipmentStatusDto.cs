using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// DTO for updating shipment status with optional tracking information
/// </summary>
public class UpdateShipmentStatusDto
{
    /// <summary>
    /// The target status for the shipment
    /// </summary>
    public ShipmentStatus NewStatus { get; set; }

    /// <summary>
    /// Carrier name (optional, typically set when transitioning to Shipped)
    /// </summary>
    public string? Carrier { get; set; }

    /// <summary>
    /// Tracking number (optional, typically set when transitioning to Shipped)
    /// </summary>
    public string? TrackingNumber { get; set; }

    /// <summary>
    /// Tracking URL (optional, typically set when transitioning to Shipped)
    /// </summary>
    public string? TrackingUrl { get; set; }
}

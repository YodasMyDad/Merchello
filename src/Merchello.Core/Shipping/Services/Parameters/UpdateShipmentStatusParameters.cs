using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Shipping.Services.Parameters;

/// <summary>
/// Parameters for updating shipment status with optional tracking information
/// </summary>
public class UpdateShipmentStatusParameters
{
    /// <summary>
    /// The shipment to update
    /// </summary>
    public required Guid ShipmentId { get; set; }

    /// <summary>
    /// The target status for the shipment
    /// </summary>
    public required ShipmentStatus NewStatus { get; set; }

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

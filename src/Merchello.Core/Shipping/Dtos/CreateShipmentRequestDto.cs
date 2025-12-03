namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Request to create a new shipment
/// </summary>
public class CreateShipmentRequestDto
{
    /// <summary>
    /// Line items to include in shipment. Key: LineItemId, Value: Quantity
    /// </summary>
    public Dictionary<Guid, int> LineItems { get; set; } = [];

    /// <summary>
    /// Carrier name (e.g., "UPS", "FedEx", "DHL")
    /// </summary>
    public string? Carrier { get; set; }

    /// <summary>
    /// Tracking number for the shipment
    /// </summary>
    public string? TrackingNumber { get; set; }

    /// <summary>
    /// URL to track the shipment
    /// </summary>
    public string? TrackingUrl { get; set; }
}

namespace Merchello.Core.Accounting.Services.Parameters;

/// <summary>
/// Parameters for creating a single shipment from a controller request
/// </summary>
public class CreateShipmentParameters
{
    /// <summary>
    /// The order to create the shipment for
    /// </summary>
    public Guid OrderId { get; set; }

    /// <summary>
    /// Line items to ship (Key: LineItemId, Value: Quantity to ship)
    /// </summary>
    public Dictionary<Guid, int> LineItems { get; set; } = [];

    /// <summary>
    /// Optional: Carrier name for the shipment
    /// </summary>
    public string? Carrier { get; set; }

    /// <summary>
    /// Optional: Tracking number for the shipment
    /// </summary>
    public string? TrackingNumber { get; set; }

    /// <summary>
    /// Optional: Tracking URL for the shipment
    /// </summary>
    public string? TrackingUrl { get; set; }
}

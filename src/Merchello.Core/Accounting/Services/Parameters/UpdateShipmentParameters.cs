namespace Merchello.Core.Accounting.Services.Parameters;

/// <summary>
/// Parameters for updating shipment tracking information
/// </summary>
public class UpdateShipmentParameters
{
    /// <summary>
    /// The shipment to update
    /// </summary>
    public Guid ShipmentId { get; set; }

    /// <summary>
    /// Carrier name (null = don't update)
    /// </summary>
    public string? Carrier { get; set; }

    /// <summary>
    /// Tracking number (null = don't update)
    /// </summary>
    public string? TrackingNumber { get; set; }

    /// <summary>
    /// Tracking URL (null = don't update)
    /// </summary>
    public string? TrackingUrl { get; set; }

    /// <summary>
    /// Actual delivery date (null = don't update)
    /// </summary>
    public DateTime? ActualDeliveryDate { get; set; }
}

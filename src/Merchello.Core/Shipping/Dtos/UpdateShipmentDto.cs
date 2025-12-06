namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Request to update shipment tracking info
/// </summary>
public class UpdateShipmentDto
{
    public string? Carrier { get; set; }
    public string? TrackingNumber { get; set; }
    public string? TrackingUrl { get; set; }
    public DateTime? ActualDeliveryDate { get; set; }
}

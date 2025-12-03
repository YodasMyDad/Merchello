namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Shipment DTO
/// </summary>
public class ShipmentDto
{
    public Guid Id { get; set; }
    public string? TrackingNumber { get; set; }
    public string? TrackingUrl { get; set; }
    public string? Carrier { get; set; }
    public DateTime? ActualDeliveryDate { get; set; }
}

namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Full shipment details for display
/// </summary>
public class ShipmentDetailDto
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public string? Carrier { get; set; }
    public string? TrackingNumber { get; set; }
    public string? TrackingUrl { get; set; }
    public DateTime DateCreated { get; set; }
    public DateTime? ActualDeliveryDate { get; set; }
    public List<ShipmentLineItemDto> LineItems { get; set; } = [];
}

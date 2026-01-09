using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Shipment DTO
/// </summary>
public class ShipmentDto
{
    public Guid Id { get; set; }
    public ShipmentStatus Status { get; set; }
    public string StatusLabel { get; set; } = string.Empty;
    public string StatusCssClass { get; set; } = string.Empty;
    public string? TrackingNumber { get; set; }
    public string? TrackingUrl { get; set; }
    public string? Carrier { get; set; }
    public DateTime? ShippedDate { get; set; }
    public DateTime? ActualDeliveryDate { get; set; }
}

namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Line item within a shipment
/// </summary>
public class ShipmentLineItemDto
{
    public Guid Id { get; set; }
    public Guid LineItemId { get; set; }
    public string? Sku { get; set; }
    public string? Name { get; set; }
    public int Quantity { get; set; }
    public string? ImageUrl { get; set; }
}

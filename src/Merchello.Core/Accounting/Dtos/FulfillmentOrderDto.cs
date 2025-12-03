using Merchello.Core.Accounting.Models;
using Merchello.Core.Shipping.Dtos;

namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Fulfillment order (warehouse-level order)
/// </summary>
public class FulfillmentOrderDto
{
    public Guid Id { get; set; }
    public OrderStatus Status { get; set; }
    public List<LineItemDto> LineItems { get; set; } = [];
    public List<ShipmentDto> Shipments { get; set; } = [];
    public string DeliveryMethod { get; set; } = string.Empty;
    public decimal ShippingCost { get; set; }
}

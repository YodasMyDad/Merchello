using Merchello.Core.Accounting.Models;
using Merchello.Core.Shipping.Dtos;

namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Order fulfillment state showing shipped vs unshipped items
/// </summary>
public class OrderFulfillmentDto
{
    public Guid OrderId { get; set; }
    public Guid WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public OrderStatus Status { get; set; }
    public string DeliveryMethod { get; set; } = string.Empty;
    public List<FulfillmentLineItemDto> LineItems { get; set; } = [];
    public List<ShipmentDetailDto> Shipments { get; set; } = [];
}

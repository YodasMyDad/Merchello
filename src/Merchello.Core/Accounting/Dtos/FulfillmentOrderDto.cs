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

    /// <summary>
    /// Human-readable status label (e.g., "Pending", "Shipped").
    /// Calculated by backend to avoid frontend logic duplication.
    /// </summary>
    public string StatusLabel { get; set; } = string.Empty;

    /// <summary>
    /// CSS class for status badge styling (e.g., "unfulfilled", "shipped", "cancelled").
    /// Calculated by backend to avoid frontend logic duplication.
    /// </summary>
    public string StatusCssClass { get; set; } = string.Empty;

    public List<LineItemDto> LineItems { get; set; } = [];
    public List<ShipmentDto> Shipments { get; set; } = [];
    public string DeliveryMethod { get; set; } = string.Empty;
    public decimal ShippingCost { get; set; }
}

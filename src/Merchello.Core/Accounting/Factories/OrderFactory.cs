using Merchello.Core.Accounting.Models;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Accounting.Factories;

/// <summary>
/// Factory for creating Order instances.
/// </summary>
public class OrderFactory
{
    /// <summary>
    /// Creates an order for an invoice.
    /// </summary>
    public Order Create(
        Guid invoiceId,
        Guid warehouseId,
        Guid shippingOptionId,
        decimal shippingCost = 0,
        decimal? shippingCostInStoreCurrency = null,
        OrderStatus status = OrderStatus.Pending)
    {
        var now = DateTime.UtcNow;
        return new Order
        {
            Id = GuidExtensions.NewSequentialGuid,
            InvoiceId = invoiceId,
            WarehouseId = warehouseId,
            ShippingOptionId = shippingOptionId,
            ShippingCost = shippingCost,
            ShippingCostInStoreCurrency = shippingCostInStoreCurrency,
            Status = status,
            DateCreated = now,
            DateUpdated = now,
            LineItems = []
        };
    }

    /// <summary>
    /// Creates an order with invoice reference for immediate association.
    /// </summary>
    public Order Create(
        Invoice invoice,
        Guid warehouseId,
        Guid shippingOptionId,
        decimal shippingCost = 0,
        decimal? shippingCostInStoreCurrency = null,
        OrderStatus status = OrderStatus.Pending)
    {
        var order = Create(invoice.Id, warehouseId, shippingOptionId, shippingCost, shippingCostInStoreCurrency, status);
        order.Invoice = invoice;
        return order;
    }
}

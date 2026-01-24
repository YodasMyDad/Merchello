using Merchello.Core.Accounting.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Shipping.Factories;

/// <summary>
/// Factory for creating Shipment instances.
/// </summary>
public class ShipmentFactory
{
    /// <summary>
    /// Creates a shipment for an order.
    /// </summary>
    public Shipment Create(
        Order order,
        Guid warehouseId,
        Address shippingAddress,
        List<LineItem>? lineItems = null,
        string? trackingNumber = null,
        string? trackingUrl = null,
        string? carrier = null)
    {
        return new Shipment
        {
            Id = GuidExtensions.NewSequentialGuid,
            OrderId = order.Id,
            Order = order,
            WarehouseId = warehouseId,
            Address = shippingAddress,
            LineItems = lineItems ?? [],
            TrackingNumber = trackingNumber,
            TrackingUrl = trackingUrl,
            Carrier = carrier,
            RequestedDeliveryDate = order.RequestedDeliveryDate,
            IsDeliveryDateGuaranteed = order.IsDeliveryDateGuaranteed,
            DateCreated = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Creates a shipment with minimal parameters.
    /// </summary>
    public Shipment Create(
        Guid orderId,
        Guid warehouseId,
        Address shippingAddress)
    {
        return new Shipment
        {
            Id = GuidExtensions.NewSequentialGuid,
            OrderId = orderId,
            WarehouseId = warehouseId,
            Address = shippingAddress,
            LineItems = [],
            DateCreated = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Creates a shipment from a fulfilment provider webhook update.
    /// </summary>
    public Shipment CreateFromWebhook(
        Order order,
        string? trackingNumber = null,
        string? trackingUrl = null,
        string? carrier = null,
        DateTime? shippedDate = null)
    {
        return new Shipment
        {
            Id = GuidExtensions.NewSequentialGuid,
            OrderId = order.Id,
            WarehouseId = order.WarehouseId,
            TrackingNumber = trackingNumber,
            TrackingUrl = trackingUrl,
            Carrier = carrier,
            Status = shippedDate.HasValue ? ShipmentStatus.Shipped : ShipmentStatus.Preparing,
            ShippedDate = shippedDate,
            RequestedDeliveryDate = order.RequestedDeliveryDate,
            IsDeliveryDateGuaranteed = order.IsDeliveryDateGuaranteed,
            DateCreated = DateTime.UtcNow
        };
    }
}

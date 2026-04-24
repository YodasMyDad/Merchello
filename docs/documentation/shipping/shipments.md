# Shipments

Once an order is placed and paid for, the next step is fulfilling it -- picking, packing, and shipping. Merchello tracks this through **Shipments**. Each order can have one or more shipments, supporting both full and partial fulfillment workflows.

## Shipment Lifecycle

A shipment moves through four statuses:

| Status | Value | Description |
|--------|-------|-------------|
| **Preparing** | 0 | Shipment created, warehouse is picking/packing |
| **Shipped** | 10 | Handed to the carrier, tracking info may be available |
| **Delivered** | 20 | Delivered to the customer |
| **Cancelled** | 30 | Shipment was cancelled |

Status transitions follow a defined path. You cannot jump from `Preparing` directly to `Delivered` -- you must go through `Shipped` first.

## Creating Shipments

### Single shipment (most common)

Use `IShipmentService.CreateShipmentAsync()` to create a shipment for specific line items:

```csharp
var result = await shipmentService.CreateShipmentAsync(new CreateShipmentParameters
{
    OrderId = orderId,
    LineItems = new Dictionary<Guid, int>
    {
        { lineItemId1, 2 },  // Ship 2 of this item
        { lineItemId2, 1 }   // Ship 1 of this item
    },
    TrackingNumber = "1Z999AA10123456784",
    TrackingUrl = "https://tracking.ups.com/...",
    Carrier = "UPS"
}, cancellationToken);
```

The service validates:
- The order exists and is not cancelled or already fully shipped
- Each line item exists in the order
- The quantity does not exceed the remaining unshipped amount
- Only shippable line items (Product or Custom type) are included

### Batch shipments

Use `CreateShipmentsFromOrderAsync()` to create shipments for all items in an order, automatically grouped by warehouse:

```csharp
var shipments = await shipmentService.CreateShipmentsFromOrderAsync(
    new CreateShipmentsParameters
    {
        OrderId = orderId,
        TrackingNumber = "TRACK123",
        ShippingAddress = shippingAddress
    },
    cancellationToken);
```

This is useful for "ship everything" scenarios where you want Merchello to figure out the warehouse grouping.

## Partial Shipments

You don't have to ship everything at once. If a customer orders 5 items but only 3 are in stock, create a shipment for the 3 available items. The order status will automatically update to `PartiallyShipped`.

When you ship the remaining 2 items later, the order transitions to `Shipped`.

## How Shipments Affect Order Status

Merchello automatically manages order status based on shipment activity:

| Shipment Activity | Order Status |
|-------------------|-------------|
| First shipment created (Preparing) | `Processing` |
| Some items shipped, not all | `PartiallyShipped` |
| All items shipped | `Shipped` |
| All shipments delivered | `Completed` |
| Shipment deleted, reverting full shipment | Back to `PartiallyShipped` or `ReadyToFulfill` |

This happens automatically -- you don't need to manually update the order status when creating or updating shipments.

## Updating Shipments

### Update tracking info

```csharp
var result = await shipmentService.UpdateShipmentAsync(
    new UpdateShipmentParameters
    {
        ShipmentId = shipmentId,
        TrackingNumber = "NEW_TRACKING_123",
        TrackingUrl = "https://carrier.com/track/NEW_TRACKING_123",
        Carrier = "FedEx"
    },
    cancellationToken);
```

### Update status (mark as shipped)

```csharp
var result = await shipmentService.UpdateShipmentStatusAsync(
    new UpdateShipmentStatusParameters
    {
        ShipmentId = shipmentId,
        NewStatus = ShipmentStatus.Shipped,
        TrackingNumber = "TRACK_456",
        Carrier = "Royal Mail"
    },
    cancellationToken);
```

When marked as `Shipped`, the `ShippedDate` is automatically set. When marked as `Delivered`, the `ActualDeliveryDate` is set.

### Auto-completion

When all shipments on an order have `ActualDeliveryDate` set and the order is in `Shipped` status, the order automatically transitions to `Completed`. If you later clear a delivery date, the order reverts to `Shipped`.

## Deleting Shipments

Shipments can be deleted, which recalculates the order status:

```csharp
var success = await shipmentService.DeleteShipmentAsync(shipmentId, cancellationToken);
```

If deleting a shipment means no items are shipped anymore, the order goes back to `ReadyToFulfill`.

## Stock Allocation

When a shipment is created, Merchello automatically **allocates stock** for the shipped items. This means:

- `Stock -= quantity` (reduces available stock)
- `Reserved -= quantity` (releases the reservation made during checkout)

If stock allocation fails (insufficient stock), the shipment is still created but a warning is logged.

## Fulfillment Summary

To get a complete picture of an invoice's fulfillment status, use `GetFulfillmentSummaryAsync()`:

```csharp
var summary = await shipmentService.GetFulfillmentSummaryAsync(invoiceId, cancellationToken);
```

This returns a `FulfillmentSummaryDto` containing:
- Overall fulfillment status across all orders
- Per-order breakdown with warehouse names and delivery methods
- Per-line-item quantities: ordered, shipped, and preparing
- Per-shipment details with tracking info and status

> **Tip:** The fulfillment summary is what powers the backoffice order detail view. It gives you everything you need to show the customer or admin the current state of their order.

## Notifications

Shipment operations fire notifications you can hook into:

| Notification | When | Cancelable? |
|-------------|------|-------------|
| `ShipmentCreatingNotification` | Before shipment is saved | Yes |
| `ShipmentCreatedNotification` | After shipment is saved | No |
| `ShipmentSavingNotification` | Before shipment update | Yes |
| `ShipmentSavedNotification` | After shipment update | No |
| `ShipmentStatusChangingNotification` | Before status change | Yes |
| `ShipmentStatusChangedNotification` | After status change | No |
| `InvoiceAggregateChangedNotification` | After shipment affects invoice | No |

> **Warning:** Notifications are published **after** the database scope completes to avoid nested scope issues. Keep this in mind if your handler needs to make further DB calls.

> **Shipping vs Fulfilment:** Shipments are the record of what physically leaves the warehouse. Fulfilment providers (ShipBob, Supplier Direct) can create shipments automatically via webhook or on submission -- see [Fulfilment Overview](../fulfilment/fulfilment-overview.md).

## Related Topics

- [Shipping Overview](shipping-overview.md)
- [Fulfilment Overview](../fulfilment/fulfilment-overview.md)
- [ShipBob Integration](../fulfilment/shipbob.md)
- [Supplier Direct Fulfilment](../fulfilment/supplier-direct.md)
- [Orders](../orders/orders-overview.md)

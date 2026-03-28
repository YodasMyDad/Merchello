# Notification and Event System

Merchello uses Umbraco's built-in notification system to broadcast events throughout the application. When something happens -- an order is created, a product is saved, a shipment status changes -- a notification is published. Your code can subscribe to these notifications to extend Merchello's behavior without modifying the core.

## Base Classes

All Merchello notifications extend one of two base classes:

### MerchelloNotification

The standard base class for "after" notifications (things that have already happened). It implements Umbraco's `INotification` and adds a **State dictionary** for passing data between handlers.

```csharp
public abstract class MerchelloNotification : INotification
{
    // Share data between handlers processing the same notification
    public IDictionary<string, object?> State { get; }
}
```

### MerchelloCancelableNotification

For "before" notifications where handlers can prevent the operation. Extends `MerchelloNotification` with cancellation support.

```csharp
public abstract class MerchelloCancelableNotification<TEntity> : MerchelloNotification, ICancelableNotification
{
    public TEntity Entity { get; }          // The entity being operated on
    public bool Cancel { get; set; }        // Set to true to cancel
    public string? CancelReason { get; }    // Reason for cancellation

    public void CancelOperation(string reason);  // Cancel with a reason
}
```

## Subscribing to Notifications

To handle a notification, create a class that implements `INotificationAsyncHandler<T>` and register it with Umbraco's notification system.

```csharp
public class MyOrderHandler : INotificationAsyncHandler<OrderCreatedNotification>
{
    public async Task HandleAsync(
        OrderCreatedNotification notification,
        CancellationToken ct)
    {
        var order = notification.Order;
        // Do something with the order...
    }
}
```

Register it in your startup:

```csharp
builder.AddNotificationAsyncHandler<OrderCreatedNotification, MyOrderHandler>();
```

### Canceling an Operation

For "before" notifications, you can prevent the operation:

```csharp
public class ValidateOrderHandler : INotificationAsyncHandler<OrderSavingNotification>
{
    public Task HandleAsync(OrderSavingNotification notification, CancellationToken ct)
    {
        if (notification.Entity.Total <= 0)
        {
            notification.CancelOperation("Order total must be greater than zero");
        }
        return Task.CompletedTask;
    }
}
```

## Handler Priorities

Handlers run in priority order, controlled by the `[NotificationHandlerPriority]` attribute. **Lower values run first.** The default priority is `1000`.

```csharp
[NotificationHandlerPriority(100)]  // Runs early
public class ValidateOrderHandler : INotificationAsyncHandler<OrderSavingNotification>

[NotificationHandlerPriority(2000)] // Runs late
public class SyncToErpHandler : INotificationAsyncHandler<OrderSavedNotification>
```

### Priority Ranges

| Range | Purpose | Examples |
|---|---|---|
| 100-500 | Validation | Check business rules, cancel if invalid |
| 1000 | Business logic | Core processing (default) |
| 1500-1900 | Post-processing | Timeline logging, status updates |
| 2000 | Audit | Audit trail recording |
| 2100 | Email | Email notification handler |
| 2200 | Webhooks | Outbound webhook handler |
| 3000 | Protocol | Commerce protocol (UCP) handlers |

> **Tip:** Use the priority ranges as a guide. The key principle is: validation first, business logic in the middle, external communication last.

## The State Dictionary

The State dictionary lets handlers share data along the notification pipeline. This is particularly useful when a "before" handler needs to pass information to an "after" handler.

```csharp
// In a "before" handler (priority 100):
[NotificationHandlerPriority(100)]
public class CaptureOriginalPriceHandler : INotificationAsyncHandler<ProductSavingNotification>
{
    public Task HandleAsync(ProductSavingNotification notification, CancellationToken ct)
    {
        notification.State["originalPrice"] = notification.Entity.Price;
        return Task.CompletedTask;
    }
}

// In an "after" handler (priority 2000):
[NotificationHandlerPriority(2000)]
public class LogPriceChangeHandler : INotificationAsyncHandler<ProductSavedNotification>
{
    public Task HandleAsync(ProductSavedNotification notification, CancellationToken ct)
    {
        if (notification.State.TryGetValue("originalPrice", out var price))
        {
            var originalPrice = (decimal)price;
            // Log the price change...
        }
        return Task.CompletedTask;
    }
}
```

## Fault Tolerance

Notification handlers must be fault-tolerant. A handler that throws an exception can break the entire notification pipeline, preventing downstream handlers from running.

**Always catch and log exceptions in your handlers:**

```csharp
public async Task HandleAsync(OrderCreatedNotification notification, CancellationToken ct)
{
    try
    {
        await _externalService.SyncOrderAsync(notification.Order, ct);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Failed to sync order {OrderId} to external system",
            notification.Order.Id);
        // Don't rethrow -- let other handlers continue
    }
}
```

> **Warning:** Never let exceptions propagate from notification handlers. This is especially important for email and webhook handlers -- a failed email delivery should never prevent the order from completing.

## Available Notifications

Merchello publishes notifications across all major domains. Here is a summary by category:

### Basket
- `BasketCreatedNotification` / `BasketClearedNotification` / `BasketClearingNotification`
- `BasketItemAddedNotification` / `BasketItemAddingNotification`
- `BasketItemRemovedNotification` / `BasketItemRemovingNotification`
- `BasketItemQuantityChangedNotification` / `BasketItemQuantityChangingNotification`

### Checkout
- `CheckoutAbandonedNotification` / `CheckoutAbandonedFirstNotification`
- `CheckoutAbandonedReminderNotification` / `CheckoutAbandonedFinalNotification`
- `CheckoutRecoveredNotification` / `CheckoutRecoveryConvertedNotification`
- `CheckoutAddressesChangedNotification` / `CheckoutAddressesChangingNotification`
- `ShippingSelectionChangedNotification` / `ShippingSelectionChangingNotification`
- `DiscountCodeAppliedNotification` / `DiscountCodeApplyingNotification` / `DiscountCodeRemovedNotification`
- `StockValidationFailedAtCheckoutNotification`

### Customer
- `CustomerCreatedNotification` / `CustomerCreatingNotification`
- `CustomerSavedNotification` / `CustomerSavingNotification`
- `CustomerDeletedNotification` / `CustomerDeletingNotification`
- `CustomerPasswordResetRequestedNotification`

### Customer Segments
- `CustomerSegmentCreatedNotification` / `CustomerSegmentCreatingNotification`
- `CustomerSegmentDeletedNotification`

### Orders and Invoices
- `OrderCreatedNotification` / `OrderStatusChangedNotification`
- `InvoiceSavedNotification` / `InvoiceDeletedNotification` / `InvoiceCancelledNotification`
- `InvoiceReminderNotification` / `InvoiceOverdueNotification`
- `InvoiceAggregateChangedNotification`

### Payments
- `PaymentCreatedNotification` / `PaymentRefundedNotification`

### Shipments
- `ShipmentCreatedNotification` / `ShipmentSavedNotification`
- `ShipmentStatusChangedNotification`

### Inventory
- `LowStockNotification`

### Fulfilment
- `FulfilmentSubmittedNotification` / `FulfilmentSubmittingNotification`
- `FulfilmentSubmissionFailedNotification` / `FulfilmentSubmissionAttemptFailedNotification`
- `FulfilmentInventoryUpdatedNotification` / `FulfilmentProductSyncedNotification`
- `SupplierOrderNotification`

### Digital Products
- `DigitalProductDeliveredNotification`

### Order Grouping
- `OrderGroupingModifyingNotification` / `OrderGroupingNotification`

## Built-In Handlers

Merchello includes several built-in notification handlers:

| Handler | Priority | Purpose |
|---|---|---|
| `FulfilmentAutoShipmentHandler` | -- | Creates shipment records after fulfilment submission |
| `FulfilmentCancellationHandler` | -- | Handles fulfilment cancellation side-effects |
| `FulfilmentOrderSubmissionHandler` | -- | Submits orders to fulfilment providers |
| `FulfilmentTimelineHandler` | -- | Logs fulfilment events to the order timeline |
| `EmailNotificationHandler` | 2100 | Queues email deliveries |
| `WebhookNotificationHandler` | 2200 | Queues outbound webhooks |

## Related Topics

- [Email System](../email/email-overview.md)
- [Outbound Webhooks](../webhooks/webhooks-overview.md)
- [Fulfilment System](../fulfilment/fulfilment-overview.md)

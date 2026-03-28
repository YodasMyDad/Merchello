# Custom Notification Handlers

Merchello uses Umbraco's notification system to let you hook into lifecycle events -- product saves, order creation, payment processing, shipment status changes, and much more. This guide shows you how to create custom handlers.

## Quick Overview

To create a notification handler:

1. Create a class implementing `INotificationAsyncHandler<TNotification>`
2. Add the `[NotificationHandlerPriority]` attribute to control execution order
3. Register it with Umbraco's notification system

## How Notifications Work

Merchello publishes notifications at key points in entity lifecycles. There are two types:

- **"Before" notifications** (cancelable): Published before an operation. Handlers can modify the entity or cancel the operation. Examples: `OrderSavingNotification`, `ProductCreatingNotification`.
- **"After" notifications** (read-only): Published after an operation completes. Used for side effects like sending emails, syncing to external systems, or logging. Examples: `OrderCreatedNotification`, `PaymentCreatedNotification`.

```
Service begins operation
    -> Publishes "Saving/Creating" notification (cancelable)
        -> Handler 1 (priority 100): Validates data
        -> Handler 2 (priority 500): Modifies entity
        -> Handler 3 (priority 1000): Business logic
    -> If not cancelled, performs the operation
    -> Publishes "Saved/Created" notification (read-only)
        -> Handler 4 (priority 1000): Updates cache
        -> Handler 5 (priority 2000): Sends email
        -> Handler 6 (priority 2200): Fires webhook
```

## Basic Example

```csharp
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.Order;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Events;

[NotificationHandlerPriority(2000)]  // Runs after core business logic
public class OrderCreatedSyncHandler(
    ILogger<OrderCreatedSyncHandler> logger)
    : INotificationAsyncHandler<OrderCreatedNotification>
{
    public async Task HandleAsync(
        OrderCreatedNotification notification,
        CancellationToken cancellationToken)
    {
        try
        {
            // Sync the new order to your ERP system
            logger.LogInformation(
                "Order {OrderId} created, syncing to ERP",
                notification.Entity.Id);

            await SyncToErp(notification.Entity, cancellationToken);
        }
        catch (Exception ex)
        {
            // Always catch and log -- never rethrow from notification handlers
            logger.LogError(ex,
                "Failed to sync order {OrderId} to ERP",
                notification.Entity.Id);
        }
    }
}
```

## Registering Your Handler

Register handlers in your `Startup.cs` or a composer:

```csharp
// In AddMerchello or your own startup code
builder.AddNotificationAsyncHandler<OrderCreatedNotification, OrderCreatedSyncHandler>();
```

Or using an Umbraco composer:

```csharp
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;

public class MyNotificationComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.AddNotificationAsyncHandler<OrderCreatedNotification, OrderCreatedSyncHandler>();
        builder.AddNotificationAsyncHandler<PaymentCreatedNotification, PaymentCreatedSyncHandler>();
    }
}
```

## Handler Priorities

The `[NotificationHandlerPriority]` attribute controls execution order. **Lower values run first.** The default priority is 1000.

| Range | Purpose | Examples |
|---|---|---|
| 100-500 | Validation | Data validation, precondition checks |
| 1000 | Business logic | Core processing (default) |
| 1500-1900 | Post-processing | Cache updates, secondary calculations |
| 2000 | Audit | Audit logging, history recording |
| 2100 | Email | Sending notification emails |
| 2200 | Webhooks | Firing outbound webhooks |
| 3000 | Protocol | Commerce protocol (UCP) handlers |

```csharp
[NotificationHandlerPriority(100)]   // Runs first -- validation
public class ValidateOrderHandler : INotificationAsyncHandler<OrderSavingNotification> { }

[NotificationHandlerPriority(2000)]  // Runs late -- audit
public class AuditOrderHandler : INotificationAsyncHandler<OrderSavedNotification> { }
```

## Canceling Operations

"Before" notifications (inheriting from `MerchelloCancelableNotification<T>`) can be cancelled:

```csharp
[NotificationHandlerPriority(100)]
public class ValidateProductHandler
    : INotificationAsyncHandler<ProductCreatingNotification>
{
    public Task HandleAsync(
        ProductCreatingNotification notification,
        CancellationToken cancellationToken)
    {
        var product = notification.Entity;

        // Validate business rules
        if (product.Price < 0)
        {
            notification.CancelOperation("Product price cannot be negative");
            // The create operation will be aborted
        }

        return Task.CompletedTask;
    }
}
```

## Modifying Entities in "Before" Handlers

"Before" notifications give you access to the entity before it's saved, so you can modify it:

```csharp
[NotificationHandlerPriority(500)]
public class EnrichProductHandler
    : INotificationAsyncHandler<ProductSavingNotification>
{
    public Task HandleAsync(
        ProductSavingNotification notification,
        CancellationToken cancellationToken)
    {
        var product = notification.Entity;

        // Auto-generate SKU if empty
        if (string.IsNullOrWhiteSpace(product.Sku))
        {
            product.Sku = $"PROD-{Guid.NewGuid():N}"[..12].ToUpperInvariant();
        }

        return Task.CompletedTask;
    }
}
```

## Sharing State Between Handlers

The `State` dictionary on notifications lets you pass data between handlers of the same notification:

```csharp
// Before handler: capture original state
[NotificationHandlerPriority(100)]
public class CaptureOriginalPriceHandler
    : INotificationAsyncHandler<ProductSavingNotification>
{
    public Task HandleAsync(ProductSavingNotification notification, CancellationToken ct)
    {
        notification.State["originalPrice"] = notification.Entity.Price;
        return Task.CompletedTask;
    }
}

// After handler: compare with original
[NotificationHandlerPriority(2000)]
public class PriceChangeAuditHandler
    : INotificationAsyncHandler<ProductSavedNotification>
{
    public Task HandleAsync(ProductSavedNotification notification, CancellationToken ct)
    {
        if (notification.State.TryGetValue("originalPrice", out var originalPrice))
        {
            var newPrice = notification.Entity.Price;
            if ((decimal)originalPrice! != newPrice)
            {
                // Log the price change
            }
        }
        return Task.CompletedTask;
    }
}
```

## Available Notifications

Here's a sampling of the notifications you can handle:

### Products
- `ProductCreatingNotification` / `ProductCreatedNotification`
- `ProductSavingNotification` / `ProductSavedNotification`
- `ProductDeletingNotification` / `ProductDeletedNotification`

### Orders
- `OrderCreatedNotification`
- `OrderSavingNotification` / `OrderSavedNotification`
- `OrderStatusChangingNotification` / `OrderStatusChangedNotification`

### Payments
- `PaymentCreatedNotification`
- `PaymentRefundingNotification` / `PaymentRefundedNotification`

### Invoices
- `InvoiceSavingNotification` / `InvoiceSavedNotification`
- `InvoiceDeletingNotification` / `InvoiceDeletedNotification`
- `InvoiceCancellingNotification` / `InvoiceCancelledNotification`

### Shipments
- `ShipmentCreatingNotification` / `ShipmentCreatedNotification`
- `ShipmentSavingNotification` / `ShipmentSavedNotification`
- `ShipmentStatusChangingNotification` / `ShipmentStatusChangedNotification`

### Basket
- `BasketItemAddingNotification` / `BasketItemAddedNotification`
- `BasketItemRemovingNotification` / `BasketItemRemovedNotification`
- `BasketItemQuantityChangingNotification` / `BasketItemQuantityChangedNotification`
- `BasketClearingNotification` / `BasketClearedNotification`

### Checkout
- `CheckoutAddressesChangingNotification` / `CheckoutAddressesChangedNotification`
- `DiscountCodeAppliedNotification` / `DiscountCodeRemovedNotification`
- `CheckoutRecoveryConvertedNotification`

### Customers
- `CustomerCreatedNotification`
- `CustomerSavingNotification` / `CustomerSavedNotification`
- `CustomerDeletingNotification` / `CustomerDeletedNotification`

### Order Grouping
- `OrderGroupingModifyingNotification` (cancelable)
- `OrderGroupingNotification` (read-only)

### Inventory
- `LowStockNotification`

### Discounts
- `DiscountCreatingNotification` / `DiscountCreatedNotification`
- `DiscountSavingNotification` / `DiscountSavedNotification`
- `DiscountStatusChangingNotification` / `DiscountStatusChangedNotification`

## Fault Tolerance Rules

**This is critical:** Notification handlers must be fault-tolerant.

1. **Always wrap handler logic in try/catch.** An unhandled exception in one handler can break the entire notification chain.
2. **Log errors but don't rethrow.** Let other handlers continue executing.
3. **Don't assume external services are available.** API calls, database queries, and file operations can fail.

```csharp
public async Task HandleAsync(OrderCreatedNotification notification, CancellationToken ct)
{
    try
    {
        await DoWork(notification.Entity, ct);
    }
    catch (Exception ex)
    {
        // Log and continue -- don't break the chain
        _logger.LogError(ex, "Handler failed for order {OrderId}", notification.Entity.Id);
    }
}
```

> **Warning:** The only exception to the "don't rethrow" rule is validation handlers in "Before" notifications. If validation fails, use `notification.CancelOperation("reason")` instead of throwing.

# Inventory and Stock Management

Merchello tracks stock levels per product variant per warehouse. This guide covers the stock lifecycle, multi-warehouse stock, availability checking, and the notifications that fire at each stage.

> **Invariant:** All stock mutations must go through `IInventoryService`. Never adjust `Stock`, `ReservedStock`, or `TrackStock` directly on a `ProductWarehouse` -- the service enforces the lifecycle rules below, handles optimistic concurrency, and publishes the notifications that other subsystems listen on.

Source: [IInventoryService.cs](../../../src/Merchello.Core/Products/Services/Interfaces/IInventoryService.cs), [ProductWarehouse.cs](../../../src/Merchello.Core/Products/Models/ProductWarehouse.cs).

## Core Concepts

### Stock Tracking

Each product-warehouse combination (`ProductWarehouse`) has:

- **Stock** -- the total physical units in the warehouse.
- **ReservedStock** -- units reserved by pending orders (not yet shipped).
- **TrackStock** -- whether stock tracking is enabled. When `false`, the product has unlimited availability.
- **ReorderPoint** -- optional threshold that triggers a low stock notification when stock falls to or below this level.

**Available stock** is calculated as: `Stock - ReservedStock`

When `TrackStock = false`, the service returns `int.MaxValue` for available stock and skips all stock modifications silently (operations succeed immediately).

## Stock Lifecycle

The stock lifecycle follows a clear four-step pattern from order placement to completion (or cancellation):

```
Customer places order    -->  Reserve
Order ships              -->  Allocate
Order cancelled          -->  Release (undo reservation)
Shipment returned        -->  Reverse (undo allocation)
```

### 1. Reserve

When a customer places an order, stock is reserved so other customers cannot purchase the same units:

```csharp
var result = await inventoryService.ReserveStockAsync(
    productId,
    warehouseId,
    quantity,
    cancellationToken);
```

**What happens:** `ReservedStock += quantity`

The service validates that `Stock - ReservedStock >= quantity` before reserving. If insufficient stock is available, the operation fails with an error message.

### 2. Allocate

When the order ships, reserved stock is converted to a physical deduction:

```csharp
var result = await inventoryService.AllocateStockAsync(
    productId,
    warehouseId,
    quantity,
    cancellationToken);
```

**What happens:** `Stock -= quantity` AND `ReservedStock -= quantity`

After allocation, if the remaining stock falls to or below the `ReorderPoint`, a `LowStockNotification` is automatically published. If stock reaches zero and this was the default variant, Merchello automatically reassigns the default variant to another available variant.

### 3. Release (Cancel)

When an order is cancelled before shipping, the reservation is released:

```csharp
var result = await inventoryService.ReleaseReservationAsync(
    productId,
    warehouseId,
    quantity,
    cancellationToken);
```

**What happens:** `ReservedStock -= quantity` (clamped to zero)

### 4. Reverse (Return)

When a shipped item is returned, the allocation is reversed:

```csharp
var result = await inventoryService.ReverseAllocationAsync(
    productId,
    warehouseId,
    quantity,
    cancellationToken);
```

**What happens:** `Stock += quantity` (ReservedStock is not modified because allocation already removed it)

## Checking Availability

### Single Product

```csharp
// Returns available units, or int.MaxValue if not tracked
int available = await inventoryService.GetAvailableStockAsync(
    productId,
    warehouseId,
    cancellationToken);
```

### Order Validation

Before processing an order, validate that all line items have sufficient stock:

```csharp
var result = await inventoryService.ValidateStockAvailabilityAsync(order, cancellationToken);

if (!result.Success)
{
    // result.Messages contains per-item stock errors
    // e.g. "Insufficient stock for Blue T-Shirt. Available: 2, Required: 5"
}
```

### Basket Validation (Bulk)

For checking availability of all items in a basket at once (single database round-trip):

```csharp
var items = basketLineItems.Select(li => (li.ProductId, li.WarehouseId, li.Quantity));

var result = await inventoryService.ValidateBasketStockAsync(items, cancellationToken);

if (!result.IsValid)
{
    foreach (var issue in result.UnavailableItems)
    {
        // issue.ProductName, issue.RequestedQuantity, issue.AvailableQuantity
    }
}
```

This method aggregates quantities per product-warehouse combination (handles split quantities) and loads all stock data in a single query for efficiency.

### Check If Tracking Is Enabled

```csharp
bool isTracked = await inventoryService.IsStockTrackedAsync(
    productId,
    warehouseId,
    cancellationToken);
```

## Concurrency Handling

All stock operations use optimistic concurrency with retry logic. If two operations try to modify the same product-warehouse stock simultaneously, one will receive a `DbUpdateConcurrencyException`. The service automatically retries up to 3 times with increasing delay (10ms, 20ms, 30ms).

If all retries fail, the operation returns an error message like "Stock reservation failed due to concurrent updates. Please try again."

## Notifications

Every stock operation publishes notifications that you can hook into for custom logic. Each operation has a "before" (cancellable) and "after" notification:

| Operation | Before (Cancellable) | After |
|-----------|---------------------|-------|
| Reserve | `StockReservingNotification` | `StockReservedNotification` |
| Release | `StockReleasingNotification` | `StockReleasedNotification` |
| Allocate | `StockAllocatingNotification` | `StockAllocatedNotification` |
| Reverse | -- | `StockAdjustedNotification` |
| Low Stock | -- | `LowStockNotification` |

### Cancelling a Stock Operation

The "before" notifications are cancellable. Your handler can prevent the operation:

```csharp
public class MyStockHandler : INotificationHandler<StockReservingNotification>
{
    public Task HandleAsync(StockReservingNotification notification, CancellationToken ct)
    {
        if (ShouldPreventReservation(notification.ProductId))
        {
            notification.Cancel("Custom reason: product is temporarily held");
        }
        return Task.CompletedTask;
    }
}
```

### Low Stock Alerts

The `LowStockNotification` fires after allocation when remaining stock drops to or below the `ReorderPoint`. It includes the product ID, warehouse ID, product name, remaining stock, and reorder point. Use this to trigger email alerts, Slack messages, or automatic reorder workflows.

## Multi-Warehouse Stock

When a product exists in multiple warehouses, Merchello selects the best warehouse using a strict priority order that must be preserved by any custom grouping logic:

1. **`ProductRootWarehouse.Priority`** -- warehouses linked to the product with a priority value.
2. **Service region eligibility** -- the warehouse must be able to ship to the customer's country/region.
3. **Stock availability** -- the warehouse must have `Stock - ReservedStock >= requested quantity`.

> **Tip:** Use [`IWarehouseService.SelectWarehouseForProduct()`](../../../src/Merchello.Core/Warehouses/Services/WarehouseService.cs#L35) to get the best warehouse for a product and shipping destination. This is what the checkout order grouping strategy uses internally ([DefaultOrderGroupingStrategy.cs:84](../../../src/Merchello.Core/Checkout/Strategies/DefaultOrderGroupingStrategy.cs#L84)).

## Key Points

- Stock is tracked per product variant per warehouse, not at the product root level.
- When `TrackStock = false`, all stock operations are no-ops that succeed silently.
- Available stock = `Stock - ReservedStock`. Never use `Stock` alone.
- All mutations return `CrudResult<bool>` -- always check `result.Success`.
- Concurrency conflicts are handled automatically with up to 3 retries.
- Low stock notifications fire automatically when stock drops to or below the reorder point after allocation.

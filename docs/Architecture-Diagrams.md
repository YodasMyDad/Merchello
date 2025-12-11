# Merchello Architecture Overview

Enterprise ecommerce NuGet package for Umbraco. **Ethos: making enterprise ecommerce simple.**

## Design Principles

- **Modular/Plugin-based** - `ExtensionManager` for pluggable providers (Shipping, Payment, Order Grouping)
- **Services** - Feature-grouped, DI throughout, parameter models for extensibility
- **Factories** - All domain objects via factories (Product, ProductRoot, TaxGroup, etc.)
- **Multi-warehouse** - Variant-level stock tracking with priority-based warehouse selection

---

## 1. Feature Folder Structure

```
Feature/
├── Models/              # Domain models (separate files)
├── Factories/           # Object instantiation
├── Services/            # Business logic
│   ├── Interfaces/      # Service contracts
│   └── Parameters/      # Parameter objects (RORO)
├── Mapping/             # Custom object mapping
├── Dtos/                # Data transfer objects
└── ExtensionMethods/    # Helper extensions
```

**Main Modules**: Accounting, Checkout, Products, Shipping, Payments, Suppliers, Warehouses, Locality, Notifications, Stores

---

## 2. Core Entity Relationships

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ENTITY STRUCTURE                                   │
└─────────────────────────────────────────────────────────────────────────────┘

  SUPPLIERS              WAREHOUSES                    PRODUCTS           ORDERS
  ─────────              ──────────                    ────────           ──────
  Supplier ──1:N──► Warehouse                         ProductRoot        Invoice
      │                  │                                │                 │
      │                  ├──1:N──► ServiceRegions         │                 │
      │                  ├──1:N──► ShippingOptions   M:N──┼─────────┐      1:N
      │                  │              │                 │         │       │
      │                  │             1:N                │         │       ▼
      │                  │              ▼                 ▼         │     Order
      │                  └──M:N──► ShippingCosts     Product       │       │
      │                      (ProductWarehouse)          │         │      1:N
      │                         - Stock            M:N───┘         │       │
      │                         - ReservedStock  (ProductWarehouse)│       ▼
      │                         - TrackStock                       │   Shipment
      │                                                            │       │
      └────────────────────────────────────────────────────────────┘       │
                              (ProductRootWarehouse)                       │
                                                                    N:1────┘
                                                                 (WarehouseId)

  RELATIONSHIP MATRIX
  ┌──────────────────────┬────────────────────────────────────────────────────┐
  │ Supplier             │ 1:N Warehouses                                     │
  │ Warehouse            │ N:1 Supplier, 1:N ServiceRegions, 1:N ShipOptions  │
  │ ProductRoot          │ 1:N Products, M:N Warehouses (via ProductRootWH)   │
  │                      │ 1:N DefaultPackageConfigurations (ProductPackage)  │
  │ Product (variant)    │ M:N Warehouses (via ProductWarehouse for stock)    │
  │                      │ 1:N PackageConfigurations (ProductPackage)         │
  │                      │ HsCode (customs classification)                    │
  │ Invoice              │ 1:N Orders, 1:N Payments                           │
  │ Order                │ 1:N Shipments, 1:N LineItems                       │
  │ Shipment             │ N:1 Order, N:1 Warehouse                           │
  └──────────────────────┴────────────────────────────────────────────────────┘
```

---

## 3. Provider Systems

Merchello uses a **Manager pattern** for pluggable providers, discovered via `ExtensionManager`.

### ExtensionManager

Assembly scanning for plugin discovery at startup:
1. Scans assemblies for interface implementations
2. Auto-discovers `IShippingProvider`, `IPaymentProvider`, `IOrderGroupingStrategy`
3. Creates instances via DI using `ActivatorUtilities`
4. Caches discovered providers

### Shipping Providers

```csharp
public interface IShippingProvider
{
    ShippingProviderMetadata Metadata { get; }
    ValueTask<IEnumerable<ShippingProviderConfigurationField>> GetConfigurationFieldsAsync(CancellationToken ct);
    ValueTask<IEnumerable<ShippingProviderConfigurationField>> GetMethodConfigFieldsAsync(CancellationToken ct);
    ValueTask ConfigureAsync(ShippingProviderConfiguration? config, CancellationToken ct);
    bool IsAvailableFor(ShippingQuoteRequest request);
    Task<ShippingRateQuote?> GetRatesAsync(ShippingQuoteRequest request, CancellationToken ct);
    Task<ShippingRateQuote?> GetRatesForServicesAsync(
        ShippingQuoteRequest request,
        IReadOnlyList<string> serviceTypes,           // e.g., ["FEDEX_GROUND", "FEDEX_2_DAY"]
        IReadOnlyList<ShippingOptionSnapshot> options, // Contains markup settings
        CancellationToken ct);
}
```

**Key concepts:**
- `GetConfigurationFieldsAsync`: Global config (API keys, account numbers)
- `GetMethodConfigFieldsAsync`: Per-warehouse method config (service type, markup)
- `GetRatesForServicesAsync`: Fetch rates filtered to only enabled service types

**ShippingProviderManager**: Discovers providers → loads `ShippingProviderConfiguration` from DB → caches with settings

Built-in: `FlatRateShippingProvider`

### Payment Providers

```csharp
public interface IPaymentProvider
{
    PaymentProviderMetadata Metadata { get; }
    Task<List<PaymentProviderConfigurationField>> GetConfigurationFieldsAsync();
    Task ConfigureAsync(Dictionary<string, string> settings);
    Task<PaymentSessionResult> CreatePaymentSessionAsync(PaymentSessionRequest request);
    Task<PaymentResult> ProcessPaymentAsync(ProcessPaymentRequest request);
    Task<RefundResult> RefundPaymentAsync(RefundRequest request);
}
```

**PaymentProviderManager**: Same pattern as shipping - discovery, configuration, caching

Built-in: `ManualPaymentProvider`

### Dynamic Configuration Fields

Providers define their own configuration UI:
```csharp
new ShippingProviderConfigurationField
{
    Key = "api_key",
    Label = "API Key",
    FieldType = ConfigurationFieldType.Password,
    IsRequired = true
}
```

Field types: `Text`, `Password`, `Number`, `Checkbox`, `Select`, `Textarea`

---

## 4. Order Grouping Strategies

Pluggable strategy for grouping basket items into orders during checkout.

### Configuration

```json
{ "Merchello": { "OrderGroupingStrategy": "vendor-grouping" } }
```

Value: strategy key or fully qualified type name. Empty = default warehouse grouping.

### Interface

```csharp
public interface IOrderGroupingStrategy
{
    OrderGroupingStrategyMetadata Metadata { get; }
    Task<OrderGroupingResult> GroupItemsAsync(OrderGroupingContext context, CancellationToken ct);
}
```

### Default Strategy (Warehouse Grouping)

Groups items by warehouse based on:
1. Stock availability at each warehouse
2. Warehouse priority order (from `ProductRootWarehouse`)
3. Region serviceability (`WarehouseServiceRegion`)

### OrderGroupingContext Properties

| Property | Description |
|----------|-------------|
| Basket | Basket with line items |
| ShippingAddress | Delivery address |
| Products | Products by ID (preloaded) |
| Warehouses | Available warehouses (preloaded) |
| SelectedShippingOptions | Previously selected options by group |

### OrderGroup Output

| Property | Description |
|----------|-------------|
| GroupId | Deterministic GUID (consistent across requests) |
| GroupName | Display name |
| WarehouseId | Fulfilling warehouse (null for drop-ship) |
| LineItems | Allocated items |
| AvailableShippingOptions | Options for this group |

### Custom Strategy Example (Supplier Grouping)

```csharp
public class SupplierGroupingStrategy(ILogger<SupplierGroupingStrategy> logger) : IOrderGroupingStrategy
{
    public OrderGroupingStrategyMetadata Metadata => new(
        Key: "supplier-grouping",
        DisplayName: "Supplier Grouping",
        Description: "Groups items by supplier for drop-shipping scenarios.");

    public async Task<OrderGroupingResult> GroupItemsAsync(OrderGroupingContext context, CancellationToken ct)
    {
        // Group by supplier (via warehouse relationship)
        var groups = context.Basket.LineItems
            .GroupBy(li => GetSupplierId(li, context.Products, context.Warehouses))
            .Select(g => new OrderGroup
            {
                GroupId = GenerateDeterministicId(g.Key),
                GroupName = $"Supplier: {GetSupplierName(g.Key, context.Warehouses)}",
                LineItems = g.Select(MapToShippingLineItem).ToList(),
                Metadata = { ["SupplierId"] = g.Key }
            }).ToList();

        return new OrderGroupingResult { Groups = groups };
    }

    private Guid? GetSupplierId(LineItem li, Dictionary<Guid, Product> products, List<Warehouse> warehouses)
    {
        // Get product's primary warehouse, then get supplier from warehouse
        var product = products.GetValueOrDefault(li.ProductId);
        var warehouseId = product?.ProductRoot?.ProductRootWarehouses
            .OrderBy(prw => prw.PriorityOrder)
            .FirstOrDefault()?.WarehouseId;
        return warehouses.FirstOrDefault(w => w.Id == warehouseId)?.SupplierId;
    }
}
```

---

## 5. Checkout & Order Flow

### Warehouse Selection Algorithm

For each product in cart:
1. Get warehouses from `ProductRootWarehouse` (ordered by priority)
2. Check `CanServeRegion(countryCode, stateCode)` on each warehouse
3. Check stock availability (`ProductWarehouse.Stock - ReservedStock`)
4. Select first warehouse that passes all checks

### Service Region Rules

| Config | Behavior |
|--------|----------|
| No regions | Serves everywhere |
| `US, null, false` | Serves all of USA |
| `US, HI, true` | Excludes Hawaii only |
| `CA, QC, false` | Serves ONLY Quebec |

**Specificity**: State-specific rules override country-level rules.

### Shipping Option Resolution (3-Property System)

```
Step 1: Base Options
  IF Product.ShippingOptions is populated → use those
  ELSE → use Warehouse.ShippingOptions

Step 2: Apply Restriction Mode
  CASE None → return base options
  CASE AllowList → return ONLY Product.AllowedShippingOptions
  CASE ExcludeList → return base MINUS Product.ExcludedShippingOptions
```

**Grouping Impact**: Products with different allowed shipping options create separate groups (even from same warehouse).

### Flow Diagram

```
  Basket (with LineItems)
         │
         ▼
  ┌─────────────────────────┐
  │ IOrderGroupingStrategy  │  ← Groups items by warehouse/vendor/etc.
  │ .GroupItemsAsync()      │
  └───────────┬─────────────┘
              │
              ▼
  ┌─────────────────────────┐
  │ Customer selects        │  ← One shipping option per group
  │ shipping per group      │
  └───────────┬─────────────┘
              │
              ▼
  ┌─────────────────────────┐
  │ Create Invoice          │  ← One invoice per checkout
  │   └── Orders (per group)│  ← One order per group
  │         └── LineItems   │
  └───────────┬─────────────┘
              │
              ▼
  ┌─────────────────────────┐
  │ Admin Fulfillment       │
  │   └── Shipments         │  ← One+ shipments per order
  │         └── Tracking    │
  └─────────────────────────┘
```

### Example: Multi-Warehouse Order

**Scenario**: Customer in California orders 2x Blue T-Shirt + 1x Red T-Shirt

```
Products:
  Blue T-Shirt  → East Coast: 50 stock, West Coast: 30 stock
  Red T-Shirt   → East Coast: 0 stock,  West Coast: 15 stock

Warehouse Selection:
  Blue T-Shirt → East Coast (Priority 1, has stock, serves CA) ✓
  Red T-Shirt  → East Coast fails (no stock) → West Coast ✓

Result:
  Group 1: Blue T-Shirt (x2) from East Coast
  Group 2: Red T-Shirt (x1) from West Coast

Customer selects shipping for each group → Invoice created with 2 Orders
```

### Product Packaging System

Products support multi-package shipping configurations with inheritance from root to variants.

```
┌─────────────────────────────────────────────────────────────────┐
│ ProductRoot                                                      │
│   └── DefaultPackageConfigurations: ProductPackage[]            │
│         (Default packages - variants inherit if not overridden) │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (inherits unless overridden)
┌─────────────────────────────────────────────────────────────────┐
│ Product (Variant)                                                │
│   └── PackageConfigurations: ProductPackage[]                   │
│   └── HsCode: string (customs/tariff classification)            │
│         (Empty = use root defaults, Populated = override)       │
└─────────────────────────────────────────────────────────────────┘
```

**ProductPackage Model:**
| Field | Type | Description |
|-------|------|-------------|
| Weight | decimal | Package weight in kg |
| LengthCm | decimal? | Package length in cm |
| WidthCm | decimal? | Package width in cm |
| HeightCm | decimal? | Package height in cm |

**Package Resolution (`GetEffectivePackages`):**
1. If variant has `PackageConfigurations` populated → use variant's packages
2. Otherwise → use `ProductRoot.DefaultPackageConfigurations`
3. Each package × quantity = ShipmentPackage entries in shipping quote request

**Why HsCode at Variant Level:**
- Different variants may require different tariff classifications
- Example: Cotton vs Polyester versions of same shirt have different HS codes
- Enables accurate customs declarations per variant

---

## 6. Inventory & Order Status

### Order Status Lifecycle

```
Pending → AwaitingStock → ReadyToFulfill → Processing → Shipped → Completed
                                              │
                                              └──► PartiallyShipped

Any status (except Shipped/Completed) can → Cancelled or OnHold
```

### Stock Reservation Flow

```
ORDER CREATION:
  IF TrackStock = true:
    Check: Stock - ReservedStock ≥ quantity
    Reserve: ReservedStock += quantity
  Order.Status = ReadyToFulfill

SHIPMENT CREATION:
  IF TrackStock = true:
    Allocate: Stock -= quantity, ReservedStock -= quantity
  Order.Status = Shipped (or PartiallyShipped)

CANCELLATION:
  IF TrackStock = true:
    Release: ReservedStock -= quantity
```

### TrackStock Flag

| Value | Use Case | Behavior |
|-------|----------|----------|
| `true` (default) | Physical products | Full stock tracking |
| `false` | Digital, services, drop-ship | No stock operations |

---

## 7. Notification System

Hook into CRUD operations for validation, modification, and external integrations.

### Pattern

```csharp
// Before handler - can cancel or modify
public class ValidateOrderHandler : INotificationAsyncHandler<OrderStatusChangingNotification>
{
    public Task HandleAsync(OrderStatusChangingNotification notification, CancellationToken ct)
    {
        if (SomeValidationFails())
            notification.CancelOperation("Reason");
        return Task.CompletedTask;
    }
}

// After handler - react to changes
public class AuditHandler : INotificationAsyncHandler<OrderStatusChangedNotification>
{
    public Task HandleAsync(OrderStatusChangedNotification notification, CancellationToken ct)
    {
        // Log, sync external systems, etc.
    }
}
```

### Notification Types

| Domain | Before | After |
|--------|--------|-------|
| Invoice | Saving, Deleting | Saved, Deleted |
| Order | Creating, Saving, StatusChanging | Created, Saved, StatusChanged |
| Payment | Creating | Created, Refunded |
| Shipment | Creating, Saving | Created, Saved |
| Inventory | StockReserving, Releasing, Allocating | StockReserved, Released, Allocated |
| Product | Creating, Saving, Deleting | Created, Saved, Deleted |

**Aggregate**: `InvoiceAggregateChangedNotification` fires on ANY change to Invoice or children.

### Handler Priority

`[NotificationHandlerPriority(n)]` - lower values run first.

| Priority | Use Case |
|----------|----------|
| 100 | Early validation |
| 500 | Entity modification |
| 1000 | Default |
| 2000 | External system sync |

---

## 8. Service Architecture

### Key Services

| Service | Responsibility |
|---------|----------------|
| `ICheckoutService` | Basket operations, line item calculations |
| `IInvoiceService` | Order creation, status management |
| `IInventoryService` | Stock reservation/allocation |
| `IProductService` | Product queries, lifecycle |
| `IShippingService` | Shipping options, provider management |
| `IPaymentService` | Payment transactions, refunds |
| `ISupplierService` | Supplier management |
| `IWarehouseService` | Warehouse selection, inventory |

### Rules

1. **DbContext in services only** - Controllers inject services, never DbContext
2. **Parameter objects** - Use RORO pattern for extensible method signatures
3. **CrudResult<T>** - Wrap results for consistent error handling
4. **Async throughout** - All I/O operations use async/await

```csharp
// Good: Service handles data access
public class OrdersController(IInvoiceService invoiceService) : Controller
{
    public async Task<IActionResult> GetOrders() => Ok(await invoiceService.GetAllAsync());
}
```

---

## 9. Extension Points Summary

| Extension Point | Interface | Manager |
|-----------------|-----------|---------|
| Shipping rates | `IShippingProvider` | `ShippingProviderManager` |
| Payment processing | `IPaymentProvider` | `PaymentProviderManager` |
| Order grouping | `IOrderGroupingStrategy` | `OrderGroupingStrategyResolver` |
| Order status transitions | `IOrderStatusHandler` | - |
| Entity events | `INotificationAsyncHandler<T>` | Umbraco notification system |

### Data Extension

All major entities have `ExtendedData` (Dictionary) for custom metadata without schema changes:
```csharp
warehouse.ExtendedData["CarrierAccountId"] = "12345";
product.ExtendedData["VendorId"] = "vendor-abc";
```

---

## Summary

```
Customer → Basket → OrderGroupingStrategy → Groups → Shipping Selection
                                                            │
                                                            ▼
                    Invoice ← Orders ← Shipments ← Admin Fulfillment
```

**Key Flows**:
1. Products stored in Warehouses (with priority + stock per variant)
2. Checkout groups items using pluggable strategy (default: warehouse-based)
3. Each group gets shipping options based on warehouse + product restrictions
4. Invoice contains Orders (one per group), Orders contain Shipments
5. Stock reserved on order, allocated on shipment

**Extensibility**:
- Implement `IShippingProvider` for carrier integrations
- Implement `IPaymentProvider` for payment gateways
- Implement `IOrderGroupingStrategy` for custom grouping logic
- Use notifications to hook into any entity lifecycle event

---

## 10. Future Features & Known Limitations

### Current Limitations

| Limitation | Description |
|------------|-------------|
| **Stock required for checkout** | Orders cannot be placed if insufficient stock. No backorder/partial fulfillment option. |
| **Refunds don't restock** | Refund processing handles payments only - inventory is not automatically restored. |

### Planned Features

| Feature | Notes |
|---------|-------|
| **Backorder Processing** | Implement `AwaitingStock` → `ReadyToFulfill` flow when stock becomes available. Needs scheduled job + customer notifications. |
| **Partial Stock Fulfillment** | Allow customers to choose: ship available items now + backorder rest, or wait for full order. |
| **Return/Restock Flow** | UI-driven restock option during refund. Not all refunds should restock (damaged, faulty, goodwill gestures). |
| **Basket Reservation Expiry** | Reserved stock should timeout after configurable period. Abandoned carts currently hold inventory indefinitely. |
| **Promotion/Coupon System** | Coupon codes, discount rules, time-based promotions, customer segment targeting. Currently only manual adjustments. |
| **Checkout Group Consolidation** | Consider UI option to consolidate multiple groups from same warehouse (different shipping restrictions create separate groups). |

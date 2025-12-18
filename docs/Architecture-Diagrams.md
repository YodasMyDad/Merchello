# Merchello Architecture

Enterprise ecommerce NuGet for Umbraco. **Ethos: making enterprise ecommerce simple.**

## Design Principles
- **Modular** - `ExtensionManager` for pluggable providers (Shipping, Payment, OrderGrouping)
- **Services** - Feature-grouped, DI, parameter models
- **Factories** - All domain objects via factories
- **Multi-warehouse** - Variant-level stock with priority-based selection

## 1. Architecture Layers

```
CONTROLLERS → Thin: HTTP only, no logic, no DbContext
     ↓
SERVICES → All business logic, all DB access, CrudResult<T>, RORO pattern
     ↓
FACTORIES → All object creation, stateless singletons
```

### Centralized Logic (NEVER duplicate elsewhere)

| Operation | Service.Method |
|-----------|----------------|
| Basket/Invoice totals | `ILineItemService.CalculateFromLineItems()` |
| Discount line items | `ILineItemService.AddDiscountLineItem()` |
| Invoice recalc | `IInvoiceService.RecalculateInvoiceTotals()` |
| Payment status | `IPaymentService.CalculatePaymentStatus()` |
| Variants | `IProductService.RegenerateVariants()` |
| Stock reserve/allocate/release | `IInventoryService.*Async()` |
| Order creation | `IInvoiceService.CreateOrderFromBasketAsync()` |
| Shipping quotes | `IShippingQuoteService.GetQuotesAsync()` |
| Customer get/create | `ICustomerService.GetOrCreateByEmailAsync()` |
| Segment membership | `ICustomerSegmentService.IsCustomerInSegmentAsync()` |
| Discount calculation | `IDiscountEngine.CalculateAsync()` |
| Discount validation | `IDiscountEngine.ValidateCodeAsync()` |
| Discount application | `IDiscountEngine.ApplyDiscountsAsync()` |
| Discount usage | `IDiscountService.RecordUsageAsync()` |

### Factories

| Factory | Creates |
|---------|---------|
| `InvoiceFactory` | Invoice from basket/draft |
| `OrderFactory` | Order for invoice |
| `PaymentFactory` | Payment/refund records |
| `ShipmentFactory` | Shipment for order |
| `BasketFactory` | Shopping basket |
| `ProductFactory` | Product variants |
| `ProductRootFactory` | ProductRoot with options |
| `ProductOptionFactory` | Options and values |
| `LineItemFactory` | Line items |
| `TaxGroupFactory` | Tax config |
| `CustomerFactory` | Customer from email/params |
| `DiscountFactory` | Discount, TargetRules, BuyXGetYConfig, FreeShippingConfig |

### Rules
```csharp
// ❌ Logic in controller / direct DbContext
var paid = payments.Where(p => p.PaymentSuccess).Sum(p => p.Amount);

// ✅ Delegate to service
var status = await paymentService.CalculatePaymentStatusAsync(invoiceId);

// ❌ Direct instantiation
var invoice = new Invoice { Id = Guid.NewGuid() };

// ✅ Use factory
var invoice = invoiceFactory.CreateFromBasket(basket, invoiceNumber, billingAddress);
```

### Benefits
1. Financial accuracy - single source of truth
2. Auditability - traceable calculations
3. Maintainability - change once, applies everywhere
4. Testing - isolated unit tests
5. Thread safety - stateless factories, scoped DbContext

## 2. Folder Structure

```
Feature/
├── Models/          # Domain models
├── Factories/       # Object instantiation
├── Services/        # Business logic
│   ├── Interfaces/
│   └── Parameters/  # RORO objects
├── Mapping/         # Custom mapping
├── Dtos/
└── ExtensionMethods/
```

**Modules**: Accounting, Checkout, Customers, Products, Shipping, Payments, Suppliers, Warehouses, Locality, Notifications, Stores

## 3. Entity Relationships

```
Supplier →1:N→ Warehouse →1:N→ ServiceRegions
                       →1:N→ ShippingOptions →1:N→ ShippingCosts
                       →M:N→ ProductRoot (via ProductRootWarehouse)
                       →M:N→ Product (via ProductWarehouse: Stock, ReservedStock, TrackStock)

ProductRoot →1:N→ Product (variant)
           →1:N→ DefaultPackageConfigurations

Product →1:N→ PackageConfigurations, HsCode

Customer →1:N→ Invoice (required, auto-created from billing email)

Invoice →1:N→ Order →1:N→ Shipment (N:1 Warehouse)
       →1:N→ Payment

Order →1:N→ LineItems
```

## 4. Provider Systems

`ExtensionManager` scans assemblies → discovers providers → creates via DI → caches.

### IShippingProvider
```csharp
ShippingProviderMetadata Metadata { get; }
ValueTask<IEnumerable<ShippingProviderConfigurationField>> GetConfigurationFieldsAsync(ct);  // Global config
ValueTask<IEnumerable<ShippingProviderConfigurationField>> GetMethodConfigFieldsAsync(ct);  // Per-warehouse
ValueTask ConfigureAsync(ShippingProviderConfiguration? config, ct);
bool IsAvailableFor(ShippingQuoteRequest request);
Task<ShippingRateQuote?> GetRatesAsync(ShippingQuoteRequest request, ct);
Task<ShippingRateQuote?> GetRatesForServicesAsync(request, serviceTypes[], options[], ct);
```
- Currency conversion via `IExchangeRateCache`
- Built-in: `FlatRateShippingProvider`

### IPaymentProvider
```csharp
PaymentProviderMetadata Metadata { get; }
Task<List<PaymentProviderConfigurationField>> GetConfigurationFieldsAsync();
Task ConfigureAsync(Dictionary<string, string> settings);
Task<PaymentSessionResult> CreatePaymentSessionAsync(PaymentSessionRequest request);
Task<PaymentResult> ProcessPaymentAsync(ProcessPaymentRequest request);
Task<RefundResult> RefundPaymentAsync(RefundRequest request);
```
- Built-in: `ManualPaymentProvider`

### Config Field Types
`Text`, `Password`, `Number`, `Checkbox`, `Select`, `Textarea`

## 5. Order Grouping

Config: `{ "Merchello": { "OrderGroupingStrategy": "vendor-grouping" } }` (empty = default warehouse grouping)

### IOrderGroupingStrategy
```csharp
OrderGroupingStrategyMetadata Metadata { get; }
Task<OrderGroupingResult> GroupItemsAsync(OrderGroupingContext context, ct);
```

**Context**: Basket, ShippingAddress, Products (dict), Warehouses (list), SelectedShippingOptions

**Output (OrderGroup)**: GroupId (deterministic GUID), GroupName, WarehouseId?, LineItems, AvailableShippingOptions, Metadata

**Default**: Groups by warehouse (stock availability → priority → region serviceability)

## 6. Checkout Flow

### Warehouse Selection
1. Get warehouses from `ProductRootWarehouse` (by priority)
2. Check `CanServeRegion(country, state)`
3. Check stock (`Stock - ReservedStock ≥ qty`)
4. Select first passing warehouse

### Service Region Rules
| Config | Behavior |
|--------|----------|
| No regions | Serves everywhere |
| `US, null, false` | All USA |
| `US, HI, true` | Excludes Hawaii |
| `CA, QC, false` | Only Quebec |

State-specific overrides country-level.

### Shipping Option Resolution
```
1. Base = Product.ShippingOptions ?? Warehouse.ShippingOptions
2. Apply restriction:
   None → base
   AllowList → only Product.AllowedShippingOptions
   ExcludeList → base - Product.ExcludedShippingOptions
```
Different shipping restrictions = separate groups (even same warehouse).

### Flow
```
Basket → IOrderGroupingStrategy.GroupItemsAsync() → Groups
  → Customer selects shipping/group → Invoice (1) → Orders (per group) → Shipments (1+/order)
```

### Package System
```
ProductRoot.DefaultPackageConfigurations (inherited)
     ↓
Product.PackageConfigurations (override if populated)
Product.HsCode (customs classification, varies by variant)
```

**ProductPackage**: Weight (kg), LengthCm?, WidthCm?, HeightCm?

## 7. Inventory & Status

### Order Lifecycle
```
Pending → AwaitingStock → ReadyToFulfill → Processing → Shipped/PartiallyShipped → Completed
Any (except Shipped/Completed) → Cancelled | OnHold
```

### Stock Flow (when TrackStock=true)
```
Order Creation: Check (Stock - Reserved ≥ qty), Reserve (Reserved += qty)
Shipment Creation: Allocate (Stock -= qty, Reserved -= qty)
Cancellation: Release (Reserved -= qty)
```

**TrackStock**: true (default, physical) | false (digital, services, drop-ship)

## 8. Notifications

Hook into CRUD for validation/modification/integration.

```csharp
// Before (can cancel)
public class ValidateHandler : INotificationAsyncHandler<OrderStatusChangingNotification>
{
    public Task HandleAsync(notification, ct) { notification.CancelOperation("Reason"); }
}

// After (react)
public class AuditHandler : INotificationAsyncHandler<OrderStatusChangedNotification>
{
    public Task HandleAsync(notification, ct) { /* log, sync */ }
}
```

### Events
| Domain | Before | After |
|--------|--------|-------|
| Invoice | Saving, Deleting | Saved, Deleted |
| Order | Creating, Saving, StatusChanging | Created, Saved, StatusChanged |
| Payment | Creating | Created, Refunded |
| Shipment | Creating, Saving | Created, Saved |
| Inventory | StockReserving, Releasing, Allocating | StockReserved, Released, Allocated |
| Product | Creating, Saving, Deleting | Created, Saved, Deleted |

**Aggregate**: `InvoiceAggregateChangedNotification` fires on any Invoice/child change.

**Priority** `[NotificationHandlerPriority(n)]`: 100=validation, 500=modification, 1000=default, 2000=external sync

## 9. Services

| Service | Responsibility |
|---------|----------------|
| `ICheckoutService` | Basket ops, discounts, shipping quotes, order grouping |
| `ICustomerService` | Customer CRUD, get-or-create by email |
| `IInvoiceService` | Invoice/order CRUD, status, totals |
| `IInventoryService` | Stock reserve/allocate/release |
| `IProductService` | Product CRUD, variants, options |
| `IShippingService` | Provider config |
| `IShippingQuoteService` | Rate quotes |
| `IPaymentService` | Transactions, refunds, status |
| `ISupplierService` | Supplier mgmt |
| `IWarehouseService` | Selection, regions |
| `ILineItemService` | Unified calculations (basket/invoice), discounts, tax |
| `ITaxService` | Tax groups |
| `ICurrencyService` | Formatting, rounding, rates |
| `IDiscountService` | Discount CRUD, validation, usage tracking |
| `IDiscountEngine` | Calculation, validation, application to baskets/invoices |

**Principles**: DbContext in services only, RORO params, CrudResult<T>, async+CancellationToken, factories for creation

## 10. Extension Points

| Point | Interface | Manager |
|-------|-----------|---------|
| Shipping | `IShippingProvider` | `ShippingProviderManager` |
| Payment | `IPaymentProvider` | `PaymentProviderManager` |
| Order grouping | `IOrderGroupingStrategy` | `OrderGroupingStrategyResolver` |
| Order status | `IOrderStatusHandler` | - |
| Entity events | `INotificationAsyncHandler<T>` | Umbraco notifications |

**ExtendedData**: All entities have `Dictionary` for custom metadata: `entity.ExtendedData["Key"] = "value";`

## 11. Limitations & Planned

**Current**: Orders require sufficient stock (no backorder), refunds don't restock

**Planned**: Backorder processing, partial fulfillment, return/restock flow, basket reservation expiry, checkout group consolidation

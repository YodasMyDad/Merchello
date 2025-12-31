## Overview
Enterprise ecommerce NuGet package. **Ethos: making enterprise ecommerce simple.**
- **Modular** - `ExtensionManager` for plugins (ShippingProviders, etc.)
- **Services** - Feature-grouped, DI, parameter models
- **Factories** - All key classes via factories

## Feature Structure
```
Feature/
├── Dtos/        # API transfer objects
├── Extensions/  # C# extension methods
├── Factories/
├── Mapping/
├── Models/      # Internal domain objects
└── Services/
    ├── Parameters/
    └── Interfaces/
```
Create folders only when needed.

## Product Options
- `ProductOption.IsVariant` (default true) → variant generation
- When false → add-on with `PriceAdjustment`, `CostAdjustment`, `SkuSuffix`

---

# .NET Rules

## Philosophy
- Simple, readable code; terse, accurate
- No placeholders/TODOs - fully implement
- Readability > performance

## Code Style
- Idiomatic C#, LINQ/lambdas, `var` when obvious
- C# 13+: records, pattern matching, null-coalescing
- Primary constructors: `class Handler(ILogger<Handler> log)`
- Collection expressions: `[]` not `new List<T>()`

## Naming
| Style | For |
|-------|-----|
| PascalCase | classes, methods, public |
| camelCase | locals |
| _camelCase | private fields |
| UPPERCASE | constants |
| I prefix | interfaces |

## DTO Naming
`Dtos/` = API (always `Dto` suffix), `Models/` = internal (no suffix)

| Intent | Pattern |
|--------|---------|
| Read | `{Entity}Dto` |
| List | `{Entity}ListItemDto` |
| Detail | `{Entity}DetailDto` |
| Create/Update | `Create{Entity}Dto` / `Update{Entity}Dto` |
| Edit | `Edit{Entity}Dto` / `{Entity}ForEditDto` |
| Result | `{Action}ResultDto` |
| Page/Query | `{Entity}PageDto` / `{Entity}QueryDto` |
| Toggle | `Toggle{Entity}Dto` |
| Add/Remove | `Add{Item}Dto` / `Remove{Item}Dto` |
| Delete/Export | `Delete{Entity}Dto` / `Export{Entity}Dto` |

**Add/Remove** = collection ops; **Create/Delete** = entity lifecycle

Internal: `{Entity}Request`, `{Entity}Result`

## Classes
- Models in separate files, nested `Models/` folder
- Never rename existing functions without permission

## Error Handling
- Exceptions for exceptional cases only
- Data Annotations/FluentValidation, global middleware
- Proper HTTP status codes

## API/Performance
- RESTful, attribute routing, versioning
- async/await, IMemoryCache, pagination
- Efficient LINQ, avoid N+1

## Key Conventions
- DI throughout, custom mapping (no AutoMapper)
- IHostedService for background tasks

## DbContext
Controllers never access DbContext directly - inject services.
Design reusable methods with flexible parameters.
```csharp
// BAD
public class OrdersController(MerchelloDbContext db) : Controller
{
    public async Task<IActionResult> GetOrders() => Ok(await db.Invoices.ToListAsync());
}
// GOOD
public class OrdersController(IInvoiceService svc) : Controller
{
    public async Task<IActionResult> GetOrders() => Ok(await svc.GetAllAsync());
}
// BAD: GetUnpaidInvoicesForCustomerCreatedThisMonth(Guid id)
// GOOD: QueryAsync(InvoiceQueryParameters p)
```

## Migrations
Use `scripts/add-migration.ps1` only. Handles all providers.

## Testing
- xUnit, Moq, **Shouldly**: `result.ShouldBe(expected)`
- Integration tests for APIs
- Run tests after changes

## Security
Auth middleware, JWT, HTTPS, CORS, .NET Identity

## Blazor
Avoid EF in components. If needed: `using var scope = ServiceProvider.CreateScope();`

---

# Notifications

Hook CRUD for: validation, modification, cancellation, external integrations.

## Types
| Entity | Before | After |
|--------|--------|-------|
| Invoice | Saving, Deleting | Saved, Deleted |
| Order | Creating, Saving, StatusChanging | Created, Saved, StatusChanged |
| Payment | Creating | Created, Refunded |
| Shipment | Creating, Saving | Created, Saved |
| ProductRoot | Creating, Saving, Deleting | Created, Saved, Deleted |
| ProductOption | Creating, Deleting | Created, Deleted |
| Warehouse | Creating, Saving, Deleting | Created, Saved, Deleted |
| TaxGroup | Creating, Saving, Deleting | Created, Saved, Deleted |

**Aggregate**: `InvoiceAggregateChangedNotification` - any Invoice/children change

**Inventory**: `Stock{Reserving|Reserved|Releasing|Released|Allocating|Allocated}Notification`, `StockAdjustedNotification`, `LowStockNotification`

## Handler Example
```csharp
// Register
builder.AddNotificationAsyncHandler<OrderStatusChangingNotification, ValidateHandler>();

// Validation (priority 100) - can cancel
[NotificationHandlerPriority(100)]
public class ValidateHandler(ILogger<ValidateHandler> log) : INotificationAsyncHandler<OrderStatusChangingNotification>
{
    public Task HandleAsync(OrderStatusChangingNotification n, CancellationToken ct)
    {
        if (n.Order.LineItems?.Any() != true) n.CancelOperation("No items");
        return Task.CompletedTask;
    }
}

// Modification (priority 500)
[NotificationHandlerPriority(500)]
public class CarrierHandler : INotificationAsyncHandler<ShipmentCreatingNotification>
{
    public Task HandleAsync(ShipmentCreatingNotification n, CancellationToken ct)
    {
        if (n.Shipment.TrackingNumber?.StartsWith("1Z") == true) n.Shipment.Carrier = "UPS";
        return Task.CompletedTask;
    }
}
```

## Priority
100=validation, 500=modification, 1000=default, 2000=external sync

## State Sharing
`notification.State["key"] = value;` - shared between Before/After handlers

---

# Order Grouping Strategy

Pluggable grouping of basket items into orders (warehouse, vendor, delivery date).

- Default: warehouse-based; Custom: implement `IOrderGroupingStrategy`
- Config: `"Merchello:OrderGroupingStrategy": "vendor-grouping"`
- Notifications: `OrderGroupingModifyingNotification`, `OrderGroupingNotification`

## Context Properties
`Basket`, `BillingAddress`, `ShippingAddress`, `CustomerId`, `CustomerEmail`, `Products`, `Warehouses`, `SelectedShippingOptions`, `ExtendedData`

## OrderGroup Properties
`GroupId`, `GroupName`, `WarehouseId`, `LineItems`, `AvailableShippingOptions`, `SelectedShippingOptionId`, `Metadata`

## Custom Strategy
```csharp
public class VendorStrategy(ILogger<VendorStrategy> log) : IOrderGroupingStrategy
{
    public OrderGroupingStrategyMetadata Metadata => new("vendor-grouping", "Vendor Grouping", "Groups by vendor");

    public async Task<OrderGroupingResult> GroupItemsAsync(OrderGroupingContext ctx, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(ctx.ShippingAddress.CountryCode))
            return OrderGroupingResult.Fail("Country required");

        var groups = ctx.Basket.LineItems.Where(li => li.ProductId.HasValue)
            .GroupBy(li => ctx.Products.GetValueOrDefault(li.ProductId!.Value)?.ProductRoot?.ExtendedData?.GetValueOrDefault("VendorId")?.ToString() ?? "default")
            .Select(g => new OrderGroup
            {
                GroupId = GenerateId(g.Key), GroupName = $"Vendor: {g.Key}",
                LineItems = g.Select(li => new ShippingLineItem { LineItemId = li.Id, Name = li.Name ?? "", Sku = li.Sku, Quantity = li.Quantity, Amount = li.Amount }).ToList()
            }).ToList();
        return new OrderGroupingResult { Groups = groups, SubTotal = ctx.Basket.SubTotal, Tax = ctx.Basket.Tax, Total = ctx.Basket.Total };
    }
}
```

---

# TypeScript/Frontend

Umbraco v17 backoffice: TypeScript, Vite, Lit

## Principles
- Small components, pure functions, no classes except Lit element
- TypeScript strict, no `any`, RORO pattern
- `interface` > `type`, explicit return types
- Booleans: `isLoading`, `hasError`, `shouldFetch`

## Naming
API types: mirror C#; Modal: `{Feature}ModalData`/`ModalValue`; Events: `{Event}Detail`

## Formatting
Never `.toFixed()`. Use `@shared/utils/formatting.js`:
```typescript
import { formatCurrency, formatNumber } from "@shared/utils/formatting.js";
formatCurrency(amount); formatNumber(value, decimals);
```

## Backend-Frontend Separation
Backend = source of truth. Status labels from DTOs (`statusLabel`, `statusCssClass`). Never hardcode enum mappings. Use preview APIs for calculations. Frontend validation = UX only.
```typescript
// Bad: status === 10 ? "Pending" : "Shipped"
// Good: ${order.statusLabel}
```

## Lit Rules
- One element/file, PascalCase class, kebab-case tag with prefix
- `@property`/`@state` with types
- `render()`: error/loading first, delegate to helpers
- Custom events with typed `detail`, no `innerHTML`

## Structure
```
src/
  api/           # merchello-api.ts, store-settings.ts
  shared/utils/  # validation.ts, formatting.ts
  {feature}/
    components/  # {name}.element.ts
    modals/      # {name}-modal.element.ts, {name}-modal.token.ts
    contexts/    # {name}.context.ts
    types/       # {feature}.types.ts
    manifest.ts
```

## Error Handling
Guard clauses first, typed errors (`code`, `message`), show clear error/empty/loading states

## Standards
- **Security**: No secrets in client, typed service modules, sanitize input
- **Testing**: Unit test pure functions, component tests for critical UI
- **A11y**: Keyboard accessible, ARIA, color contrast
- **Performance**: Minimal reactive state, lazy loading, small bundles

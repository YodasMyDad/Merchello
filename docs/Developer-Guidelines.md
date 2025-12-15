# Merchello Core - Developer Guidelines

## Overview
Enterprise ecommerce NuGet package. **Ethos: making enterprise ecommerce simple.**

- **Modular/Plugin-based** - `ExtensionManager` for pluggable items (ShippingProviders, etc.)
- **Services** - Feature-grouped, minimal entry points, DI throughout, parameter models for extensibility
- **Factories** - All important classes via factories (Product, ProductRoot, TaxGroup, etc.)

## Feature Folder Structure
```
Products/
├── Dtos/
├── Extensions/
├── Factories/
├── Mapping/
├── Models/
└── Services/
    ├── Parameters/
    └── Interfaces/
```

**Notes:**
- Not all features require every subfolder - only create folders when needed
- Minimal features (e.g., Caching, Stores) may only have Models/ and Services/
- The `Extensions/` folder contains C# extension methods for the feature

## Product Options - Add-ons (Non-Variant)
- `ProductOption.IsVariant` (default true) → participates in variant generation
- When false → add-on/modifier, does NOT generate variants
- Add-on values: `PriceAdjustment`, `CostAdjustment`, `SkuSuffix`
- Variant generation only considers `IsVariant == true` options

# .NET Development Rules

## Philosophy
- Write simple, readable code; be terse, accurate, thorough
- Give answers immediately, explain after
- No placeholders/TODOs - fully implement everything
- Focus on readability over performance

## Code Style
- Concise, idiomatic C# following .NET conventions
- Prefer LINQ/lambdas for collections
- Descriptive names: `IsUserSignedIn`, `CalculateTotal`
- Use `var` when type obvious
- C# 13+: records, pattern matching, null-coalescing
- Primary constructors: `public class Handler(ILogger<Handler> logger)`
- Collection expressions: `[]` not `new List<T>()`
- Pattern matching: `.Where(e => e.Entity is Media or Actor)`

## Naming
|Style|Use For|
|---|---|
|PascalCase|classes, methods, public members|
|camelCase|locals, private fields|
|UPPERCASE|constants|
|I prefix|interfaces (`IUserService`)|

## DTO Naming Conventions

### Folder Organization
- `Dtos/` - API transfer objects (request/response payloads)
- `Models/` - Internal domain objects (service-to-service, no `Dto` suffix)

### Naming Rules

**API DTOs (Dtos/ folder)** - Always end with `Dto`:

|Intent|Pattern|Example|
|---|---|---|
|Read/display|`{Entity}Dto`|`PaymentDto`|
|List view|`{Entity}ListItemDto`|`OrderListItemDto`|
|Detail view|`{Entity}DetailDto`|`OrderDetailDto`|
|Create|`Create{Entity}Dto`|`CreateShipmentDto`|
|Update|`Update{Entity}Dto`|`UpdateShipmentDto`|
|Edit (complex)|`Edit{Entity}Dto`|`EditInvoiceDto`|
|For edit form|`{Entity}ForEditDto`|`InvoiceForEditDto`|
|Operation result|`{Action}ResultDto`|`EditInvoiceResultDto`|
|Paginated list|`{Entity}PageDto`|`OrderPageDto`|
|Query params|`{Entity}QueryDto`|`OrderQueryDto`|
|Toggle|`Toggle{Entity}Dto`|`TogglePaymentProviderDto`|
|Add item|`Add{Item}Dto`|`AddCustomItemDto`|
|Remove item|`Remove{Item}Dto`|`RemoveLineItemDto`|
|Delete|`Delete{Entity}Dto`|`DeleteOrdersDto`|
|Export|`Export{Entity}Dto`|`ExportOrderDto`|

**Add/Remove vs Create/Delete Distinction:**
- **Add/Remove** - Collection operations: adding/removing items to/from an existing entity (e.g., `AddCustomItemDto` adds an item to an order)
- **Create/Delete** - Entity lifecycle: creating new entities or permanently deleting them (e.g., `CreateShipmentDto` creates a new shipment, `DeleteOrdersDto` permanently removes orders)

**Internal Models (Models/ folder)** - NO `Dto` suffix:

|Intent|Pattern|Example|
|---|---|---|
|Service request|`{Entity}Request`|`PaymentRequest`|
|Operation result|`{Entity}Result`|`PaymentResult`|

### TypeScript Conventions

- API types: Mirror C# naming exactly
- Modal input: `{Feature}ModalData`
- Modal output: `{Feature}ModalValue`
- Event payload: `{Event}Detail`

## Classes & Models
- Never put models/records in same file as services/handlers
- Models in separate files within nested `Models/` folder
- Never rename existing functions without permission

## Error Handling
- Exceptions for exceptional cases only, not control flow
- Proper logging via built-in .NET logging
- Data Annotations or FluentValidation
- Global exception middleware
- Appropriate HTTP status codes

## API Design
- RESTful principles, attribute routing
- API versioning, action filters
- Rate limiting consideration
- Minimize API calls to achieve result

## Performance
- async/await for I/O-bound ops
- IMemoryCache or distributed caching
- Efficient LINQ, avoid N+1 queries
- Pagination for large datasets

## Key Conventions
- DI for loose coupling/testability
- Repository pattern or EF Core directly (based on complexity)
- Custom mapping methods (no AutoMapper)
- IHostedService/BackgroundService for background tasks

## DbContext & Service Architecture
- **All DbContext queries in services** - Controllers never access DbContext directly
- Controllers inject services; services encapsulate data access
- Ensures testability, reusability, proper boundaries

**Service Method Design:**
- Design for reusability - avoid single-purpose methods
- Think about parameters/return types useful across multiple scenarios
- Prefer composable, flexible methods over highly-specific ones
- Shared queries belong in shared service methods

```csharp
// BAD: DbContext in controller
public class OrdersController(MerchelloDbContext db) : Controller
{
    public async Task<IActionResult> GetOrders() => Ok(await db.Invoices.ToListAsync());
}

// GOOD: Service handles data access
public class OrdersController(IInvoiceService invoiceService) : Controller
{
    public async Task<IActionResult> GetOrders() => Ok(await invoiceService.GetAllAsync());
}

// BAD: Overly specific
Task<List<Invoice>> GetUnpaidInvoicesForCustomerCreatedThisMonth(Guid customerId);

// GOOD: Reusable with flexible parameters
Task<List<Invoice>> QueryAsync(InvoiceQueryParameters parameters);
```

## Database Migrations
- **Always use `scripts/add-migration.ps1`**
- Never use `dotnet ef migrations` directly
- Script handles all providers (SQL Server, SQLite)

## Testing
- xUnit for unit tests; Moq for mocking
- **Shouldly** for assertions: `result.ShouldBe(expected)`, `result.ShouldNotBeNull()`
- Integration tests for API endpoints
- Run tests after completing changes

## Security
- Authentication/Authorization middleware
- JWT for stateless API auth
- HTTPS/SSL enforcement; CORS policies
- .NET Identity where needed

## API Documentation
- Swagger/OpenAPI (Swashbuckle.AspNetCore)
- XML comments on controllers/models

## Blazor
- Avoid EF Core directly in components
- If needed: inject `IServiceProvider`, use scoped context:
```csharp
using var scope = ServiceProvider.CreateScope();
```

# Entity Notifications System

Hook into CRUD operations on entities for: validation/modification before save, cancel operations, react to changes, trigger external integrations.

## Notification Types

### Accounting
|Entity|Before|After|
|---|---|---|
|Invoice|Saving, Deleting|Saved, Deleted|
|Order|Creating, Saving, StatusChanging|Created, Saved, StatusChanged|
|Payment|Creating|Created, Refunded|
|Shipment|Creating, Saving|Created, Saved|

**Aggregate**: `InvoiceAggregateChangedNotification` - fires on ANY change to Invoice or children (Order, Payment, Shipment, LineItem)

### Product
|Entity|Before|After|
|---|---|---|
|ProductRoot|Creating, Saving, Deleting|Created, Saved, Deleted|
|ProductOption|Creating, Deleting|Created, Deleted|

### Warehouse
|Entity|Before|After|
|---|---|---|
|Warehouse|Creating, Saving, Deleting|Created, Saved, Deleted|

### Tax
|Entity|Before|After|
|---|---|---|
|TaxGroup|Creating, Saving, Deleting|Created, Saved, Deleted|

### Inventory
|Operation|Before|After|
|---|---|---|
|StockReserve|StockReservingNotification|StockReservedNotification|
|StockRelease|StockReleasingNotification|StockReleasedNotification|
|StockAllocate|StockAllocatingNotification|StockAllocatedNotification|

**Events**: `StockAdjustedNotification` (manual adjustment), `LowStockNotification` (below threshold)

## Creating Notification Handlers

```csharp
// Register in Composer
public class MyComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.AddNotificationAsyncHandler<OrderStatusChangingNotification, ValidateOrderStatusHandler>();
        builder.AddNotificationAsyncHandler<ShipmentCreatingNotification, AutoAssignCarrierHandler>();
        builder.AddNotificationAsyncHandler<InvoiceAggregateChangedNotification, AuditLogHandler>();
    }
}

// Validation handler - can cancel operation
[NotificationHandlerPriority(100)]
public class ValidateOrderStatusHandler(ILogger<ValidateOrderStatusHandler> logger)
    : INotificationAsyncHandler<OrderStatusChangingNotification>
{
    public Task HandleAsync(OrderStatusChangingNotification notification, CancellationToken ct)
    {
        if (notification.Order.LineItems?.Any() != true)
            notification.CancelOperation("Cannot change status of order with no items");
        return Task.CompletedTask;
    }
}

// Modification handler - modify entity before save
[NotificationHandlerPriority(500)]
public class AutoAssignCarrierHandler : INotificationAsyncHandler<ShipmentCreatingNotification>
{
    public Task HandleAsync(ShipmentCreatingNotification notification, CancellationToken ct)
    {
        if (notification.Shipment.TrackingNumber?.StartsWith("1Z") == true)
            notification.Shipment.Carrier = "UPS";
        return Task.CompletedTask;
    }
}

// Aggregate handler - single hook for any invoice-related change
public class AuditLogHandler(IAuditService auditService)
    : INotificationAsyncHandler<InvoiceAggregateChangedNotification>
{
    public async Task HandleAsync(InvoiceAggregateChangedNotification notification, CancellationToken ct)
    {
        await auditService.LogAsync(new AuditEntry
        {
            EntityType = notification.Source.ToString(),
            Action = notification.ChangeType.ToString(),
            InvoiceId = notification.Invoice.Id
        });
    }
}
```

## Handler Priority
Use `[NotificationHandlerPriority(n)]` - lower values run first.

|Priority|Use Case|
|---|---|
|100|Early validation|
|500|Entity modification|
|1000|Default (no attribute)|
|2000|External system sync|

## State Sharing Between Handlers
Before/After handlers share `State` dictionary:
```csharp
// Before handler
notification.State["originalPrice"] = product.Price;
// After handler
var originalPrice = notification.State.TryGetValue("originalPrice", out var price) ? (decimal)price : 0;
```

## Canceling Operations
Before notifications can cancel:
```csharp
public Task HandleAsync(OrderStatusChangingNotification notification, CancellationToken ct)
{
    if (SomeValidationFails())
        notification.CancelOperation("Reason for cancellation");
    return Task.CompletedTask;
}
```

# Order Grouping Strategy System

Pluggable strategy pattern for grouping basket items into orders during checkout (by warehouse, vendor, delivery date, category).

## Overview
- **Default**: Groups by warehouse based on stock availability & shipping region
- **Custom**: Implement `IOrderGroupingStrategy`
- **Config**: `appsettings.json` via `Merchello:OrderGroupingStrategy`
- **Notifications**: `OrderGroupingModifyingNotification` (before), `OrderGroupingNotification` (after)

## Configuration
```json
{ "Merchello": { "OrderGroupingStrategy": "vendor-grouping" } }
```
Value: strategy key (e.g., `"vendor-grouping"`) or fully qualified type name. Empty/null = default warehouse grouping.

## Creating Custom Strategy

```csharp
using Merchello.Core.Checkout.Strategies;
using Merchello.Core.Checkout.Strategies.Models;

public class VendorGroupingStrategy(ILogger<VendorGroupingStrategy> logger) : IOrderGroupingStrategy
{
    public OrderGroupingStrategyMetadata Metadata => new(
        Key: "vendor-grouping",
        DisplayName: "Vendor Grouping",
        Description: "Groups items by vendor for drop-shipping.");

    public async Task<OrderGroupingResult> GroupItemsAsync(OrderGroupingContext context, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(context.ShippingAddress.CountryCode))
            return OrderGroupingResult.Fail("Shipping address must have country code");

        List<OrderGroup> groups = [];
        var productsByVendor = context.Basket.LineItems
            .Where(li => li.ProductId.HasValue)
            .GroupBy(li => context.Products.GetValueOrDefault(li.ProductId!.Value)
                ?.ProductRoot?.ExtendedData?.GetValueOrDefault("VendorId")?.ToString() ?? "default");

        foreach (var vendorGroup in productsByVendor)
        {
            groups.Add(new OrderGroup
            {
                GroupId = GenerateDeterministicGroupId(vendorGroup.Key),
                GroupName = $"Vendor: {vendorGroup.Key}",
                WarehouseId = null,
                LineItems = vendorGroup.Select(li => new ShippingLineItem
                {
                    LineItemId = li.Id, Name = li.Name ?? "", Sku = li.Sku,
                    Quantity = li.Quantity, Amount = li.Amount
                }).ToList(),
                AvailableShippingOptions = GetShippingOptionsForVendor(vendorGroup.Key),
                Metadata = new Dictionary<string, object> { ["VendorId"] = vendorGroup.Key }
            });
        }
        return new OrderGroupingResult { Groups = groups, SubTotal = context.Basket.SubTotal, Tax = context.Basket.Tax, Total = context.Basket.Total };
    }

    private static Guid GenerateDeterministicGroupId(string vendorId)
    {
        using var md5 = System.Security.Cryptography.MD5.Create();
        return new Guid(md5.ComputeHash(System.Text.Encoding.UTF8.GetBytes(vendorId)));
    }
    private static List<ShippingOptionInfo> GetShippingOptionsForVendor(string vendorId) => [];
}
```

## OrderGroupingContext Properties
|Property|Type|Description|
|---|---|---|
|Basket|`Basket`|Basket with line items|
|BillingAddress|`Address`|Billing address|
|ShippingAddress|`Address`|Delivery address|
|CustomerId|`Guid?`|Logged-in customer ID|
|CustomerEmail|`string?`|Customer email|
|Products|`IReadOnlyDictionary<Guid, Product>`|Products by ID (preloaded)|
|Warehouses|`IReadOnlyDictionary<Guid, Warehouse>`|Available warehouses (preloaded)|
|SelectedShippingOptions|`Dictionary<Guid, Guid>`|Previously selected options|
|ExtendedData|`Dictionary<string, object>`|Custom strategy data|

## OrderGroup Properties
|Property|Type|Description|
|---|---|---|
|GroupId|`Guid`|Deterministic ID (consistent across requests)|
|GroupName|`string`|Display name|
|WarehouseId|`Guid?`|Warehouse ID (null for drop-shipping)|
|LineItems|`List<ShippingLineItem>`|Allocated line items|
|AvailableShippingOptions|`List<ShippingOptionInfo>`|Shipping options|
|SelectedShippingOptionId|`Guid?`|Selected shipping option|
|Metadata|`Dictionary<string, object>`|Custom metadata|

## Notifications

```csharp
public class MyComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.AddNotificationAsyncHandler<OrderGroupingModifyingNotification, AddGiftWrapGroupHandler>();
        builder.AddNotificationAsyncHandler<OrderGroupingNotification, LogGroupingHandler>();
    }
}

public class AddGiftWrapGroupHandler : INotificationAsyncHandler<OrderGroupingModifyingNotification>
{
    public Task HandleAsync(OrderGroupingModifyingNotification notification, CancellationToken ct)
    {
        if (notification.Context.Basket.ExtendedData?.ContainsKey("GiftWrap") == true)
        {
            notification.Result.Groups.Add(new OrderGroup
            {
                GroupId = Guid.Parse("00000000-0000-0000-0000-000000000001"),
                GroupName = "Gift Wrapping Service",
                LineItems = []
            });
        }
        return Task.CompletedTask;
    }
}
```

## File Structure
```
src/Merchello.Core/Checkout/
├── Strategies/
│   ├── IOrderGroupingStrategy.cs
│   ├── IOrderGroupingStrategyResolver.cs
│   ├── OrderGroupingStrategyResolver.cs
│   ├── DefaultOrderGroupingStrategy.cs
│   └── Models/
│       ├── OrderGroupingContext.cs
│       ├── OrderGroupingResult.cs
│       ├── OrderGroup.cs
│       └── OrderGroupingStrategyMetadata.cs
```

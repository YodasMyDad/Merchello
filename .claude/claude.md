## Overview
Enterprise ecommerce NuGet. **Ethos: making enterprise ecommerce simple. no over-engineered code**
- **Modular** - `ExtensionManager` for plugins (ShippingProviders, etc.)
- **Services** - Feature-grouped, DI, parameter models
- **Factories** - All key classes via factories

Never make assumptions about code in the project before you are making changes, even if a document states something, before changes, ALWAYS trace through the actual code and check everything.

## Feature Structure
```
Feature/
├── Dtos/        # API transfer objects
├── Extensions/  # C# extension methods
├── Factories/
├── Mapping/
├── Models/      # Internal domain
└── Services/
    ├── Parameters/
    └── Interfaces/
```
Create folders only when needed.

## Product Options
`ProductOption.IsVariant` (default true) → variant generation; when false → add-on with `PriceAdjustment`, `CostAdjustment`, `SkuSuffix`

# .NET

## Style
- Simple, readable, terse; no placeholders/TODOs; readability > performance
- Idiomatic C#, LINQ/lambdas, `var` when obvious
- C# 13+: records, pattern matching, null-coalescing, primary constructors, `[]` not `new List<T>()`

## Naming
PascalCase: classes/methods/public | camelCase: locals | _camelCase: private | UPPERCASE: constants | I: interfaces

## Cross-Boundary Type Consistency (CRITICAL)

**When a type appears in multiple layers (C# DTOs, internal models, TypeScript interfaces, JavaScript objects), field names MUST be identical** (differing only by casing convention: PascalCase in C#, camelCase in JSON/JS).

**Rules:**

1. **Backend is source of truth** — C# DTO field names define the canonical names
2. **One name per concept** — never use synonyms (`city` vs `townCity`, `state` vs `countyState`, `address1` vs `addressOne`)
3. **Map at boundaries** — when integrating external APIs that use different names, map to standard names immediately at the integration point
4. **Check before creating** — before adding a new shared type, search for existing types with similar purpose

**Example - Address fields** (reference: `Merchello.Core/Locality/Dtos/AddressDto.cs`):

- `AddressOne`/`addressOne` (not `address1`, `line1`, `street`)
- `TownCity`/`townCity` (not `city`, `locality`)
- `CountyState`/`countyState` (not `state`, `county`, `province`)
- `RegionCode`/`regionCode` (not `stateCode`, `provinceCode`)

**Example - Region fields** (reference: `Merchello.Core/Shared/Dtos/RegionDto.cs`):

- `RegionCode`/`regionCode` (not `code`, `stateCode`)

## DTOs
`Dtos/` = API (`Dto` suffix), `Models/` = internal (no suffix)

Read: `{Entity}Dto` | List: `{Entity}ListItemDto` | Detail: `{Entity}DetailDto` | Create/Update: `Create{Entity}Dto`/`Update{Entity}Dto` | Edit: `Edit{Entity}Dto` | Result: `{Action}ResultDto` | Page/Query: `{Entity}PageDto`/`{Entity}QueryDto` | Toggle: `Toggle{Entity}Dto` | Add/Remove: `Add{Item}Dto`/`Remove{Item}Dto` | Delete/Export: `Delete{Entity}Dto`/`Export{Entity}Dto`

Add/Remove = collection ops; Create/Delete = entity lifecycle. Internal: `{Entity}Request`/`{Entity}Result`

## File Organization
**One type per file** — every `class`, `record`, `enum`, and `interface` gets its own file. This applies everywhere: Dtos, Models, Parameters, Interfaces, Services. File name = type name (e.g., `DiscountOrderBy.cs` for `enum DiscountOrderBy`). Never combine multiple public types in one file, even if they're related.

## Errors
- Never rename existing functions without permission
- Exceptions for exceptional cases; Data Annotations/FluentValidation; proper HTTP codes

## API/Performance
RESTful, attribute routing, versioning; async/await, IMemoryCache, pagination; efficient LINQ, avoid N+1

## SQLite Aggregation Functions (CRITICAL)

**SQLite does NOT support EF Core's `Min()`/`Max()` aggregate functions in Select projections.** Using them causes `SQLite Error 1: 'no such function: ef_min'`.

**BAD - Will fail on SQLite:**
```csharp
.Select(x => new Dto {
    MinPrice = x.Products.Min(p => p.Price),  // FAILS!
    MaxPrice = x.Products.Max(p => p.Price),  // FAILS!
})
```

**GOOD - Calculate in memory:**
```csharp
// 1. Query with placeholders
var items = await query.Select(x => new Dto {
    ProductRootId = x.ProductRootId,
    MinPrice = 0,  // Placeholder
    MaxPrice = 0,  // Placeholder
}).ToListAsync();

// 2. Load only needed columns for aggregation
var prices = await db.Products
    .Where(p => productRootIds.Contains(p.ProductRootId))
    .Select(p => new { p.ProductRootId, p.Price })
    .ToListAsync();

// 3. Aggregate in memory
var priceDict = prices.GroupBy(p => p.ProductRootId)
    .ToDictionary(g => g.Key, g => (Min: g.Min(p => p.Price), Max: g.Max(p => p.Price)));

// 4. Update items
foreach (var item in items)
    if (priceDict.TryGetValue(item.ProductRootId, out var range))
    { item.MinPrice = range.Min; item.MaxPrice = range.Max; }
```

Reference: `ProductService.QueryProductListAsync()` for full pattern.

## Conventions
- DI throughout, custom mapping (no AutoMapper), IHostedService for background
- Controllers never access DbContext - inject services; design reusable methods with flexible parameters

```csharp
// BAD: Controller(MerchelloDbContext db) → db.Invoices.ToListAsync()
// GOOD: Controller(IInvoiceService svc) → svc.GetAllAsync()
// BAD: GetUnpaidInvoicesForCustomerCreatedThisMonth(id)
// GOOD: QueryAsync(InvoiceQueryParameters p)
```

## Dependency Injection
**Always use proper constructor injection.** Never use workarounds like:
- Setter injection (`SetXxx()` methods called after construction)
- Factory delegates in DI registration that configure services post-construction
- Startup handlers that wire services together

If a service in `Merchello.Core` needs a dependency from `Merchello` (web project), define the interface in Core:
```csharp
// In Merchello.Core/Feature/Services/Interfaces/
public interface IMyRenderer { Task<string> RenderAsync(...); }

// In Merchello/Feature/Services/
public class MyRazorRenderer : IMyRenderer { ... }

// In Merchello/Startup.cs
services.AddScoped<IMyRenderer, MyRazorRenderer>();
services.AddScoped<IMyService, MyService>(); // MyService injects IMyRenderer
```

This keeps dependency direction correct (web → core) while allowing Core services to use web implementations.

## Migrations/Testing/Security/Blazor
- Migrations: `scripts/add-migration.ps1` only
- Testing: xUnit, Moq, **Shouldly** (`result.ShouldBe(expected)`); integration tests; run after changes
- Security: Auth middleware, JWT, HTTPS, CORS, .NET Identity
- Blazor: Avoid EF in components. If needed: `using var scope = ServiceProvider.CreateScope();`

# Order Grouping

Pluggable grouping of basket items (warehouse, vendor, delivery date). Default: warehouse-based; custom: implement `IOrderGroupingStrategy`. Config: `"Merchello:OrderGroupingStrategy": "vendor-grouping"`. Notifications: `OrderGroupingModifyingNotification`, `OrderGroupingNotification`

**Context**: `Basket`, `BillingAddress`, `ShippingAddress`, `CustomerId`, `CustomerEmail`, `Products`, `Warehouses`, `SelectedShippingOptions`, `ExtendedData`

**OrderGroup**: `GroupId`, `GroupName`, `WarehouseId`, `LineItems`, `AvailableShippingOptions`, `SelectedShippingOptionId`, `Metadata`

```csharp
public class VendorStrategy(ILogger<VendorStrategy> log) : IOrderGroupingStrategy
{
    public OrderGroupingStrategyMetadata Metadata => new("vendor-grouping", "Vendor Grouping", "Groups by vendor");
    public async Task<OrderGroupingResult> GroupItemsAsync(OrderGroupingContext ctx, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(ctx.ShippingAddress.CountryCode)) return OrderGroupingResult.Fail("Country required");
        var groups = ctx.Basket.LineItems.Where(li => li.ProductId.HasValue)
            .GroupBy(li => ctx.Products.GetValueOrDefault(li.ProductId!.Value)?.ProductRoot?.ExtendedData?.GetValueOrDefault("VendorId")?.ToString() ?? "default")
            .Select(g => new OrderGroup { GroupId = GenerateId(g.Key), GroupName = $"Vendor: {g.Key}",
                LineItems = g.Select(li => new ShippingLineItem { LineItemId = li.Id, Name = li.Name ?? "", Sku = li.Sku, Quantity = li.Quantity, Amount = li.Amount }).ToList() }).ToList();
        return new OrderGroupingResult { Groups = groups, SubTotal = ctx.Basket.SubTotal, Tax = ctx.Basket.Tax, Total = ctx.Basket.Total };
    }
}
```

# TypeScript/Frontend

Umbraco v17 backoffice: TypeScript, Vite, Lit

## Principles
- Small components, pure functions, no classes except Lit
- TypeScript strict, no `any`, RORO pattern, `interface` > `type`, explicit returns
- Booleans: `isLoading`, `hasError`, `shouldFetch`

## Naming & Formatting
API types mirror C#; Modal: `{Feature}ModalData`/`ModalValue`; Events: `{Event}Detail`

Never `.toFixed()`: `import { formatCurrency, formatNumber } from "@shared/utils/formatting.js";`

## Backend-Frontend
Backend = source of truth. Use `statusLabel`/`statusCssClass` from DTOs. Never hardcode enum mappings. Preview APIs for calculations. Frontend validation = UX only.

## Lit
One element/file, PascalCase class, kebab-case tag with prefix; `@property`/`@state` with types; `render()`: error/loading first; custom events with typed `detail`, no `innerHTML`

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

## Standards
- Guard clauses first, typed errors (`code`, `message`), clear error/empty/loading states
- Security: No secrets in client, typed services, sanitize input
- Testing: Unit test pure functions, component tests for critical UI
- A11y: Keyboard accessible, ARIA, color contrast
- Performance: Minimal reactive state, lazy loading, small bundles

## Research
Anytime you are dealing with an external / third party API / SDK or nuget plugin, always search online to make sure you are using the latest version and have read the latest docs / implementation guides so nothing is missed.
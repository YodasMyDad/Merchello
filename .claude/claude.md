## Overview
Enterprise ecommerce NuGet. **Ethos: making enterprise ecommerce simple.**
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

## Conventions
- DI throughout, custom mapping (no AutoMapper), IHostedService for background
- Controllers never access DbContext - inject services; design reusable methods with flexible parameters

```csharp
// BAD: Controller(MerchelloDbContext db) → db.Invoices.ToListAsync()
// GOOD: Controller(IInvoiceService svc) → svc.GetAllAsync()
// BAD: GetUnpaidInvoicesForCustomerCreatedThisMonth(id)
// GOOD: QueryAsync(InvoiceQueryParameters p)
```

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
## Overview
Enterprise ecommerce NuGet.
Ethos: making enterprise ecommerce simple; avoid over-engineered code.

- Modular: use `ExtensionManager` for plugins (for example `ShippingProviders`)
- Services: feature-grouped, DI-based, parameter models
- Factories: all domain entities (`Invoice`, `Order`, `Product`, `Customer`, `Basket`, `Payment`, `Shipment`, etc.) must be created via factories; never `new Entity {}` directly; factories are singletons

Before any change, never assume docs are correct. Trace the actual code first.

## Feature Structure
```text
Feature/
  Dtos/        # API transfer objects
  Extensions/  # C# extension methods
  Factories/
  Mapping/
  Models/      # Internal domain
  Services/
    Parameters/
    Interfaces/
```
Create folders only when needed.

## Product Options
`ProductOption.IsVariant` (default `true`) controls variant generation.
If `false`, treat as add-on and use `PriceAdjustment`, `CostAdjustment`, and `SkuSuffix`.

# .NET

## Style
- Simple, readable, terse; no placeholders/TODOs; readability over performance
- Idiomatic C# (`LINQ`, lambdas, `var` when obvious)
- Prefer C# 13+ features (`record`, pattern matching, null-coalescing, primary constructors, `[]` over `new List<T>()`)

## Naming
PascalCase: classes/methods/public members.  
camelCase: locals.  
_camelCase: private fields.  
UPPERCASE: constants.  
`I*`: interfaces.

## Cross-Boundary Type Consistency (CRITICAL)
When a type appears across C# DTOs, internal models, TypeScript interfaces, and JavaScript objects, field names must be identical except casing (`PascalCase` in C#, `camelCase` in JSON/JS).

Rules:
1. Backend is source of truth: C# DTO names are canonical.
2. One concept = one name; no synonyms (`city` vs `townCity`, `state` vs `countyState`, `address1` vs `addressOne`).
3. Map external naming differences at integration boundaries immediately.
4. Before adding shared types, search for existing equivalents.

Canonical examples:
- Address (`Merchello.Core/Locality/Dtos/AddressDto.cs`):
  - `AddressOne`/`addressOne` (not `address1`, `line1`, `street`)
  - `TownCity`/`townCity` (not `city`, `locality`)
  - `CountyState`/`countyState` (not `state`, `county`, `province`)
  - `RegionCode`/`regionCode` (not `stateCode`, `provinceCode`)
- Region (`Merchello.Core/Shared/Dtos/RegionDto.cs`):
  - `RegionCode`/`regionCode` (not `code`, `stateCode`)

## DTOs
`Dtos/` are API types (suffix `Dto`). `Models/` are internal types (no `Dto` suffix).

Naming patterns:
- Read: `{Entity}Dto`
- List: `{Entity}ListItemDto`
- Detail: `{Entity}DetailDto`
- Create/Update: `Create{Entity}Dto`, `Update{Entity}Dto`
- Edit: `Edit{Entity}Dto`
- Result: `{Action}ResultDto`
- Page/Query: `{Entity}PageDto`, `{Entity}QueryDto`
- Toggle: `Toggle{Entity}Dto`
- Add/Remove: `Add{Item}Dto`, `Remove{Item}Dto`
- Delete/Export: `Delete{Entity}Dto`, `Export{Entity}Dto`
- Internal operation contracts: `{Entity}Request`, `{Entity}Result`

Semantics:
- Add/Remove: collection operations
- Create/Delete: entity lifecycle operations

## File Organization
One type per file. Applies to every `class`, `record`, `enum`, and `interface` in `Dtos`, `Models`, `Parameters`, `Interfaces`, `Services`, etc.
File name must match type name (for example `DiscountOrderBy.cs` for `enum DiscountOrderBy`).
Never place multiple public types in one file.

## Errors
- Never rename existing functions without permission
- Use exceptions for exceptional cases
- Use Data Annotations and/or FluentValidation
- Return correct HTTP status codes

## API / Performance
Use RESTful APIs with attribute routing and versioning.
Use `async/await`, `IMemoryCache`, pagination, efficient LINQ, and avoid N+1 queries.

## SQLite Aggregation Functions (CRITICAL)
SQLite does not support EF Core aggregate translation for `Min()`/`Max()` in projection `Select`, causing:
`SQLite Error 1: 'no such function: ef_min'`.

- BAD: `query.Select(x => new Dto { MinPrice = x.Products.Min(...), MaxPrice = x.Products.Max(...) })`
- GOOD pattern:
  1. Select placeholders (`MinPrice = 0`, `MaxPrice = 0`)
  2. Load only needed columns (`ProductRootId`, `Price`)
  3. Aggregate in memory (`GroupBy` + `Min`/`Max`)
  4. Patch DTO values from dictionary lookup

Reference full implementation: `ProductService.QueryProductListAsync()`.

## JsonElement Unwrapping (CRITICAL)
`Dictionary<string, object>` values (for example `ExtendedData`) deserialize with `System.Text.Json` as `JsonElement`, not CLR primitives.
Calling `Convert.ToDecimal()`, `Convert.ToBoolean()`, etc. directly on those objects throws `InvalidCastException` because `JsonElement` is not `IConvertible`.

Always call `UnwrapJsonElement()` first (reference: `Merchello.Core/Shared/Extensions/JsonElementExtensions.cs`).

- BAD:
  - `Convert.ToDecimal(extendedData["Price"])`
  - `Convert.ToBoolean(extendedData["IsEligible"])`
- GOOD:
  - `Convert.ToDecimal(extendedData["Price"].UnwrapJsonElement())`
  - `Convert.ToBoolean(extendedData["IsEligible"].UnwrapJsonElement())`
  - `extendedData["Name"].UnwrapJsonElement()?.ToString()`

Scope note:
- Required for dictionary/deserialized `object?` values.
- Not needed for controlled `JsonElement` from `JsonDocument.Parse()` + `TryGetProperty()`.

## EFCoreScope Transactions (CRITICAL)
Never call `db.Database.BeginTransactionAsync()` inside `scope.ExecuteWithContextAsync()`.
`EFCoreScope` already owns a transaction, and explicit nesting causes:
`InvalidOperationException: The connection is already in a transaction`.

- BAD: create explicit transaction in `ExecuteWithContextAsync`
- GOOD: let scope transaction run implicitly, call `db.SaveChangesAsync(ct)`, then `scope.Complete()`

For concurrency, rely on unique constraints plus `DbUpdateException` handling.

## Conventions
- Use DI everywhere
- Use custom mapping (no AutoMapper)
- Use `IHostedService` for background tasks
- Controllers must not access `DbContext`; inject services
- Prefer reusable parameterized query methods over narrowly named methods

Examples:
- BAD: `Controller(MerchelloDbContext db) -> db.Invoices.ToListAsync()`
- GOOD: `Controller(IInvoiceService svc) -> svc.GetAllAsync()`
- BAD: `GetUnpaidInvoicesForCustomerCreatedThisMonth(id)`
- GOOD: `QueryAsync(InvoiceQueryParameters p)`

## CrudResult<T>
Use `CrudResult<T>` for operations that can fail.
Use `AddErrorMessage()` / `AddWarningMessage()` for user-facing failures.

- Query/read methods: return entities directly
- CRUD/mutation methods: return `CrudResult<T>`

References: `Merchello.Core/Shared/Models/CrudResult.cs`, `CrudResultExtensions.cs`.

## Single Source of Truth
Business calculations are centralized. Never duplicate calculation logic; call designated services/providers:

- Tax rates: `TaxService.GetApplicableRateAsync()`
- Payment status: `PaymentService.CalculatePaymentStatus()`
- Basket totals: `CheckoutService.CalculateBasketAsync()`
- Stock: `InventoryService` (`reserve` / `allocate` / `release`)
- Shipping tax: `ITaxCalculationService.CalculateProportionalShippingTax()` (never reimplement)

## Multi-Currency (CRITICAL)
- Basket stores amounts in store currency; amounts do not change when display currency changes
- Display: `amount * rate` via `StorefrontDisplayContext`
- Checkout/payment (invoice creation): `amount / rate`
- Rate locks at invoice creation via `PricingExchangeRate`
- Never use display amounts for payment calculations

## Dependency Injection
Always use constructor injection. Never use:
- Setter injection (`SetXxx()` after construction)
- DI factory delegates that perform post-construction configuration
- Startup handlers that wire service dependencies after creation

If `Merchello.Core` needs a dependency implemented in `Merchello`:
1. Define interface in Core (for example `Merchello.Core/Feature/Services/Interfaces/IMyRenderer`)
2. Implement in web project (for example `Merchello/Feature/Services/MyRazorRenderer`)
3. Register in startup (`services.AddScoped<IMyRenderer, MyRazorRenderer>();`)
4. Inject interface in Core service (`MyService` injects `IMyRenderer`)

This preserves dependency direction (web -> core) while allowing Core logic to call web implementations.

## Notification Handler Priorities
`[NotificationHandlerPriority(N)]`: lower number runs first; default is `1000`.

| Range | Purpose |
| --- | --- |
| 100-500 | Validation/blocking |
| 1000 | Default business logic |
| 1500-1900 | Post-processing (digital delivery, fulfilment, post-purchase) |
| 2000 | Internal audit/timeline |
| 2100 | Email dispatch |
| 2200 | Webhook dispatch |
| 3000 | Protocol-specific |

Handlers should be fault-tolerant: catch/log exceptions; do not rethrow.

## Migrations / Testing / Security / Blazor
- Migrations: use only `scripts/add-migration.ps1`
- Testing: `xUnit`, `Moq`, `Shouldly` (for example `result.ShouldBe(expected)`), include integration tests, run tests after changes
- Security: auth middleware, JWT, HTTPS, CORS, .NET Identity
- Blazor: avoid EF in components; if unavoidable use `using var scope = ServiceProvider.CreateScope();`

# Order Grouping
Order grouping is pluggable (for example by warehouse, vendor, delivery date).

- Default strategy: warehouse-based
- Custom strategy: implement `IOrderGroupingStrategy`
- Config key: `"Merchello:OrderGroupingStrategy": "vendor-grouping"`
- Notifications: `OrderGroupingModifyingNotification`, `OrderGroupingNotification`

`OrderGroupingContext` contains:
`Basket`, `BillingAddress`, `ShippingAddress`, `CustomerId`, `CustomerEmail`, `Products`, `Warehouses`, `SelectedShippingOptions`, `ExtendedData`.

`OrderGroup` contains:
`GroupId`, `GroupName`, `WarehouseId`, `LineItems`, `AvailableShippingOptions`, `SelectedShippingOptionId`, `Metadata`.

Vendor-grouping implementation requirements (from example strategy):
- Metadata id/name/description should identify vendor grouping
- If `ShippingAddress.CountryCode` is empty, fail (`OrderGroupingResult.Fail("Country required")`)
- Group line items by vendor id from product root extended data (`VendorId`, default `"default"`)
- Build `ShippingLineItem` entries from basket line items (`LineItemId`, `Name`, `Sku`, `Quantity`, `Amount`)
- Return grouped result with basket `SubTotal`, `Tax`, and `Total`

# TypeScript / Frontend
Target stack: Umbraco v17 backoffice with TypeScript, Vite, and Lit.

## Principles
- Small components, pure functions, no classes except Lit components
- TypeScript strict mode; no `any`; use RORO; prefer `interface` over `type`; explicit return types
- Boolean naming: `isLoading`, `hasError`, `shouldFetch`

## Naming & Formatting
- API types must mirror C# names
- Modal naming: `{Feature}ModalData`, `{Feature}ModalValue`
- Event detail naming: `{Event}Detail`
- Never use `.toFixed()`; use:
  `import { formatCurrency, formatNumber } from "@shared/utils/formatting.js";`

## Backend-Frontend Contract
- Backend is source of truth
- Use DTO-provided `statusLabel` and `statusCssClass`
- Never hardcode enum mappings
- Use preview APIs for calculations
- Frontend validation is UX-only, not authority

## Lit
- One element per file
- PascalCase class names
- Kebab-case tags with project prefix
- Typed `@property` and `@state`
- In `render()`, handle error/loading states first
- Emit custom events with typed `detail`
- Never use `innerHTML`

## Structure
```text
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
- Guard clauses first
- Typed errors include `code` and `message`
- Explicit error/empty/loading UI states
- Security: no client secrets, typed service layers, sanitize input
- Testing: unit-test pure functions; add component tests for critical UI
- A11y: keyboard support, ARIA, color contrast
- Performance: minimal reactive state, lazy loading, small bundles

## Research
When using external/third-party APIs, SDKs, or NuGet plugins, always check latest online versions and docs/implementation guides before finalizing.

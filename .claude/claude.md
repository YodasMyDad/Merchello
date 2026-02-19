# Merchello Agent Guide

## Mission
Enterprise ecommerce NuGet for Umbraco v17+.
Ethos: making enterprise ecommerce simple; avoid over-engineered code.

## Read First (CRITICAL)
1. Trace real code paths before changing anything.
- Do not assume docs are correct.
- Start from controller to service to factory/provider, then modify.

2. Preserve architecture boundaries.
- Controllers: HTTP orchestration only; no business logic; no `DbContext`.
- Services: business logic and data access.
- Factories: all domain object creation; never `new Entity {}` directly.

3. Keep single source of truth calculations centralized.
- Never duplicate business math in controllers, handlers, views, or JS.
- Must call designated services/providers:

| Concern | Source of truth |
| --- | --- |
| Basket totals | `CheckoutService.CalculateBasketAsync()` |
| Tax rate lookup | `TaxService.GetApplicableRateAsync()` |
| Shipping tax proportional math | `ITaxCalculationService.CalculateProportionalShippingTax()` |
| Payment status | `PaymentService.CalculatePaymentStatus()` |
| Inventory reserve/allocate/release/reverse | `InventoryService` |
| Shipping base cost fallback chain | `ShippingCostResolver.ResolveBaseCost()` |
| Shipping quote retrieval | `IShippingQuoteService.GetQuotes*()` |

4. Multi-currency invariants are strict.
- Basket amounts are stored in store currency and do not change on display currency changes.
- Display uses multiply: `amount * rate`.
- Checkout/payment (invoice creation) uses divide: `amount / rate`.
- Lock rate at invoice creation (`PricingExchangeRate`, source, timestamp).
- Never charge from display amounts.

5. Shipping tax invariants are strict.
- Never hardcode shipping tax rates.
- Always query provider:
  - `ITaxProviderManager.IsShippingTaxedForLocationAsync()`
  - `ITaxProviderManager.GetShippingTaxRateForLocationAsync()`
- Return semantics:
  - `0m`: explicitly not taxed
  - `> 0`: use specific rate
  - `null`: use proportional shipping tax calculation
- Required entry points: checkout calculation, storefront display context, invoice shipping tax recalculation.

6. Persistence/serialization pitfalls to avoid.
- SQLite EF projection aggregates: do not use `Min()`/`Max()` in projected SQL for SQLite. Use in-memory group aggregation pattern.
- `Dictionary<string, object>` + `System.Text.Json`: always call `UnwrapJsonElement()` before `Convert.*`.
- `EFCoreScope`: do not begin nested transactions inside `ExecuteWithContextAsync()`.

7. Idempotency and dedupe must remain intact.
- Payments: preserve `Payment.IdempotencyKey` and `Payment.WebhookEventId` behavior.
- Fulfilment/webhook paths: use duplicate webhook checks where provided.

8. Notification ordering matters.
- Lower priority runs first.
- Keep fault tolerance in handlers: catch/log and do not rethrow.

## Core Architecture
### Layering Rules
- Modular plugin system via `ExtensionManager`.
- Service methods should use parameter models (RORO style).
- Return `CrudResult<T>` for mutations that can fail.
- Use `async/await` and propagate `CancellationToken`.
- Add DB tables only when necessary.

### Feature Structure
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

## Domain Invariants
### Products and Variants
- `ProductOption.IsVariant` defaults to `true` and controls variant generation.
- If `IsVariant = false`, treat as add-on using `PriceAdjustment`, `CostAdjustment`, `SkuSuffix`.
- Maintain `ProductRoot` vs `Product` responsibilities:
  - `ProductRoot`: parent-level config (`TaxGroupId`, option definitions, default package config).
  - `Product`: variant-level SKU, price, stock, package overrides.

### Inventory and Warehouses
- Stock lifecycle for tracked inventory:
  - Reserve: `Reserved += qty`
  - Allocate (ship): `Stock -= qty`, `Reserved -= qty`
  - Cancel/release: `Reserved -= qty`
- Warehouse selection order:
  1. `ProductRootWarehouse` priority
  2. service region eligibility
  3. stock availability (`Stock - Reserved >= qty`)

### Checkout, Shipping, and Grouping
- `IShippingService.GetShippingOptionsForBasket()` is the basket-level entry point and uses order grouping internally.
- Shipping cost priority: `State -> Country -> Universal(*) -> FixedCost`.
- Flat-rate and dynamic providers are different:
  - Flat-rate uses configured destination/fixed costs.
  - Dynamic providers (`UsesLiveRates = true`) fetch rates live and must not rely on fixed-cost entries.
- Dynamic provider visibility depends on provider enablement and warehouse config.
- `ProductRoot.AllowExternalCarrierShipping = false` must block dynamic carrier options for those products.

Shipping selection key contract (must remain stable):
- Flat-rate: `so:{guid}`
- Dynamic: `dyn:{provider}:{serviceCode}`
- Parse this contract into order fields (`ShippingProviderKey`, `ShippingServiceCode`, `ShippingServiceName`) and honor quoted rates from checkout session.

### Tax
Product tax:
- Preserve `TaxGroupId` from product root through line items into orders/invoice tax payloads.
- External tax providers depend on this mapping for tax code selection.

Shipping tax:
- Use provider decision and rate methods, then fallback to proportional when needed.
- Do not reimplement proportional formulas outside `ITaxCalculationService`.

### Payments
- Payment lifecycle logic belongs in `IPaymentService`.
- Keep payment status calculation centralized (`CalculatePaymentStatus`).
- Keep saved-payment flows ownership checks and idempotency behavior.

### Digital Products
Store digital settings in `ProductRoot.ExtendedData` constant keys (do not add model properties):
- `DigitalDeliveryMethod`
- `DigitalFileIds`
- `DownloadLinkExpiryDays`
- `MaxDownloadsPerLink`

Rules:
- Digital products require customer account (no guest checkout).
- Digital products cannot use variant options (`IsVariant = false` add-ons only).
- Digital-only invoices auto-complete after successful payment.
- Download security: HMAC-signed tokens, constant-time validation, rate limiting.

### Fulfilment vs Shipping
- Shipping providers determine customer-facing rates/options.
- Fulfilment providers handle 3PL submission/status/inventory sync.
- Keep this separation; do not mix carrier quoting logic into fulfilment services.
- Preserve shipping service category inference and mapping priority:
  1. category mapping
  2. default provider method
  3. raw shipping service code fallback

### Order Source Tracking
- Preserve `Invoice.Source` semantics for analytics/audit (`web`, `ucp`, `api`, `pos`, `draft`).

## Provider Architecture
### Extension Manager
Use `ExtensionManager` discovery for:
- Shipping providers
- Payment providers
- Tax providers
- Order grouping strategies
- Commerce protocol adapters
- Fulfilment providers

### Order Grouping
Order grouping is pluggable (`IOrderGroupingStrategy`):
- Default strategy: warehouse-based
- Config key: `"Merchello:OrderGroupingStrategy": "vendor-grouping"`
- Notifications: `OrderGroupingModifyingNotification`, `OrderGroupingNotification`

`OrderGroupingContext` includes:
`Basket`, `BillingAddress`, `ShippingAddress`, `CustomerId`, `CustomerEmail`, `Products`, `Warehouses`, `SelectedShippingOptions`, `ExtendedData`.

`OrderGroup` includes:
`GroupId`, `GroupName`, `WarehouseId`, `LineItems`, `AvailableShippingOptions`, `SelectedShippingOptionId`, `Metadata`.

Vendor-grouping requirements:
- Metadata should identify vendor grouping.
- If `ShippingAddress.CountryCode` is empty, fail (`OrderGroupingResult.Fail("Country required")`).
- Group by vendor id from product root extended data (`VendorId`, default `"default"`).
- Build `ShippingLineItem` from basket lines (`LineItemId`, `Name`, `Sku`, `Quantity`, `Amount`).
- Return grouped result with basket `SubTotal`, `Tax`, and `Total`.

## Integrations and Operations
### Notifications
`[NotificationHandlerPriority(N)]` lower runs first; default `1000`.

| Range | Purpose |
| --- | --- |
| 100-500 | Validation/blocking |
| 1000 | Default business logic |
| 1500-1900 | Post-processing (digital delivery, fulfilment, post-purchase) |
| 2000 | Internal audit/timeline |
| 2100 | Email dispatch |
| 2200 | Webhook dispatch |
| 3000 | Protocol-specific |

### Email and Webhooks
- Both queue through outbound delivery processing and retry jobs.
- Keep topic registries mapping notifications to outbound messages.
- Preserve auth/signing behaviors and retry semantics.

### Background Jobs
Important jobs include discount status transitions, outbound delivery retries, abandoned checkout detection/recovery, invoice reminders, fulfilment polling/retry/cleanup, exchange rate refresh, and upsell status transitions.

### Caching
Use `ICacheService`:
- `GetOrCreateAsync(key, factory, ttl, tags)`
- `RemoveAsync(key)`
- `RemoveByTagAsync(tag)`

Common prefixes:
- `merchello:exchange-rates:*`
- `merchello:locality:*`
- `merchello:shipping:*`

## .NET Standards
### Style
- Simple, readable, terse; no placeholders/TODOs.
- Prefer readability over micro-optimizations.
- Idiomatic C# (`LINQ`, lambdas, `var` when obvious).
- Prefer C# 13+ features (`record`, pattern matching, null-coalescing, primary constructors, `[]` over `new List<T>()`).

### Naming
PascalCase: classes/methods/public members.  
camelCase: locals.  
_camelCase: private fields.  
UPPERCASE: constants.  
`I*`: interfaces.

### Cross-Boundary Type Consistency (CRITICAL)
When a type appears across C# DTOs, internal models, TypeScript interfaces, and JavaScript objects, field names must be identical except casing (`PascalCase` in C#, `camelCase` in JSON/JS).

Rules:
1. Backend is source of truth: C# DTO names are canonical.
2. One concept equals one name; no synonyms (`city` vs `townCity`, `state` vs `countyState`, `address1` vs `addressOne`).
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

### DTOs
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

### File Organization
One type per file. Applies to every `class`, `record`, `enum`, and `interface` in `Dtos`, `Models`, `Parameters`, `Interfaces`, `Services`, and related folders.
File name must match type name (`DiscountOrderBy.cs` for `enum DiscountOrderBy`).
Never place multiple public types in one file.

### Errors and Validation
- Never rename existing functions without permission.
- Use exceptions only for exceptional cases.
- Use Data Annotations and/or FluentValidation.
- Return correct HTTP status codes.

### API and Performance
- Use RESTful APIs with attribute routing and versioning.
- Use `async/await`, `IMemoryCache`, pagination, efficient LINQ, and avoid N+1 queries.

### SQLite Aggregation Functions (CRITICAL)
SQLite does not support EF Core aggregate translation for `Min()`/`Max()` in projection `Select`, causing:
`SQLite Error 1: 'no such function: ef_min'`.

- BAD: `query.Select(x => new Dto { MinPrice = x.Products.Min(...), MaxPrice = x.Products.Max(...) })`
- GOOD pattern:
  1. Select placeholders (`MinPrice = 0`, `MaxPrice = 0`)
  2. Load only needed columns (`ProductRootId`, `Price`)
  3. Aggregate in memory (`GroupBy` + `Min`/`Max`)
  4. Patch DTO values from dictionary lookup

Reference implementation: `ProductService.QueryProductListAsync()`.

### JsonElement Unwrapping (CRITICAL)
`Dictionary<string, object>` values (for example `ExtendedData`) deserialize with `System.Text.Json` as `JsonElement`, not CLR primitives.
Calling `Convert.ToDecimal()`, `Convert.ToBoolean()`, etc. directly on those values throws `InvalidCastException` because `JsonElement` is not `IConvertible`.

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

### EFCoreScope Transactions (CRITICAL)
Never call `db.Database.BeginTransactionAsync()` inside `scope.ExecuteWithContextAsync()`.
`EFCoreScope` already owns a transaction, and explicit nesting causes:
`InvalidOperationException: The connection is already in a transaction`.

- BAD: explicit transaction in `ExecuteWithContextAsync`
- GOOD: rely on scope transaction, call `db.SaveChangesAsync(ct)`, then `scope.Complete()`

For concurrency, rely on unique constraints plus `DbUpdateException` handling.

### Dependency Injection
Always use constructor injection. Never use:
- Setter injection (`SetXxx()` after construction)
- DI factory delegates that perform post-construction configuration
- Startup handlers that wire dependencies after creation

If `Merchello.Core` needs a dependency implemented in `Merchello`:
1. Define interface in Core (`Merchello.Core/.../Interfaces/IMyRenderer`)
2. Implement in web project (`Merchello/.../MyRazorRenderer`)
3. Register in startup (`services.AddScoped<IMyRenderer, MyRazorRenderer>();`)
4. Inject the interface in Core service

This preserves dependency direction (web -> core).

### Conventions
- Use DI everywhere.
- Use custom mapping (no AutoMapper).
- Use `IHostedService` for background tasks.
- Controllers must not access `DbContext`; inject services.
- Prefer reusable parameterized query methods over narrowly named methods.

Examples:
- BAD: `Controller(MerchelloDbContext db) -> db.Invoices.ToListAsync()`
- GOOD: `Controller(IInvoiceService svc) -> svc.GetAllAsync()`
- BAD: `GetUnpaidInvoicesForCustomerCreatedThisMonth(id)`
- GOOD: `QueryAsync(InvoiceQueryParameters p)`

### CrudResult<T>
Use `CrudResult<T>` for operations that can fail.
Use `AddErrorMessage()` / `AddWarningMessage()` for user-facing failures.

- Query/read methods: return entities directly.
- CRUD/mutation methods: return `CrudResult<T>`.

References: `Merchello.Core/Shared/Models/CrudResult.cs`, `CrudResultExtensions.cs`.

## Migrations, Testing, Security, Blazor
- Migrations: use only `scripts/add-migration.ps1`.
- Testing: `xUnit`, `Moq`, `Shouldly` (`result.ShouldBe(expected)`), include integration tests, run tests after changes.
- Security: auth middleware, JWT, HTTPS, CORS, .NET Identity.
- Blazor: avoid EF in components; if unavoidable use `using var scope = ServiceProvider.CreateScope();`.

## TypeScript and Frontend
Target stack: Umbraco v17 backoffice with TypeScript, Vite, and Lit.

### Principles
- Small components, pure functions; no classes except Lit components.
- TypeScript strict mode; no `any`; use RORO; prefer `interface` over `type`; explicit return types.
- Boolean naming: `isLoading`, `hasError`, `shouldFetch`.

### Naming and Formatting
- API types must mirror C# names.
- Modal naming: `{Feature}ModalData`, `{Feature}ModalValue`.
- Event detail naming: `{Event}Detail`.
- Never use `.toFixed()`; use:
  `import { formatCurrency, formatNumber } from "@shared/utils/formatting.js";`

### Backend-Frontend Contract
- Backend is source of truth.
- Use DTO-provided `statusLabel` and `statusCssClass`.
- Never hardcode enum mappings.
- Use preview APIs for calculations.
- Frontend validation is UX-only, not authority.

### Lit
- One element per file.
- PascalCase class names.
- Kebab-case tags with project prefix.
- Typed `@property` and `@state`.
- In `render()`, handle error/loading states first.
- Emit custom events with typed `detail`.
- Never use `innerHTML`.

### Structure
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

### Checkout Asset Pipeline (CRITICAL)
- Checkout runtime script URLs are stable and must remain `/App_Plugins/Merchello/js/checkout/*`.
- Source of truth for checkout runtime JS is `src/Merchello/Client/public/js/checkout/*`.
- Source of truth for plugin logo/image assets is `src/Merchello/Client/public/img/*`.
- Build output is `src/Merchello/wwwroot/App_Plugins/Merchello/*` (Vite copies `Client/public` via `publicDir`).
- Backoffice code uses `src/Merchello/Client/src/*` and is bundled/hashed by Vite into `wwwroot/App_Plugins/Merchello/`.
- Do not point checkout views/provider adapter URLs at hashed bundle filenames.
- If checkout JS or image paths 404, verify files exist in `Client/public` first, then rebuild frontend assets.

### Standards
- Guard clauses first.
- Typed errors include `code` and `message`.
- Explicit error/empty/loading UI states.
- Security: no client secrets, typed service layers, sanitize input.
- Testing: unit-test pure functions; add component tests for critical UI.
- Accessibility: keyboard support, ARIA, color contrast.
- Performance: minimal reactive state, lazy loading, small bundles.

## Research Rule
When using external APIs, SDKs, or NuGet plugins, verify latest official docs/versions before finalizing implementation details.

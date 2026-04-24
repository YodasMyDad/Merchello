# Project Structure and Architecture

Merchello is split into clearly separated projects, each with a specific responsibility. Understanding this structure helps you know where to find things and where your own code should go.

## The Three Projects

### Merchello.Core

This is the heart of the system. It contains all business logic, domain models, services, data access, and provider architecture. It has **no dependency on Umbraco's web layer** -- it only depends on Umbraco's core EF libraries. Browse at [src/Merchello.Core](../../../src/Merchello.Core).

```
Merchello.Core/
  Accounting/          # Invoices, credit notes, statements
  Actions/             # Business action abstractions (extension points)
  AddressLookup/       # Postcode/address lookup providers
  Auditing/            # Audit trail for entity changes
  Caching/             # ICacheService, cache refreshers
  Checkout/            # Basket, checkout session, strategies, abandoned cart
  Customers/           # Customer records, segments, criteria
  Data/                # MerchelloDbContext, migrations, DbSeeder
  DigitalProducts/     # Download tokens, HMAC signing, delivery
  Discounts/           # Discount engine, calculators (including BuyXGetY)
  Email/               # Email settings, token resolver, templates, MJML
  ExchangeRates/       # Currency conversion providers (Frankfurter, etc.)
  Fulfilment/          # 3PL order submission, status sync, Supplier Direct
  HealthChecks/        # Built-in store diagnostics
  Locality/            # Countries, regions, address models, locality catalog
  Notifications/       # Notification pipeline and handlers
  Payments/            # Payment lifecycle, provider contracts, idempotency
  ProductFeeds/        # Google Shopping feed generation
  ProductSync/         # CSV import/export (Shopify, etc.)
  Products/            # Products, variants, collections, inventory, filters
  Protocols/           # UCP (Universal Commerce Protocol) for AI agents
  Reporting/           # Sales reports, KPIs, best sellers
  Settings/            # Persisted store settings (overrides appsettings)
  Shared/              # CrudResult, extensions, helpers
  Shipping/            # Shipping providers, quotes, cost resolution
  Storefront/          # StorefrontContextService, display context
  Suppliers/           # Supplier/vendor management
  Tax/                 # Tax providers, orchestration, calculation services
  Upsells/             # Cross-sells, order bumps, post-purchase
  Warehouses/          # Warehouse management, stock, provider config
  Webhooks/            # Outbound webhook delivery, topic registry
```

Two sibling projects, [Merchello.Core.SqlServer](../../../src/Merchello.Core.SqlServer) and [Merchello.Core.Sqlite](../../../src/Merchello.Core.Sqlite), provide provider-specific EF Core migrations. Both ship as transitive dependencies of the `Umbraco.Community.Merchello` NuGet package.

Each feature area follows a consistent internal structure:

```
Feature/
  Dtos/           # API transfer objects (suffix Dto)
  Extensions/     # C# extension methods
  Factories/      # Object creation (never new Entity{} directly)
  Mapping/        # Custom mapping (no AutoMapper)
  Models/         # Internal domain models
  Services/
    Parameters/   # Method parameter models
    Interfaces/   # Service contracts
```

> **Note:** Not every feature has every folder. Folders are created only when needed.

### Merchello (Web Project)

This is the Umbraco integration layer. It handles HTTP concerns, routing, backoffice UI, and view rendering. It depends on `Merchello.Core` but never the other way around. Browse at [src/Merchello](../../../src/Merchello).

```
Merchello/
  Client/              # TypeScript/Vite/Lit source for backoffice UI
  Composers/           # Umbraco composer registrations
  Controllers/         # API controllers (backoffice + storefront)
  Email/               # Email rendering (Razor-based)
  Extensions/          # View/media helper extensions
  Factories/           # MerchelloPublishedElementFactory
  Filters/             # Action filters (e.g. CheckoutExceptionFilter)
  Middleware/          # Request pipeline middleware (MerchelloStartupFilter)
  Models/              # View models (MerchelloProductViewModel, MerchelloSettings binding)
  Presence/            # Real-time editing presence (SignalR)
  Routing/             # ProductContentFinder, CheckoutContentFinder
  Services/            # Web-layer services (storefront DTO mappers)
  Startup.cs           # DI registration (AddMerchello extension)
  Tax/                 # Tax provider resolution for views
  wwwroot/             # Static assets (built into App_Plugins/Merchello)
```

The single `AddMerchello()` extension in [Startup.cs](../../../src/Merchello/Startup.cs) registers every service, factory, background job, notification handler, and content finder. You rarely need additional wiring in your own `Program.cs`.

### Merchello.Site (Example Store)

This is the starter site -- a working example that shows how to build a storefront using Merchello. When you use the .NET template (via [Merchello.StarterSite.Template](../../../src/Merchello.StarterSite.Template)) you get a copy of this project with `Merchello` referenced as a NuGet package instead of a project reference. Browse at [src/Merchello.Site](../../../src/Merchello.Site).

```
Merchello.Site/
  Basket/
    Controllers/       # BasketController
    Models/            # Basket (published content model partial)
  Category/
    Controllers/       # CategoryController
    Models/            # Category, CategoryPageViewModel
  Home/
    Controllers/       # HomeController
    Models/            # Home (published content model with BestSellers)
  Shared/
    Controllers/       # BaseController (shared base)
  Views/
    Home.cshtml        # Homepage with best sellers
    Basket.cshtml      # Basket/cart page
    Category.cshtml    # Category listing page
    Products/
      Default.cshtml   # Product detail view (via ProductContentFinder)
      Partials/        # _ProductGallery, _ProductPurchasePanel, _ProductUpsells
    Website.cshtml     # Layout template
  uSync/v17/           # Exported content, data types, document types
  Program.cs           # Application entry point
  appsettings.json     # Full configuration example
```

The starter template lives at [src/Merchello.StarterSite.Template](../../../src/Merchello.StarterSite.Template) and is regenerated from `Merchello.Site` by [scripts/prepare-starter-template.ps1](../../../scripts/prepare-starter-template.ps1) for each release.

## Architecture Principles

### Layering Rules

Merchello follows strict layering to keep things maintainable:

- **Controllers** handle HTTP orchestration only. No business logic, no `DbContext` access. They inject services and delegate work.
- **Services** contain business logic and data access. They use `EFCoreScope` for transactions and return `CrudResult<T>` for mutations.
- **Factories** handle all domain object creation. You should never see `new ProductRoot {}` in a service or controller -- that is a factory's job.

```
Controller  -->  Service  -->  Factory/Provider
   (HTTP)       (Business)     (Object creation)
```

### Dependency Direction

Dependencies always flow inward:

```
Merchello.Site  -->  Merchello  -->  Merchello.Core
   (Your site)     (Web/Umbraco)    (Business logic)
```

`Merchello.Core` never references `Merchello` or your site project. When Core needs something implemented in the web layer (like Razor rendering), it defines an interface in Core and the implementation lives in the web project.

### Service Pattern

Services follow a consistent pattern using parameter models (RORO -- Receive an Object, Return an Object):

```csharp
// Query methods return entities directly
var products = await productService.QueryProducts(new ProductQueryParameters
{
    CollectionIds = [collectionId],
    MinPrice = 10m,
    OrderBy = ProductOrderBy.PriceAsc,
    CurrentPage = 1,
    AmountPerPage = 12
});

// Mutation methods return CrudResult<T>
var result = await productService.CreateProductRoot(createDto, cancellationToken);
if (!result.Success)
{
    // Handle errors via result.Messages
}
```

### Provider Architecture

Merchello uses a pluggable provider system managed by `ExtensionManager`. This allows you to swap or extend:

- **Shipping providers** (flat rate, UPS, FedEx)
- **Payment providers** (Stripe, PayPal, Amazon Pay, Braintree, WorldPay)
- **Tax providers** (manual rates, Avalara AvaTax)
- **Fulfilment providers** (ShipBob, Supplier Direct)
- **Exchange rate providers** (Frankfurter, custom)
- **Order grouping strategies** (warehouse-based, vendor-based)

## Where Your Code Goes

When building your own store with Merchello, your code lives in your site project (equivalent to `Merchello.Site`). You will typically create:

- **Controllers** that inherit from Umbraco's `SurfaceController` or `RenderController` and inject Merchello services
- **Views** in `~/Views/Products/` for product rendering
- **View models** if you need to extend `MerchelloProductViewModel`
- **Notification handlers** if you need to react to events (order created, payment received, etc.)

You should never need to modify `Merchello.Core` or `Merchello` directly -- everything is designed to be extended from your own project.

## Next Steps

- [Starter Site Walkthrough](./starter-site-walkthrough.md) -- detailed tour of the example controllers and views
- [Configuration Reference](./configuration-reference.md) -- all available settings
- [Products Overview](../products/products-overview.md) -- understand the product data model

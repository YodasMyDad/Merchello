# Project Structure and Architecture

Merchello is split into clearly separated projects, each with a specific responsibility. Understanding this structure helps you know where to find things and where your own code should go.

## The Three Projects

### Merchello.Core

This is the heart of the system. It contains all business logic, domain models, services, data access, and provider architecture. It has **no dependency on Umbraco's web layer** -- it only depends on Umbraco's core EF libraries.

```
Merchello.Core/
  Accounting/          # Invoices, credit notes, statements
  Actions/             # Business action abstractions
  AddressLookup/       # Postcode/address lookup providers
  Caching/             # ICacheService, cache refreshers
  Checkout/            # Basket, checkout session, strategies
  Customers/           # Customer records, segments
  Data/                # DbContext, migrations, seeding
  Discounts/           # Discount engine, calculators
  DigitalProducts/     # Download tokens, HMAC signing
  Email/               # Email settings, templates
  ExchangeRates/       # Currency conversion providers
  Fulfilment/          # 3PL order submission, status sync
  Locality/            # Countries, regions, address models
  Notifications/       # Notification pipeline and handlers
  Payments/            # Payment lifecycle, provider contracts
  ProductFeeds/        # Google Shopping feed generation
  Products/            # Products, variants, collections, inventory
  Protocols/           # UCP (Universal Commerce Protocol)
  Reporting/           # Sales reports, KPIs
  Settings/            # Persisted store settings
  Shared/              # CrudResult, extensions, helpers
  Shipping/            # Shipping providers, quotes
  Suppliers/           # Supplier/vendor management
  Tax/                 # Tax providers, calculation services
  Upsells/             # Cross-sells, order bumps
  Warehouses/          # Warehouse management, stock
  Webhooks/            # Outbound webhook delivery
```

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

This is the Umbraco integration layer. It handles HTTP concerns, routing, backoffice UI, and view rendering. It depends on `Merchello.Core` but never the other way around.

```
Merchello/
  Client/              # TypeScript/Vite source for backoffice UI
  Composers/           # Umbraco composer registrations
  Controllers/         # API controllers (backoffice + storefront)
  Email/               # Email rendering (Razor-based)
  Extensions/          # View/media helper extensions
  Factories/           # MerchelloPublishedElementFactory
  Filters/             # Action filters, middleware
  Middleware/           # Request pipeline middleware
  Models/              # View models (MerchelloProductViewModel, etc.)
  Routing/             # ProductContentFinder, CheckoutContentFinder
  Services/            # Web-layer services (storefront mappers)
  Startup.cs           # DI registration (AddMerchello)
  Tax/                 # Tax provider resolution for views
  wwwroot/             # Static assets (App_Plugins/Merchello)
```

### Merchello.Site (Example Store)

This is the starter site -- a working example that shows how to build a storefront using Merchello. When you use the .NET template, you get a copy of this project. It demonstrates rendering products, categories, a basket page, and integrating with the Merchello checkout.

```
Merchello.Site/
  Basket/
    Controllers/       # BasketController
  Category/
    Controllers/       # CategoryController
    Models/            # CategoryPageViewModel
  Home/
    Controllers/       # HomeController
  Shared/
    Controllers/       # BaseController (shared base)
  Views/
    Home.cshtml        # Homepage with best sellers
    Basket.cshtml      # Basket/cart page
    Category.cshtml    # Category listing page
    Products/
      Default.cshtml   # Product detail view
      Partials/        # Gallery, purchase panel, upsells
    Website.cshtml     # Layout template
  Program.cs           # Application entry point
  appsettings.json     # Full configuration example
```

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

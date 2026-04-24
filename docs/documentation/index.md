# Merchello Documentation

**Enterprise ecommerce for Umbraco v17+** — a full-featured online store with an integrated Shopify-style checkout, backoffice management UI, and a pluggable provider architecture.

---

## Quick Start

Merchello ships as two NuGet packages on [nuget.org](https://www.nuget.org/packages/Umbraco.Community.Merchello). Both are released in lockstep -- the latest version is shown on the [GitHub releases page](https://github.com/YodasMyDad/Merchello/releases). Replace `<version>` below (e.g. `1.0.0-beta.7`).

```bash
# Option 1: Use the .NET template (scaffolds a complete starter site)
dotnet new install Umbraco.Community.Merchello.StarterSite::<version>
dotnet new merchello-starter -n MyStore

# Option 2: Add to an existing Umbraco v17+ project
dotnet add package Umbraco.Community.Merchello --version <version>
```

Then add Merchello to your Umbraco builder (see [Program.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Site/Program.cs)):

```csharp
builder.CreateUmbracoBuilder()
    .AddBackOffice()
    .AddWebsite()
    .AddComposers()
    .AddMerchello()  // <-- Add this
    .Build();
```

Configure your store in `appsettings.json` (see the [starter site appsettings.json](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Site/appsettings.json) for a full example):

```json
{
  "Merchello": {
    "InstallSeedData": true,
    "StoreCurrencyCode": "USD",
    "DefaultShippingCountry": "US"
  }
}
```

New to Merchello? Follow this path:

1. [Installation](getting-started/installation.md) -- get the package installed and booted
2. [Starter Site Walkthrough](getting-started/starter-site-walkthrough.md) -- a tour of the example store (homepage, category, basket, product detail)
3. [Project Structure](getting-started/project-structure.md) -- understand where code lives and how layers interact
4. [Configuration Reference](getting-started/configuration-reference.md) -- every `appsettings.json` key with defaults
5. [Seed Data](getting-started/seed-data.md) -- populate a dev database with realistic products, customers, and orders

---

## Documentation Sections

### Building Your Store

| Section | What you'll learn |
| --- | --- |
| [Getting Started](getting-started/installation.md) | Installation, project structure, configuration, and a guided tour of the starter site |
| [Store Configuration](store-configuration/store-settings.md) | Currency, countries, warehouses, and supplier setup |
| [Products and Catalogue](products/products-overview.md) | Products, variants, options, digital products, collections, filters, and inventory |
| [Storefront](storefront/storefront-context.md) | Display context, price rendering, and stock availability |
| [Shopping and Cart](shopping/basket-service.md) | Basket operations and the basket REST API |
| [Checkout](checkout/checkout-flow.md) | The full checkout flow, sessions, addresses, shipping, discounts, and express checkout |

### Payments, Shipping, and Tax

| Section | What you'll learn |
| --- | --- |
| [Payments](payments/payment-system-overview.md) | Payment providers (Stripe, PayPal, Amazon Pay, Braintree, WorldPay), vaulting, refunds, payment links |
| [Shipping](shipping/shipping-overview.md) | Flat-rate and dynamic (UPS/FedEx) shipping, order grouping, packages, shipments |
| [Tax](tax/tax-overview.md) | Tax groups, rates, shipping tax, and providers (Manual, Avalara) |

### Customers, Orders, and Marketing

| Section | What you'll learn |
| --- | --- |
| [Customers](customers/customer-management.md) | Customer management and automated segments |
| [Orders and Invoices](orders/orders-overview.md) | Order lifecycle, invoice editing, manual orders, statements |
| [Discounts](discounts/discounts-overview.md) | Percentage, fixed, buy-X-get-Y, free shipping, segment targeting |
| [Upsells](upsells/upsells-overview.md) | Post-purchase offers and one-click upsells |
| [Multi-Currency](multi-currency/multi-currency-overview.md) | Exchange rates, currency display, and rate locking |

### Integrations and Operations

| Section | What you'll learn |
| --- | --- |
| [Fulfilment](fulfilment/fulfilment-overview.md) | 3PL fulfilment with ShipBob and Supplier Direct |
| [Email](email/email-overview.md) | MJML templates, token replacement, and delivery |
| [Webhooks](webhooks/webhooks-overview.md) | Outbound webhooks with HMAC signing |
| [Notifications](notifications/notification-system.md) | Internal event system and custom handlers |
| [Product Feeds](product-feeds/product-feeds-overview.md) | Google Shopping feed generation |
| [UCP](ucp/ucp-overview.md) | Universal Commerce Protocol for AI agents |
| [Reporting](reporting/reporting-overview.md) | Sales analytics, KPIs, and CSV export |

### Extending Merchello

| Section | What you'll learn |
| --- | --- |
| [Extension Manager](extending/extension-manager.md) | How the plugin system discovers providers |
| [Custom Providers](extending/creating-payment-providers.md) | Build your own payment, shipping, tax, fulfilment, and exchange rate providers |
| [Notification Handlers](extending/notification-handlers.md) | React to events with custom handlers |
| [Order Grouping](extending/custom-order-grouping.md) | Custom basket-splitting strategies |

### Reference

| Section | What you'll learn |
| --- | --- |
| [API Reference](api/storefront-api.md) | Storefront, checkout, admin, webhook, and download APIs |
| [Advanced Topics](advanced/factories.md) | Factories, CrudResult, entity relationships, actions system, EF Core notes |
| [Background Jobs](background-jobs/background-jobs.md) | All background jobs and their configuration |
| [Caching](caching/caching.md) | Cache service API and invalidation |
| [Health Checks](health-checks/health-checks.md) | Built-in store diagnostics |
| [OpenAPI / Swagger](api/openapi-swagger.md) | Swagger UI and API documentation |

---

## Links

- [GitHub Repository](https://github.com/YodasMyDad/Merchello)
- [NuGet Package](https://www.nuget.org/packages/Umbraco.Community.Merchello)
- [Report an Issue](https://github.com/YodasMyDad/Merchello/issues)

# Merchello

[![NuGet](https://img.shields.io/nuget/vpre/Umbraco.Community.Merchello?color=0273B3)](https://www.nuget.org/packages/Umbraco.Community.Merchello)
[![Downloads](https://img.shields.io/nuget/dt/Umbraco.Community.Merchello?color=cc9900)](https://www.nuget.org/packages/Umbraco.Community.Merchello/)

**Enterprise ecommerce for Umbraco v17+.** a full-featured online store with an optional integrated Shopify-style checkout, backoffice management UI, and a pluggable provider architecture.

I will try and keep breaking changes minimal, but be aware that until this is out of Beta, there could be breaking changes.

## Example Starter Site

The `Merchello.Site` project in this repo is a working example store (It's what is used for the .NET Template below) that allows you to see how to render products, collections/categories, add to cart etc... Right now, not much work has been put into this, it's just a bare bones example that needs improving a lot.

Just create a fork of this project, and run the app (Make sure you have cleared any database connection strings) and install Umbraco, you can then install the content using usync, **just watch the video below** - Same applies to the .NET template

[![Starter Site YouTube Video](https://img.youtube.com/vi/jRSXaJpZekE/0.jpg)](https://www.youtube.com/watch?v=jRSXaJpZekE)

## .NET Template (Starter Site)

To get the starter site (With Merchello already installed) use the .NET Template

```bash
dotnet new install Umbraco.Community.Merchello.StarterSite@1.0.0-beta.4
dotnet new merchello-starter -n MyStore
```

This will scaffold a project named MyStore.Web (it appends .Web automatically). You can override the project name with --projectName:

```bash
dotnet new merchello-starter -n MyStore --projectName MyCustomProjectName
```

## Nuget (Existing site or from scratch)

Or if you want to use the Nuget package directly and build out your own front end, just install the latest version of Umbraco and then install the Merchello nuget package. **Remember, you are only installing Merchello and not the Starter Site (Front end)**.

```bash
dotnet add package Umbraco.Community.Merchello@1.0.0-beta.4
```

Then you need to add merchello to the Umbraco builder

```csharp
builder.CreateUmbracoBuilder()
    .AddBackOffice()
    .AddWebsite()
    .AddComposers()
      .AddMerchello()  <<====
    .Build();
```

It's important you set some starting settings in your appSettings to your preference before starting up the project, these are the defaults (If you don't want seed data set that to false)

```json
{
  "Merchello": {
    "InstallSeedData": true,
    "StoreCurrencyCode": "USD",
    "DefaultShippingCountry": "US"
  }
}
```

By all means change the StoreCurrencyCode (ISO 4217 code) and DefaultShippingCountry (ISO 3166-1 alpha-2 country code) to whatever you want.

Once installed, you need to enable the Merchello section in the Admin users group (Like you would do any new section).

### Seed Data

If you left InstallSeedData = true and now click on the main Merchello root branch in the tree, you should see an Install Seed data panel. If you click install, that will install a lot of test data, it can take some time, the panel will disappear when it's done.

### uSync

Don't forget to watch the video about using uSync to get the starter content and doc types setup and running.

## Documentation

Full developer documentation is available at **[YodasMyDad.github.io/Merchello](https://YodasMyDad.github.io/Merchello/)**.

The docs cover everything from installation and building your first store through to creating custom payment, shipping, tax, and fulfilment providers. Highlights include:

- [Installation Guide](https://YodasMyDad.github.io/Merchello/getting-started/installation/) — get up and running in minutes
- [Starter Site Walkthrough](https://YodasMyDad.github.io/Merchello/getting-started/starter-site-walkthrough/) — guided tour of the example store
- [Configuration Reference](https://YodasMyDad.github.io/Merchello/getting-started/configuration-reference/) — every `appsettings.json` option explained
- [Checkout Flow](https://YodasMyDad.github.io/Merchello/checkout/checkout-flow/) — the complete checkout pipeline
- [Extending Merchello](https://YodasMyDad.github.io/Merchello/extending/extension-manager/) — build custom providers and plugins
- [API Reference](https://YodasMyDad.github.io/Merchello/api/storefront-api/) — storefront, checkout, admin, and webhook APIs

## What's Included

### Checkout & Storefront

- **Integrated checkout** — single-page, Shopify-style flow: addresses, shipping, discounts, payment, guest/registered customers, express checkout
- **Post-purchase upsells** — rules engine with one-click add-to-order via saved payment method
- **Abandoned cart recovery** — automatic detection, email sequences, basket restoration
- **Product routing** — products render at root-level URLs without Umbraco content nodes
- **Address lookup** — pluggable providers (GetAddress.io built-in) for postcode lookup and autocomplete

### Payments

- **Stripe** — cards, Apple Pay, Google Pay
- **PayPal** — PayPal Checkout
- **Amazon Pay** — Amazon Checkout
- **Braintree** — cards, PayPal, Venmo
- **WorldPay** — cards, Apple Pay
- **Manual** — offline / test payments
- Saved payment methods (vaulting), payment links, and invoice reminders

### Shipping & Fulfilment

- **Flat rate** — configurable cost/weight tiers per warehouse
- **UPS / FedEx** — live carrier rates
- **ShipBob** — 3PL fulfilment: order submission, webhook status updates, product and inventory sync
- **Supplier Direct** — CSV-based fulfilment via SFTP/FTP/email to supplier warehouses
- Multi-warehouse inventory with priority-based warehouse selection, region restrictions, and pluggable order grouping strategies

### Tax

- **Manual** — tax groups with country/state rate overrides
- **Avalara AvaTax** — real-time tax calculation
- Proportional shipping tax calculation for EU/UK VAT compliance

### Products & Catalogue

- Variants and non-variant add-ons with price/cost/SKU adjustments
- **Digital products** — secure HMAC-signed downloads, expiry, download limits
- **Product feeds** — Google Shopping / product feed generation
- **Product import** — CSV import and sync

### Customers & Orders

- **Customer segments** — manual and automated (spend, order count, location, tags)
- **Discount engine** — percentage, fixed amount, buy X get Y, free shipping, segment targeting, usage limits
- **Supplier / vendor management** — supplier records with vendor-based order grouping

### Multi-Currency

- Live exchange rates (Frankfurter built-in, pluggable providers)
- Automatic country-to-currency mapping with rate locking at checkout

### UCP (Universal Commerce Protocol)

Expose your store to AI agents. [UCP](https://ucp.dev/) is an open standard co-developed by Google, Shopify, Stripe, Visa, Mastercard and 25+ partners that lets AI agents browse products, build carts, and complete checkout on behalf of users. Merchello implements UCP as a protocol adapter — discovery manifest, checkout sessions, discount and shipping extensions, signed order webhooks (ES256), and agent authentication.

### Backoffice & Operations

- **Reporting** — sales breakdown, best sellers, gross profit, dashboard KPIs, CSV export
- **Email system** — MJML templates, token replacement, configurable per notification topic
- **Webhooks** — outbound webhooks with HMAC signing, retry queue, 25+ event topics
- **Invoice reminders** — automated overdue invoice reminder sequences
- **Health checks** — built-in system health checks for store diagnostics
- **Order source tracking** — orders tagged by source (web, backoffice, API, POS, draft, UCP) for analytics

### Pluggable Architecture

Build your own providers for payments, shipping, tax, fulfilment, exchange rates, address lookup.

### Coming Soon

Database tables are in place for these features — implementation is in progress.

- **Gift cards** — purchasable and redeemable gift card support
- **Subscriptions** — recurring billing and subscription management
- **Returns / RMA** — return requests and returns management
- **Audit trail** — activity logging and timeline tracking
- **Customer account portal** — self-service order history, saved addresses, profile management
- **Product search** — pluggable search with faceted filtering and autocomplete
- **Rate limiting** — enterprise API protection with configurable policies

## License

See [LICENSE](../LICENSE) for details.

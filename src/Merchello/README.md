# Merchello

**Enterprise ecommerce for Umbraco v17+.** Umbraco's most full-featured ecommerce platform with integrated Shopify-style checkout. Covers simple ecommerce websites to very complex multi-warehouse, multi-currency sites. Easy to extend and very pluggable.

## Full Documentation

Full docs — installation, starter-site walkthrough, configuration reference, checkout flow, extending Merchello with custom providers, and the storefront/admin/webhook API references — live at [YodasMyDad.github.io/Merchello](https://YodasMyDad.github.io/Merchello/).

## Getting Started

There are two ways to install Merchello. Most people should start with Option 1 — pick whichever matches where you're coming from.

### Option 1 — Starter Site (recommended)

The fastest way to a complete, working store. Our .NET template scaffolds a brand-new Umbraco project with Merchello pre-installed **and** a full example storefront — product pages, categories, add-to-cart, checkout, order confirmations — the lot. It's a real end-to-end site you can run straight away, then restyle and rebuild around your brand.

If you're starting a new store from scratch, this is the path you want. It gets you from zero to "I can place an order" in a few minutes, and gives you a working reference for every part of the storefront as you customise.

```bash
dotnet new install Umbraco.Community.Merchello.StarterSite
dotnet new merchello-starter -n MyStore
```

This creates a new project called `MyStore.Web`. Run it, complete the Umbraco install, and you've got a working store. Full walkthrough (including the uSync setup video for the example content) at [YodasMyDad.github.io/Merchello](https://YodasMyDad.github.io/Merchello/).

Set your store defaults in `appsettings.json` before the first run:

```json
{
  "Merchello": {
    "InstallSeedData": true,
    "StoreCurrencyCode": "USD",
    "DefaultShippingCountry": "US"
  }
}
```

### Option 2 — Just the NuGet package

Use this if you're adding Merchello to an **existing** Umbraco site, or you're an experienced Umbraco dev who'd rather design the storefront yourself from the ground up.

This installs everything Merchello needs behind the scenes, the backoffice section, admin APIs, checkout APIs, providers, database, but **does not give you a storefront**. There are no product pages, no cart UI out of the box (Checkout is still included, but can be disabled). You'll build those yourself in Razor (or whatever frontend you prefer) against Merchello's APIs.

```bash
dotnet add package Umbraco.Community.Merchello
```

Wire Merchello into the Umbraco builder:

```csharp
builder.CreateUmbracoBuilder()
    .AddBackOffice()
    .AddWebsite()
    .AddComposers()
      .AddMerchello()
    .Build();
```

Set your store defaults in `appsettings.json` before the first run:

```json
{
  "Merchello": {
    "InstallSeedData": true,
    "StoreCurrencyCode": "USD",
    "DefaultShippingCountry": "US"
  }
}
```

`StoreCurrencyCode` is an ISO 4217 code, `DefaultShippingCountry` is an ISO 3166-1 alpha-2 code. Change them to match your store.

Once the site starts up, enable the **Merchello** section on your Admin users group and you'll see it in the backoffice.

### Seed Data

`InstallSeedData` is optional. When it's on, Merchello populates the store with example products, categories, orders, and settings — something to click around and build against.

Turn it on if you're **starting a fresh store**, exploring the features for the first time, or testing things like checkout, shipping, or discounts without having to build a catalogue first. Leave it off (`"InstallSeedData": false`) if you're adding Merchello to an existing site with real data, or you want to start with an empty store.

When it's enabled, open the Merchello root branch in the tree after first login and click **Install Seed Data**. It takes a minute or two — the panel disappears when it's done.

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

MIT — see [LICENSE](https://github.com/YodasMyDad/Merchello/blob/main/LICENSE).

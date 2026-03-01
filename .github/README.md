# Merchello

[![NuGet](https://img.shields.io/nuget/vpre/Umbraco.Community.Merchello?color=0273B3)](https://www.nuget.org/packages/Umbraco.Community.Merchello)
[![Downloads](https://img.shields.io/nuget/dt/Umbraco.Community.Merchello?color=cc9900)](https://www.nuget.org/packages/Umbraco.Community.Merchello/)

**Enterprise ecommerce for Umbraco v17+.** A NuGet package that gives you a full-featured online store with an optional integrated Shopify-style checkout, backoffice management UI, and a pluggable provider architecture.

> **Status:** Alpha — actively developed, contributions and feedback welcome.

I will try and keep breaking changes minimal, but be aware that until this is out of Beta, there could be breaking changes. 

## Nuget Quick Start

If you want to use the Nuget package, just install the latest version of Umbraco and then install the Merchello nuget package

```bash
dotnet add package Umbraco.Community.Merchello
```

Add the following basic/minimum Merchello section to your appSettings

## appSettings

It's important you set some starting settings to your preference before installing, these are the defaults (If you don't want seed data set that to true)

```
  "Merchello": {
    "InstallSeedData": true,
    "StoreCurrencyCode": "USD",
    "DefaultShippingCountry": "US"
  }
```

By all means change the StoreCurrencyCode (ISO 4217 code) and DefaultShippingCountry (ISO 3166-1 alpha-2 country code) to whatever you want.

Once installed, you need to enable the Merchello section in the Admin users group (Like you would do any new section).

#### Seed Data

If you left InstallSeedData = true and now click on the main Merchello root branch in the tree, you should see an Install Seed data panel. If you click install, that will install a lot of test data, it can take some time, the panel will disappear when it's done.

## Example Site

The `Merchello.Site` project in this repo is a working example store, that allows you to see how to render products, collections/categories, add to cart etc... Right now, not much work has been put into this, it's just a bare bones example that needs improving.

Just create a fork of this project, and run the app and install Umbraco, you can then install the content using usync, just watch the video below

VIDEO HERE

## Docs

Sorry, not quite got there yet, but will try and get something up soon.

## What's Included

### Integrated Checkout

A single-page, Shopify-style checkout that ships with the package. Handles addresses, shipping selection, discount codes, payment, guest and registered customers, express checkout, and post-purchase upsells. Fully customisable via Razor views and a JavaScript API.

### Payment Providers

| Provider | Type |
|----------|------|
| **Stripe** | Cards, Apple Pay, Google Pay |
| **PayPal** | PayPal Checkout |
| **Amazon Pay** | Amazon Checkout |
| **Braintree** | Cards, PayPal, Venmo |
| **WorldPay** | Cards, Apple Pay |
| **Manual** | Offline / test payments |

Saved payment methods (vaulting) and payment links supported.

### Shipping & Fulfilment

| Provider | Description |
|----------|-------------|
| **Flat Rate** | Configurable cost/weight tiers per warehouse |
| **UPS** | Live carrier rates |
| **FedEx** | Live carrier rates |
| **ShipBob** | 3PL fulfilment integration |

Multi-warehouse inventory with priority-based warehouse selection and region restrictions.

### Tax

| Provider | Description |
|----------|-------------|
| **Manual** | Tax groups with country/state rate overrides |
| **Avalara AvaTax** | Real-time tax calculation |

Proportional shipping tax calculation for EU/UK VAT compliance.

### UCP (Universal Commerce Protocol)

Expose your store to AI agents. UCP is an [open standard](https://ucp.dev/) co-developed by Google, Shopify, Stripe, Visa, Mastercard and 25+ industry partners that lets AI agents (Google Gemini, ChatGPT, etc.) browse products, build carts, and complete checkout on behalf of users.

Merchello implements UCP as a protocol adapter on top of existing services — no separate storefront required.

| Feature | Details |
|---------|---------|
| **Discovery** | `/.well-known/ucp` manifest with capabilities, payment handlers, and signing keys |
| **Checkout sessions** | Create, update, complete, and cancel via REST API |
| **Discounts & shipping** | Discount codes, multi-warehouse fulfilment groups, and live carrier rates exposed through UCP extensions |
| **Order webhooks** | Signed (ES256 / RFC 7797 detached JWT) order lifecycle events pushed to the agent's webhook URL |
| **Agent authentication** | `UCP-Agent` header parsing (RFC 8941), allowlist, capability negotiation (server-selects model) |
| **Source tracking** | UCP orders tagged on the invoice for analytics and reporting |

Spec version: `2026-01-11`. Configurable per-capability and per-extension in `appsettings.json`.

### Fulfilment Providers

A pluggable 3PL integration system for automating post-purchase logistics. Fulfilment providers handle order submission, real-time tracking, product catalog sync, and inventory management — all through a single `IFulfilmentProvider` interface.

| Provider | Description |
|----------|-------------|
| **ShipBob** | Full-featured 3PL — order submission, webhook status updates, polling, product sync, inventory sync |
| **Custom** | Implement `IFulfilmentProvider` (or extend `FulfilmentProviderBase`) and deploy — auto-discovered at runtime |

| Capability | Details |
|------------|---------|
| **Order submission** | Automatic on order creation with exponential-backoff retry (configurable attempts and delays) |
| **Status updates** | Real-time via provider webhooks (HMAC-validated, deduplicated) or periodic polling |
| **Product sync** | Push your catalogue to the 3PL |
| **Inventory sync** | Pull stock levels back (full replace or delta mode) |
| **Backoffice UI** | Configure providers, test connections, trigger syncs, and view sync/webhook logs |

Background jobs handle polling, retry, and log cleanup automatically.

### Everything Else

- **Multi-currency** — live exchange rates, automatic country-to-currency mapping, rate locking at checkout
- **Discount engine** — percentage, fixed amount, buy X get Y, free shipping, customer segment targeting, usage limits
- **Digital products** — secure HMAC-signed downloads, expiry, download limits
- **Abandoned cart recovery** — automatic detection, email sequences, basket restoration
- **Post-purchase upsells** — rules engine, one-click add-to-order via saved payment method
- **Email system** — MJML templates, token replacement, configurable per notification topic
- **Webhooks** — outbound webhooks with HMAC signing, retry queue, 25+ event topics
- **Customer segments** — manual and automated (spend, order count, location, tags)
- **Reporting** — sales breakdown, best sellers, gross profit, dashboard KPIs, CSV export
- **Product routing** — products render at root-level URLs without Umbraco content nodes

### Pluggable Architecture

Build your own providers for payments, shipping, tax, fulfilment, exchange rates, address lookup, and order grouping strategies. Register them via `ExtensionManager` — no core modifications needed.

## License

See [LICENSE](../LICENSE) for details.

# Merchello

[![NuGet](https://img.shields.io/nuget/vpre/Umbraco.Community.Merchello?color=0273B3)](https://www.nuget.org/packages/Umbraco.Community.Merchello)
[![Downloads](https://img.shields.io/nuget/dt/Umbraco.Community.Merchello?color=cc9900)](https://www.nuget.org/packages/Umbraco.Community.Merchello/)
[![GitHub license](https://img.shields.io/github/license/YodasMyDad/Merchello?color=8AB803)](../LICENSE)

**Enterprise ecommerce for Umbraco v17+.** A NuGet package that gives you a full-featured online store with an integrated Shopify-style checkout, backoffice management UI, and a pluggable provider architecture — out of the box.

> **Status:** Alpha — actively developed, contributions and feedback welcome.

## Quick Start

```bash
dotnet add package Umbraco.Community.Merchello
```

The `Merchello.Site` project in this repo is a working example store with seed data (products, collections, tax groups, shipping, discounts) so you can see everything running immediately. Clone it, run it, and start building.

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
- **UCP (Universal Commerce Protocol)** — expose your store to AI agents via a standardised protocol

### Pluggable Architecture

Build your own providers for payments, shipping, tax, fulfilment, exchange rates, address lookup, and order grouping strategies. Register them via `ExtensionManager` — no core modifications needed.

## Tech Stack

| Layer | Technology |
| ------- | ---------- |
| **Backend** | .NET 10, C# 13, EF Core 10 |
| **CMS** | Umbraco v17 |
| **Backoffice UI** | TypeScript, Lit, Vite |
| **Checkout UI** | Razor views, TailwindCSS, vanilla JS |
| **Databases** | SQL Server, SQLite |

## Contributing

Contributions are welcome. Please read the [Contributing Guidelines](CONTRIBUTING.md).

## License

See [LICENSE](../LICENSE) for details.

# Backoffice Overview

The Merchello backoffice is a management dashboard that sits inside the Umbraco v17 backoffice. It gives you everything you need to run your store: managing products, processing orders, configuring shipping and payments, and viewing sales analytics.

---

## Main Sections

### Products

Create and manage your product catalog. Define product roots with variants (size, color, etc.), set prices and stock levels, assign to collections, configure filters for storefront faceted search, and manage product images and content.

### Orders

View and manage orders with full details including line items, payments, and shipments. Edit orders (adjust quantities, apply manual discounts, update addresses), process cancellations and refunds, add internal notes, and export order data.

### Customers

Browse your customer base, view purchase history and account details. Manage customer segments for targeted marketing and track outstanding balances and statements.

### Discounts

Create discount codes with flexible rules -- percentage or fixed amount, minimum spend requirements, product/collection restrictions, usage limits, and scheduled activation dates. Monitor discount performance and usage.

### Upsells

Configure upsell rules for product pages, the basket, checkout, and post-purchase flows. Track conversion rates and revenue impact through the upsell analytics dashboard.

### Shipping

Set up your shipping configuration: warehouses and service regions, flat-rate shipping options with destination-based pricing, weight tiers, and postcode rules. Configure dynamic carrier providers (e.g., DHL, FedEx) for live rate quotes.

### Payments

Configure payment providers (Stripe, PayPal, Braintree, Worldpay, etc.), manage payment links, and process refunds. Test provider connections and simulate webhook events from the settings screen.

### Fulfillment

Connect to 3PL fulfillment providers for automated order submission and tracking. Monitor sync logs and test provider integrations.

### Tax

Configure tax groups with rates per country/region, or connect an external tax provider for automated tax calculations.

### Email

Set up transactional emails for order confirmations, shipping notifications, abandoned checkout recovery, payment receipts, and more. Customize templates, preview renders, and send test emails.

### Webhooks

Configure outbound webhooks to push store events (new orders, payments, shipments) to external systems. Monitor delivery history and retry failed deliveries.

### Analytics

View sales dashboards with revenue summaries, order trends, average order value, and breakdowns by country and product.

### Settings

Configure your store basics: currency, countries you ship to, exchange rate providers, address lookup providers, and product content settings.

---

## Additional Tools

- **Product Feeds** -- Generate and manage Google Shopping feeds.
- **Product Sync** -- Import and export products via CSV files.
- **Abandoned Checkouts** -- View abandoned checkout sessions and manage recovery emails.
- **Health Checks** -- Run diagnostic checks on your store configuration.
- **Seed Data** -- Install sample products and data for development.

---

## Extending the Backoffice

The Merchello backoffice is built with Umbraco's UI framework (TypeScript, Lit web components, and Vite). If you want to extend the backoffice with custom views, workspace actions, or new sections, refer to the Umbraco documentation on building backoffice extensions.

Merchello uses Umbraco's manifest system for registering UI components, so custom extensions follow the same patterns as any Umbraco v17 package.

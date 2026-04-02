# Admin API Overview

The Admin API powers the Merchello backoffice UI and provides full management capabilities for your store. All endpoints live under `/umbraco/api/v1` and require Umbraco backoffice authentication (cookie-based session).

> **For most site builders, you won't need these APIs directly.** They power the backoffice UI that you interact with through your browser. The information below is useful if you're building custom integrations, B2B portals, or automation scripts that need to manage store data programmatically.

---

## Browsing the API

The best way to explore the Admin API is through the interactive Swagger UI. Merchello registers an OpenAPI document that covers every admin endpoint with request/response schemas, parameter descriptions, and the ability to try requests live.

See the [OpenAPI / Swagger Documentation](openapi-swagger.md) for how to access it.

---

## API Areas

Here is a summary of what the Admin API covers:

### Products

Create, update, and delete product roots and variants. Manage product options, types, collections, filters, shipping exclusions, and content structure. Query products with filtering, sorting, and pagination.

### Orders

Query and view orders with full detail (line items, payments, shipments). Edit orders (adjust quantities, apply discounts, update addresses). Cancel orders, add notes, and export to CSV/Excel.

### Fulfillment

View fulfillment status summaries, release orders for fulfillment, create and update shipments, and track shipment status changes.

### Customers

Query and search customers. View customer details, outstanding balances, statements, and order history. Manage customer segments (create, edit, preview membership rules) and saved payment methods.

### Payments

View payments and payment status for invoices. Record manual payments, process refunds (with preview), and manage payment links.

### Shipping

Configure shipping providers (flat-rate and dynamic carriers). Create and manage shipping options with destination costs, weight tiers, and postcode rules. Manage shipping tax overrides.

### Tax

Manage tax groups and rates. Configure and test tax providers (built-in or external like Avalara).

### Payment Providers

Install, configure, enable/disable, and test payment providers. Simulate webhook events for testing.

### Fulfillment Providers

Install, configure, and test 3PL fulfillment providers. View sync logs and simulate webhook events.

### Warehouses and Suppliers

Manage warehouses, service regions, and product assignments. Configure suppliers and test FTP connections.

### Discounts

Create and manage discount codes with rules and conditions. Activate/deactivate discounts, generate codes, and view performance metrics.

### Upsells

Create upsell rules for pre-purchase and post-purchase flows. View performance dashboards and analytics.

### Reporting

Sales summaries, time-series data, average order value trends, and breakdowns by country/product.

### Email

Configure email templates for order confirmations, shipping notifications, abandoned checkout recovery, and more. Preview and send test emails. Manage email topics and template tokens.

### Webhooks

Configure outbound webhook subscriptions for store events. See the [Webhook API](webhook-api.md) for full details.

### Settings

Store configuration, countries and regions, exchange rate providers, address lookup providers, and product option settings.

### Other

- **Product Feeds** -- Google Shopping feed configuration and management.
- **Product Sync** -- Import/export products via CSV with validation and issue tracking.
- **Abandoned Checkouts** -- View abandoned checkouts, resend recovery emails, and view statistics.
- **Health Checks** -- Run diagnostic checks on your store configuration.
- **Seed Data** -- Install sample data for development and testing.
- **Bulk Actions** -- Execute and download results from bulk operations.

---

## Authentication

All Admin API requests require an active Umbraco backoffice session. Requests return `401` if not authenticated or `403` if the user lacks required permissions.

If you're building an external integration that needs to call these endpoints, you'll need to authenticate against the Umbraco backoffice first to obtain a session cookie.

---

## When to Use the Admin API

Most developers interact with Merchello through the backoffice UI or the [Storefront](storefront-api.md) and [Checkout](checkout-api.md) APIs. However, the Admin API is useful when you need to:

- **Build a custom B2B portal** that manages orders or customers outside the Umbraco backoffice
- **Automate store management** (e.g., bulk product updates, scheduled exports)
- **Integrate with external systems** (e.g., syncing orders to an ERP, pushing products from a PIM)
- **Build custom reporting dashboards** that pull sales and analytics data

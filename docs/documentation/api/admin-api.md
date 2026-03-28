# Backoffice Admin API Reference

The Admin API powers the Merchello backoffice UI and provides full management capabilities for your store. All endpoints require Umbraco backoffice authentication and the Content section access policy.

**Base URL:** `/umbraco/api/v1`

**Authentication:** Umbraco backoffice session (cookie-based). All endpoints return `401` if not authenticated or `403` if the user lacks the required permissions.

---

## Products

Manage product roots, variants, options, types, collections, and filters.

### Core CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products` | Query products with filtering, sorting, and pagination |
| GET | `/products/{id}` | Get a product root with full details |
| POST | `/products` | Create a new product root |
| PUT | `/products/{id}` | Update a product root |
| DELETE | `/products/{id}` | Delete a product root and all its variants |

### Variants

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products/{productRootId}/variants/{variantId}` | Get a specific variant |
| PUT | `/products/{productRootId}/variants/{variantId}` | Update a variant |
| PUT | `/products/{productRootId}/variants/{variantId}/set-default` | Set a variant as the default |
| POST | `/products/variants/by-ids` | Get multiple variants by their IDs |
| GET | `/products/variants/{variantId}/fulfillment-options` | Get fulfillment options for a variant |
| GET | `/products/variants/{variantId}/default-warehouse` | Get the default warehouse for a variant |
| POST | `/products/variants/{variantId}/preview-addon-price` | Preview add-on price calculations |

### Options

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/products/{productRootId}/options` | Update product options and choices |

### Shipping

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products/{productRootId}/shipping-options` | Get shipping options for a product |
| PUT | `/products/{productRootId}/shipping-exclusions` | Update shipping exclusions for a product root |
| PUT | `/products/{productRootId}/variants/{variantId}/shipping-exclusions` | Update shipping exclusions for a variant |

### Product Types

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products/types` | List all product types |
| POST | `/products/types` | Create a product type |
| PUT | `/products/types/{id}` | Update a product type |
| DELETE | `/products/types/{id}` | Delete a product type |

### Collections

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products/collections` | List all product collections |
| POST | `/products/collections` | Create a collection |
| PUT | `/products/collections/{id}` | Update a collection |
| DELETE | `/products/collections/{id}` | Delete a collection |

### Content Structure

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products/element-types` | Get available element types for product content |
| GET | `/products/element-type` | Get the current product element type |
| GET | `/products/views` | Get product view templates |
| GET | `/products/google-shopping-categories` | Search Google Shopping categories for product feeds |

### Filters

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/filter-groups` | List filter groups |
| GET | `/filter-groups/{id}` | Get a filter group |
| POST | `/filter-groups` | Create a filter group |
| PUT | `/filter-groups/{id}` | Update a filter group |
| DELETE | `/filter-groups/{id}` | Delete a filter group |
| PUT | `/filter-groups/reorder` | Reorder filter groups |
| POST | `/filter-groups/{groupId}/filters` | Create a filter in a group |
| GET | `/filters/{id}` | Get a filter |
| PUT | `/filters/{id}` | Update a filter |
| DELETE | `/filters/{id}` | Delete a filter |
| PUT | `/filter-groups/{groupId}/filters/reorder` | Reorder filters within a group |
| PUT | `/products/{productId}/filters` | Assign filters to a product |
| GET | `/products/{productId}/filters` | Get filters assigned to a product |

---

## Orders

Manage invoices, order editing, fulfillment, and shipments.

### Order Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/orders` | Query orders with filtering, sorting, and pagination |
| GET | `/orders/{id}` | Get full order details (invoice, line items, payments, shipments) |
| GET | `/orders/stats` | Get order statistics |
| GET | `/orders/dashboard-stats` | Get dashboard summary statistics |
| POST | `/orders/export` | Export orders to CSV/Excel |
| POST | `/orders/delete` | Bulk delete orders |
| POST | `/orders/{invoiceId}/cancel` | Cancel an order (releases inventory, processes refunds) |
| POST | `/orders/{invoiceId}/notes` | Add a note to an order |

### Order Editing

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/orders/{invoiceId}/edit` | Get order edit data |
| POST | `/orders/{invoiceId}/preview-edit` | Preview order edit changes (recalculated totals) |
| POST | `/orders/preview-discount` | Preview applying a discount to an order |
| PUT | `/orders/{invoiceId}/edit` | Save order edits |
| PUT | `/orders/{invoiceId}/billing-address` | Update billing address |
| PUT | `/orders/{invoiceId}/shipping-address` | Update shipping address |
| PUT | `/orders/{invoiceId}/purchase-order` | Update purchase order reference |

### Fulfillment

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/orders/{invoiceId}/fulfillment-summary` | Get fulfillment status summary |
| POST | `/orders/{orderId}/fulfillment/release` | Release order for fulfillment (Supplier Direct, explicit release) |
| POST | `/orders/{orderId}/shipments` | Create a shipment |
| PUT | `/shipments/{shipmentId}` | Update a shipment |
| PUT | `/shipments/{shipmentId}/status` | Update shipment status |

---

## Customers

### Core

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/customers` | Query customers with pagination |
| GET | `/customers/{id}` | Get customer details |
| PUT | `/customers/{id}` | Update customer |
| GET | `/customers/search` | Search customers by name/email |
| GET | `/customers/tags` | Get customer tags |
| GET | `/customers/segments` | Get customer segments |

### Financial

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/customers/{id}/outstanding` | Get outstanding balance summary |
| GET | `/customers/{id}/outstanding/invoices` | Get outstanding invoices |
| GET | `/customers/{id}/statement` | Get customer statement |

### Customer Segments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/customer-segments` | List segments |
| GET | `/customer-segments/{id}` | Get segment details |
| POST | `/customer-segments` | Create a segment |
| PUT | `/customer-segments/{id}` | Update a segment |
| DELETE | `/customer-segments/{id}` | Delete a segment |
| GET | `/customer-segments/{id}/members` | List segment members |
| POST | `/customer-segments/{id}/members` | Add members to segment |
| DELETE | `/customer-segments/{id}/members` | Remove members from segment |
| GET | `/customer-segments/{id}/preview` | Preview segment membership based on rules |
| GET | `/customer-segments/{id}/statistics` | Get segment statistics |

### Saved Payment Methods (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/customers/{customerId}/saved-payment-methods` | List customer's saved methods |
| GET | `/saved-payment-methods/{id}` | Get a saved method |
| DELETE | `/saved-payment-methods/{id}` | Delete a saved method |
| POST | `/saved-payment-methods/{id}/set-default` | Set default method |

---

## Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/invoices/{invoiceId}/payments` | List payments for an invoice |
| GET | `/payments/{id}` | Get payment details |
| GET | `/invoices/{invoiceId}/payment-status` | Get payment status for an invoice |
| GET | `/payments/manual/form-fields` | Get form fields for manual payment entry |
| POST | `/invoices/{invoiceId}/payments/manual` | Record a manual payment |
| POST | `/payments/{id}/refund` | Process a refund |
| POST | `/payments/{id}/preview-refund` | Preview a refund (calculate amounts before committing) |

### Payment Links

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payment-links` | Create a payment link for an invoice |
| GET | `/invoices/{invoiceId}/payment-link` | Get the active payment link for an invoice |
| POST | `/invoices/{invoiceId}/payment-link/deactivate` | Deactivate a payment link |
| GET | `/payment-links/providers` | Get providers that support payment links |

---

## Shipping

### Shipping Providers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/shipping-providers/available` | Get available (installable) shipping providers |
| GET | `/shipping-providers` | List configured shipping providers |
| GET | `/shipping-providers/{id}` | Get provider details |
| GET | `/shipping-providers/{key}/fields` | Get configuration fields for a provider |
| POST | `/shipping-providers` | Configure a new shipping provider |
| PUT | `/shipping-providers/{id}` | Update provider configuration |
| DELETE | `/shipping-providers/{id}` | Remove a provider |
| PUT | `/shipping-providers/{id}/toggle` | Enable/disable a provider |
| PUT | `/shipping-providers/reorder` | Reorder providers |
| GET | `/shipping-providers/{providerKey}/method-config` | Get method configuration for a provider |
| GET | `/shipping-providers/available-for-warehouse` | Get providers available for a warehouse |
| POST | `/shipping-providers/{id}/test` | Test a shipping provider |

### Shipping Options (Flat-Rate)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/shipping-options` | List shipping options |
| GET | `/shipping-options/{id}` | Get a shipping option |
| POST | `/shipping-options` | Create a shipping option |
| PUT | `/shipping-options/{id}` | Update a shipping option |
| DELETE | `/shipping-options/{id}` | Delete a shipping option |
| POST | `/shipping-options/{optionId}/costs` | Add cost entries |
| PUT | `/shipping-costs/{costId}` | Update a cost entry |
| DELETE | `/shipping-costs/{costId}` | Delete a cost entry |
| POST | `/shipping-options/{optionId}/weight-tiers` | Add weight tier |
| PUT | `/shipping-weight-tiers/{tierId}` | Update weight tier |
| DELETE | `/shipping-weight-tiers/{tierId}` | Delete weight tier |
| POST | `/shipping-options/{optionId}/postcode-rules` | Add postcode rule |
| PUT | `/shipping-postcode-rules/{ruleId}` | Update postcode rule |
| DELETE | `/shipping-postcode-rules/{ruleId}` | Delete postcode rule |

### Shipping Tax Overrides

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/shipping-tax-overrides` | List overrides |
| GET | `/shipping-tax-overrides/{id}` | Get an override |
| POST | `/shipping-tax-overrides` | Create an override |
| PUT | `/shipping-tax-overrides/{id}` | Update an override |
| DELETE | `/shipping-tax-overrides/{id}` | Delete an override |

---

## Tax

### Tax Groups and Rates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tax-groups` | List tax groups |
| GET | `/tax-groups/{id}` | Get a tax group |
| POST | `/tax-groups` | Create a tax group |
| PUT | `/tax-groups/{id}` | Update a tax group |
| DELETE | `/tax-groups/{id}` | Delete a tax group |
| POST | `/tax-groups/preview-custom-item` | Preview a custom tax item calculation |
| GET | `/tax-groups/{taxGroupId}/rates` | List tax rates for a group |
| POST | `/tax-groups/{taxGroupId}/rates` | Create a tax rate |
| PUT | `/tax-groups/rates/{rateId}` | Update a tax rate |
| DELETE | `/tax-groups/rates/{rateId}` | Delete a tax rate |

### Tax Providers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tax-providers` | List available tax providers |
| GET | `/tax-providers/active` | Get the active tax provider |
| GET | `/tax-providers/{alias}/fields` | Get configuration fields |
| PUT | `/tax-providers/{alias}/activate` | Activate a tax provider |
| PUT | `/tax-providers/{alias}/settings` | Update provider settings |
| POST | `/tax-providers/{alias}/test` | Test a tax provider |

---

## Payment Providers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/payment-providers/available` | Get available (installable) payment providers |
| GET | `/payment-providers` | List configured payment providers |
| GET | `/payment-providers/{id}` | Get provider details |
| GET | `/payment-providers/{alias}/fields` | Get configuration fields |
| POST | `/payment-providers` | Configure a new payment provider |
| PUT | `/payment-providers/{id}` | Update provider configuration |
| DELETE | `/payment-providers/{id}` | Remove a provider |
| PUT | `/payment-providers/{id}/toggle` | Enable/disable a provider |
| PUT | `/payment-providers/reorder` | Reorder providers |
| POST | `/payment-providers/{id}/test` | Test connection to provider |
| POST | `/payment-providers/{id}/test/process-payment` | Test a payment processing flow |
| GET | `/payment-providers/{id}/test/express-config` | Get express config for testing |
| GET | `/payment-providers/{id}/test/webhook-events` | List supported webhook events |
| POST | `/payment-providers/{id}/test/simulate-webhook` | Simulate a webhook event |

---

## Fulfillment Providers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/fulfilment-providers/available` | Get available fulfillment providers |
| GET | `/fulfilment-providers` | List configured providers |
| GET | `/fulfilment-providers/{id}` | Get provider details |
| GET | `/fulfilment-providers/{key}/fields` | Get configuration fields |
| POST | `/fulfilment-providers` | Configure a new provider |
| PUT | `/fulfilment-providers/{id}` | Update provider configuration |
| DELETE | `/fulfilment-providers/{id}` | Remove a provider |
| PUT | `/fulfilment-providers/{id}/toggle` | Enable/disable a provider |
| POST | `/fulfilment-providers/{id}/test` | Test connection |
| POST | `/fulfilment-providers/{id}/test/order` | Test order submission |
| GET | `/fulfilment-providers/{id}/test/webhook-events` | List supported webhook events |
| POST | `/fulfilment-providers/{id}/test/simulate-webhook` | Simulate a webhook event |
| GET | `/fulfilment-providers/options` | Get available fulfillment options |
| GET | `/fulfilment-providers/sync-logs` | Get sync logs |

---

## Warehouses and Suppliers

### Warehouses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/warehouses` | List warehouses |
| GET | `/warehouses/{id}` | Get warehouse details |
| POST | `/warehouses` | Create a warehouse |
| PUT | `/warehouses/{id}` | Update a warehouse |
| DELETE | `/warehouses/{id}` | Delete a warehouse |
| POST | `/warehouses/{warehouseId}/service-regions` | Add a service region |
| PUT | `/warehouses/{warehouseId}/service-regions/{regionId}` | Update a service region |
| DELETE | `/warehouses/{warehouseId}/service-regions/{regionId}` | Remove a service region |
| GET | `/warehouses/{warehouseId}/products` | List products assigned to warehouse |
| POST | `/warehouses/{warehouseId}/products` | Assign products to warehouse |
| POST | `/warehouses/{warehouseId}/products/remove` | Remove products from warehouse |
| GET | `/warehouses/{warehouseId}/available-destinations` | Get available shipping destinations |
| GET | `/warehouses/{warehouseId}/available-destinations/{countryCode}/regions` | Get regions for a destination |
| GET | `/warehouses/{warehouseId}/shipping-options` | Get shipping options for warehouse |

### Suppliers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/suppliers` | List suppliers |
| GET | `/suppliers/{id}` | Get supplier details |
| POST | `/suppliers` | Create a supplier |
| PUT | `/suppliers/{id}` | Update a supplier |
| DELETE | `/suppliers/{id}` | Delete a supplier |
| POST | `/suppliers/test-ftp-connection` | Test FTP connection for a supplier |

---

## Discounts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/discounts` | Query discounts with filtering and pagination |
| GET | `/discounts/{id}` | Get discount details |
| POST | `/discounts` | Create a discount |
| PUT | `/discounts/{id}` | Update a discount |
| DELETE | `/discounts/{id}` | Delete a discount |
| POST | `/discounts/{id}/activate` | Activate a discount |
| POST | `/discounts/{id}/deactivate` | Deactivate a discount |
| GET | `/discounts/generate-code` | Generate a unique discount code |
| GET | `/discounts/validate-code` | Check if a discount code is available |
| GET | `/discounts/{id}/performance` | Get discount performance metrics |
| GET | `/discounts/usage-report` | Get discount usage report |

---

## Upsells

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/upsells` | List upsell rules |
| GET | `/upsells/{id}` | Get upsell rule details |
| POST | `/upsells` | Create an upsell rule |
| PUT | `/upsells/{id}` | Update an upsell rule |
| DELETE | `/upsells/{id}` | Delete an upsell rule |
| POST | `/upsells/{id}/activate` | Activate an upsell rule |
| POST | `/upsells/{id}/deactivate` | Deactivate an upsell rule |
| GET | `/upsells/{id}/performance` | Get upsell performance metrics |
| GET | `/upsells/dashboard` | Get upsell dashboard data |
| GET | `/upsells/summary` | Get upsell summary statistics |

---

## Reporting

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reporting/summary` | Get sales summary (revenue, orders, AOV) |
| GET | `/reporting/sales-timeseries` | Get sales data over time |
| GET | `/reporting/aov-timeseries` | Get average order value over time |
| GET | `/reporting/breakdown` | Get sales breakdown (by country, product, etc.) |
| GET | `/reporting/sales-timeseries-with-totals` | Sales timeseries with summary totals |
| GET | `/reporting/aov-timeseries-with-totals` | AOV timeseries with summary totals |

---

## Email Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/emails` | List email configurations |
| GET | `/emails/{id}` | Get email configuration |
| POST | `/emails` | Create an email configuration |
| PUT | `/emails/{id}` | Update an email configuration |
| DELETE | `/emails/{id}` | Delete an email configuration |
| POST | `/emails/{id}/toggle` | Enable/disable an email |
| GET | `/emails/{id}/preview` | Preview email rendering |
| POST | `/emails/{id}/test` | Send a test email |
| GET | `/emails/topics` | Get available email topics |
| GET | `/emails/topics/categories` | Get topics grouped by category |
| GET | `/emails/topics/{topic}/tokens` | Get available template tokens for a topic |
| GET | `/emails/templates` | List email templates |
| GET | `/emails/templates/exists` | Check if a template exists |
| GET | `/emails/attachments` | List available email attachments |
| GET | `/emails/topics/{topic}/attachments` | Get attachments for a topic |

---

## Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | List notification configurations |

---

## Abandoned Checkouts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/abandoned-checkouts` | Query abandoned checkouts |
| GET | `/abandoned-checkouts/{id}` | Get abandoned checkout details |
| GET | `/abandoned-checkouts/stats` | Get abandoned checkout statistics |
| POST | `/abandoned-checkouts/{id}/resend-email` | Resend recovery email |
| POST | `/abandoned-checkouts/{id}/regenerate-link` | Regenerate recovery link |

---

## Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/settings` | Get store settings |
| GET | `/settings/store-configuration` | Get store configuration |
| PUT | `/settings/store-configuration` | Update store configuration |
| GET | `/countries` | Get all countries |
| GET | `/countries/{countryCode}/regions` | Get regions for a country |
| GET | `/settings/product-options` | Get product option configuration |
| GET | `/settings/description-editor` | Get description editor configuration |

### Exchange Rate Providers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/exchange-rate-providers/available` | List available providers |
| GET | `/exchange-rate-providers` | List configured providers |
| GET | `/exchange-rate-providers/{alias}/fields` | Get configuration fields |
| PUT | `/exchange-rate-providers/{alias}/activate` | Activate a provider |
| PUT | `/exchange-rate-providers/{alias}/settings` | Update provider settings |
| POST | `/exchange-rate-providers/{alias}/test` | Test a provider |
| POST | `/exchange-rate-providers/refresh` | Force refresh exchange rates |
| GET | `/exchange-rate-providers/snapshot` | Get current rate snapshot |

### Address Lookup Providers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/address-lookup-providers` | List available providers |
| GET | `/address-lookup-providers/active` | Get the active provider |
| GET | `/address-lookup-providers/{alias}/fields` | Get configuration fields |
| PUT | `/address-lookup-providers/{alias}/activate` | Activate a provider |
| PUT | `/address-lookup-providers/deactivate` | Deactivate all providers |
| PUT | `/address-lookup-providers/{alias}/settings` | Update provider settings |
| POST | `/address-lookup-providers/{alias}/test` | Test a provider |

---

## Product Feeds

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/product-feeds` | List product feeds |
| GET | `/product-feeds/{id}` | Get feed details |
| POST | `/product-feeds` | Create a product feed |
| PUT | `/product-feeds/{id}` | Update a product feed |
| DELETE | `/product-feeds/{id}` | Delete a product feed |
| POST | `/product-feeds/{id}/rebuild` | Rebuild a feed |
| GET | `/product-feeds/{id}/preview` | Preview feed output |
| POST | `/product-feeds/{id}/validate` | Validate feed configuration |
| GET | `/product-feeds/resolvers` | Get available feed resolvers |

---

## Product Sync (Import/Export)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/product-sync/imports/validate` | Validate an import file |
| POST | `/product-sync/imports/start` | Start an import |
| POST | `/product-sync/exports/start` | Start an export |
| GET | `/product-sync/runs` | List sync runs |
| GET | `/product-sync/runs/{id}` | Get sync run details |
| GET | `/product-sync/runs/{id}/issues` | Get issues for a sync run |
| GET | `/product-sync/runs/{id}/download` | Download sync run output |

---

## Actions

Bulk actions for backoffice management.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/actions` | List available actions |
| POST | `/actions/execute` | Execute a bulk action |
| POST | `/actions/download` | Download action output |

---

## Health Checks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health-checks` | List available health checks |
| POST | `/health-checks/{alias}/run` | Run a specific health check |
| GET | `/health-checks/{alias}/details` | Get health check details |

---

## Seed Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/seed-data/status` | Get seed data installation status |
| POST | `/seed-data/install` | Install seed/sample data |

---

## Checkout Logs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/log` | Log a checkout event (for debugging) |

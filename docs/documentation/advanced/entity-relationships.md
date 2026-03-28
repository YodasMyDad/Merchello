# Entity Relationships

This page maps out how the major entities in Merchello relate to each other. Understanding these relationships will help you navigate the codebase, write queries, and build extensions.

## Entity Relationship Overview

Below is a text-based diagram showing the core entities and their relationships. Read the arrows as "has many" or "belongs to".

```
Supplier ──1:M──> ProductRoot (via ExtendedData VendorId)

ProductRoot ──1:M──> Product (variants)
ProductRoot ──M:M──> ProductCollection
ProductRoot ──M:M──> ProductFilter
ProductRoot ──1:1──> ProductType
ProductRoot ──1:1──> TaxGroup
ProductRoot ──M:M──> Warehouse (via ProductRootWarehouse)

Product ──M:M──> Warehouse (via ProductWarehouse - stock levels)

Customer ──1:M──> Invoice
Customer ──1:M──> Basket
Customer ──1:M──> CustomerAddress
Customer ──M:M──> CustomerSegment (via CustomerSegmentMember)

Basket ──1:M──> LineItem

Invoice ──1:M──> Order
Invoice ──1:M──> Payment

Order ──1:M──> LineItem
Order ──1:M──> Shipment
Order ──1:1──> Warehouse

Shipment ──1:M──> LineItem

Payment ──1:1──> Invoice

TaxGroup ──1:M──> TaxGroupRate
TaxGroup ──1:M──> ShippingTaxOverride

Warehouse ──1:M──> ShippingOption

Discount ──1:M──> DiscountUsage
```

## Core Entities

### Products

The product system uses a **root/variant** pattern:

| Entity | Purpose |
|---|---|
| `ProductRoot` | Parent-level configuration. Holds the product name, tax group, product type, option definitions, collections, images, and package defaults. |
| `Product` | A specific variant (e.g., "Blue / Large"). Holds SKU, price, cost, stock levels, and optional package overrides. |
| `ProductType` | Categorization (e.g., "Clothing", "Electronics"). Each product root has exactly one type. |
| `ProductCollection` | Grouping for merchandising (e.g., "Summer Sale"). Many-to-many with product roots. |
| `ProductOption` | An option like "Size" or "Colour" with values. Controls variant generation when `IsVariant = true`. |
| `ProductFilter` / `ProductFilterGroup` | Faceted filtering for storefront browsing (e.g., filter by colour, price range). |

> **Note:** The `ProductRoot` is the "parent" that customers browse. Each `Product` is a purchasable variant. A product root with no variant options has a single default product.

### Inventory

| Entity | Purpose |
|---|---|
| `Warehouse` | A physical location that holds stock and defines shipping origins. |
| `ProductWarehouse` | Join table linking a `Product` (variant) to a `Warehouse` with `Stock` and `Reserved` quantities. |
| `ProductRootWarehouse` | Links a `ProductRoot` to a `Warehouse` with a `Priority` value for warehouse selection order. |

Stock lifecycle for tracked inventory:
1. **Reserve** -- when a customer checks out: `Reserved += qty`
2. **Allocate** -- when an order is shipped: `Stock -= qty`, `Reserved -= qty`
3. **Cancel/Release** -- if the order is cancelled: `Reserved -= qty`

### Suppliers

| Entity | Purpose |
|---|---|
| `Supplier` | A vendor/supplier entity. Linked to products through `ExtendedData["VendorId"]` on `ProductRoot`. Used for vendor-based order grouping and supplier-direct fulfilment. |

### Customers

| Entity | Purpose |
|---|---|
| `Customer` | A buyer. Linked to Umbraco members via `MemberKey`. Holds email, name, marketing preferences, and account terms (for B2B). |
| `CustomerAddress` | Saved addresses for a customer (billing and shipping). |
| `CustomerSegment` | A group of customers (e.g., "VIP", "Wholesale"). Can be manual or criteria-based. |
| `CustomerSegmentMember` | Join table linking customers to segments. |

### Checkout

| Entity | Purpose |
|---|---|
| `Basket` | A shopping basket. Holds line items, currency info, and is linked to a customer (optional for guest checkout). |
| `AbandonedCheckout` | Tracks baskets that entered checkout but were not completed. |
| `LineItem` | A single item in a basket, order, or shipment. Polymorphic -- the `LineItemType` enum distinguishes Product, Addon, Shipping, Discount, Tax, and Custom types. |

### Accounting

| Entity | Purpose |
|---|---|
| `Invoice` | The financial document created at checkout. Links a customer to their orders and payments. Contains billing/shipping addresses, currency info, totals, and source tracking. |
| `Order` | A fulfilment unit within an invoice. An invoice can have multiple orders (e.g., when items ship from different warehouses). Each order is linked to one warehouse. |
| `Payment` | A payment attempt against an invoice. Tracks amount, provider, success/failure, idempotency keys, and risk scores. |
| `TaxGroup` | A tax classification (e.g., "Standard Rate 20%"). Products are assigned to tax groups via their product root. |
| `TaxGroupRate` | Country/region-specific tax rates within a tax group. |
| `ShippingTaxOverride` | Overrides for shipping tax behavior by country/region. |

> **Tip:** An invoice can have multiple payments (partial payments, failed attempts followed by a success). The `PaymentService.CalculatePaymentStatus()` method computes the aggregate status from all payments.

### Shipping

| Entity | Purpose |
|---|---|
| `ShippingOption` | A configured shipping method (e.g., "Standard UK Delivery"). Linked to a warehouse and optionally to a shipping provider. |
| `Shipment` | A physical shipment against an order. Contains tracking info and shipped line items. An order can have multiple shipments (partial fulfilment). |
| `ProviderConfiguration` | Configuration for shipping, payment, tax, and exchange rate providers. Shared table with a `ProviderType` discriminator. |

### Fulfilment

| Entity | Purpose |
|---|---|
| `FulfilmentSyncLog` | Tracks 3PL fulfilment provider sync operations. |
| `FulfilmentWebhookLog` | Logs incoming webhooks from fulfilment providers for deduplication. |

### Payments

| Entity | Purpose |
|---|---|
| `SavedPaymentMethod` | Tokenized payment methods saved for a customer (e.g., saved cards). |

### Discounts

| Entity | Purpose |
|---|---|
| `Discount` | A discount rule with targeting, eligibility, scheduling, and combination controls. |
| `DiscountUsage` | Tracks each use of a discount for enforcing usage limits. |

### Upsells

| Entity | Purpose |
|---|---|
| `UpsellRule` | Configuration for upsell/cross-sell suggestions. |
| `UpsellEvent` | Tracks upsell impressions and conversions for analytics. |

### Digital Products

| Entity | Purpose |
|---|---|
| `DownloadLink` | HMAC-signed download links for digital product delivery. Tracks download counts and expiry. |

### Webhooks and Email

| Entity | Purpose |
|---|---|
| `WebhookSubscription` | Outbound webhook subscriptions configured by store admins. |
| `OutboundDelivery` | Queued outbound messages (webhooks and emails) with retry tracking. |
| `EmailConfiguration` | SMTP/email provider configuration. |
| `SigningKey` | Cryptographic signing keys for protocol webhook verification. |

### Audit

| Entity | Purpose |
|---|---|
| `AuditTrailEntry` | Audit log entries tracking who did what and when. |

### Store Settings

| Entity | Purpose |
|---|---|
| `MerchelloStore` | Runtime store settings (name, address, currency, etc.). |

## The Invoice-Order-Shipment Flow

This is the most important relationship chain to understand:

```
Customer places order
    |
    v
Invoice (financial record)
    |
    |--> Order 1 (Warehouse A)
    |       |--> LineItem (Product X, qty 2)
    |       |--> LineItem (Shipping)
    |       |--> Shipment 1
    |       |       |--> LineItem (Product X, qty 1)  -- partial ship
    |       |--> Shipment 2
    |               |--> LineItem (Product X, qty 1)  -- remaining
    |
    |--> Order 2 (Warehouse B)
    |       |--> LineItem (Product Y, qty 1)
    |       |--> LineItem (Discount, -5.00)
    |       |--> Shipment 1
    |               |--> LineItem (Product Y, qty 1)
    |
    |--> Payment 1 (card, success)
    |--> Payment 2 (refund, partial)
```

Key points:
- One invoice can have **multiple orders** when items ship from different warehouses.
- One order can have **multiple shipments** for partial fulfilment.
- Line items are **copied** (not shared) between basket, order, and shipment using the `LineItemFactory`.
- Discounts flow as `LineItemType.Discount` line items on orders, scaled proportionally when split across warehouses.

## Product Feeds and Sync

| Entity | Purpose |
|---|---|
| `ProductFeed` | Configuration for product data feeds (e.g., Google Shopping). |
| `ProductSyncRun` | Tracks external product sync/import operations. |
| `ProductSyncIssue` | Individual issues found during a product sync run. |

## Planned Feature Entities

These entities have database tables but no service layer yet. See the [Planned Features](../planned/planned-features.md) page for details.

| Entity | Purpose |
|---|---|
| `GiftCard` / `GiftCardTransaction` | Gift card balances and transaction history. |
| `Subscription` / `SubscriptionInvoice` | Recurring billing subscriptions linked to payment providers. |
| `Return` / `ReturnLineItem` / `ReturnReason` | Returns/RMA workflow. |
| `SearchProviderSetting` | Pluggable product search provider configuration. |

## Key File

The `MerchelloDbContext` at `Merchello.Core/Data/Context/MerchelloDbContext.cs` is the single source of truth for all entity registrations and their EF Core mappings. Entity configurations are applied via `modelBuilder.ApplyConfigurationsFromAssembly()` from mapping classes in each feature's `Mapping/` folder.

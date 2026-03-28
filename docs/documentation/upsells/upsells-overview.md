# Upsells and Post-Purchase Offers

Merchello's upsell system lets you recommend additional products to customers based on what is in their basket, who they are, and where they are in the purchase journey. You define rules that determine when upsells trigger, what products to suggest, and who is eligible to see them.

## Core Concepts

### Upsell Rules

An upsell rule is the core entity. Each rule has three components:

1. **Trigger rules** -- When should this upsell fire? (e.g., "when Product A is in the basket", "when cart value exceeds $50")
2. **Recommendation rules** -- What products should we suggest? (e.g., "products from collection X", "specific products")
3. **Eligibility rules** -- Who can see this upsell? (e.g., "all customers", "VIP segment only")

### Display Locations

Upsells can appear in multiple places (this is a flags enum, so one rule can target several):

| Location | Value | Description |
|---|---|---|
| `Checkout` | 1 | During the checkout flow |
| `Basket` | 2 | On the basket/cart page |
| `ProductPage` | 4 | On product detail pages |
| `Email` | 8 | In transactional emails |
| `Confirmation` | 16 | On the order confirmation page |

### Checkout Modes

When an upsell targets the checkout, you choose how it displays:

| Mode | Description |
|---|---|
| **Inline** | Collapsible section at the top of the checkout page |
| **Interstitial** | Replaces checkout content until the customer dismisses it |
| **OrderBump** | Checkbox integrated into the checkout form (supports `DefaultChecked` for opt-out) |
| **PostPurchase** | Shown after payment, before confirmation. Uses saved payment methods for one-click purchase |

## Trigger Types

Trigger rules define the conditions that activate an upsell:

- **Product-based** -- Fires when specific products, product types, or collections are in the basket
- **Cart value thresholds** -- `MinimumCartValue`, `MaximumCartValue`, or `CartValueBetween`
- **Extract filters** -- Narrow trigger matching to specific variants or filters

## Recommendation Types

Recommendation rules define which products to suggest:

| Type | Description |
|---|---|
| `ProductTypes` | Products matching specific product types |
| `ProductFilters` | Products matching filter criteria |
| `Collections` | Products from specific collections |
| `SpecificProducts` | Explicitly chosen products |
| `Suppliers` | Products from specific suppliers |

## Eligibility Types

Eligibility rules control who sees the upsell:

| Type | Description |
|---|---|
| `AllCustomers` | Everyone (default) |
| `CustomerSegments` | Only customers in specific segments |
| `SpecificCustomers` | Only specific customer accounts |

## Configuration Options

Each upsell rule has these settings:

| Setting | Default | Description |
|---|---|---|
| `Priority` | 1000 | Lower values show first |
| `MaxProducts` | 4 | Maximum products to display |
| `SortBy` | -- | How to order suggestions (price, name, etc.) |
| `SuppressIfInCart` | true | Hide products already in the basket |
| `AutoAddToBasket` | false | Auto-add recommended products (opt-out model) |
| `StartsAt` | now | When the rule becomes active |
| `EndsAt` | null | When the rule expires (null = never) |
| `Timezone` | null | Timezone for display (e.g., "Europe/London") |
| `DisplayStyles` | null | Per-surface style overrides |

## Lifecycle and Status

Upsell rules go through these statuses:

- **Draft** -- Created but not active
- **Active** -- Currently showing to customers
- **Expired** -- Past the end date
- **Deactivated** -- Manually turned off

You manage status through the API:

```
POST /api/v1/upsells/{id}/activate
POST /api/v1/upsells/{id}/deactivate
```

The `UpsellStatusJob` background job automatically transitions rules from Active to Expired when their `EndsAt` date passes.

## Post-Purchase Upsells

Post-purchase upsells are a special flow that shows offers to the customer after payment but before the confirmation page. They require:

1. A saved payment method (vaulted card)
2. The upsell rule's `CheckoutMode` set to `PostPurchase`

### Storefront API

The post-purchase flow uses a separate controller with cookie-based authentication (the confirmation token cookie):

| Endpoint | Method | Description |
|---|---|---|
| `/api/merchello/checkout/post-purchase/{invoiceId}` | GET | Get available upsell suggestions |
| `/api/merchello/checkout/post-purchase/{invoiceId}/preview` | POST | Preview price, tax, and shipping for an item |
| `/api/merchello/checkout/post-purchase/{invoiceId}/add` | POST | Add item and charge saved payment method |
| `/api/merchello/checkout/post-purchase/{invoiceId}/skip` | POST | Skip upsells and release fulfilment hold |

> **Note:** Post-purchase additions use idempotency keys to prevent duplicate charges. The preview endpoint calculates the exact cost including tax and shipping before the customer commits.

### How It Works

1. After successful payment, the checkout redirects to the confirmation page
2. If post-purchase upsells are available, they are displayed before the confirmation content
3. The customer can preview the cost of adding an item
4. Adding an item charges their saved payment method and adds it to the existing order
5. Skipping releases any fulfilment hold and shows the confirmation

## Analytics and Tracking

Merchello tracks upsell performance with event-based analytics:

| Metric | Description |
|---|---|
| Impressions | How many times the upsell was shown |
| Clicks | How many times a customer interacted |
| Conversions | How many times a suggested product was purchased |
| Revenue | Total revenue attributed to upsell conversions |

### API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/v1/upsells/{id}/performance` | Detailed performance for a specific rule |
| `GET /api/v1/upsells/dashboard` | Dashboard overview of all upsell performance |
| `GET /api/v1/upsells/summary` | Summary with top N performers |

Derived metrics (click-through rate, conversion rate) are calculated automatically:
- **CTR** = clicks / impressions * 100
- **Conversion rate** = conversions / clicks * 100

## Backoffice API

Full CRUD is available for managing upsell rules:

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/upsells` | GET | List upsells (filterable by status, location, search) |
| `/api/v1/upsells/{id}` | GET | Get upsell detail |
| `/api/v1/upsells` | POST | Create upsell rule |
| `/api/v1/upsells/{id}` | PUT | Update upsell rule |
| `/api/v1/upsells/{id}` | DELETE | Delete upsell rule |

## Related Topics

- [Checkout](../checkout/)
- [Email System](../email/email-overview.md)
- [Notification System](../notifications/notification-system.md)

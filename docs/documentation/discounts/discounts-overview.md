# Discount Engine

Merchello's discount system gives you Shopify-like promotional capabilities -- percentage discounts, fixed amount off, buy-one-get-one, free shipping, and more. Discounts can be triggered by codes or applied automatically when conditions are met.

## Discount Categories

| Category | Description | Example |
|----------|-------------|---------|
| `AmountOffProducts` | Discount on specific products or collections | "20% off all running shoes" |
| `AmountOffOrder` | Discount on the entire order total | "10 off orders over 50" |
| `BuyXGetY` | Buy qualifying items, get other items discounted | "Buy 2 shirts, get 1 free" |
| `FreeShipping` | Free or discounted shipping | "Free shipping on orders over 75" |

## Discount Methods

| Method | How It Works |
|--------|-------------|
| `Code` | Customer enters a discount code at checkout |
| `Automatic` | Discount is applied automatically when conditions are met |

Automatic discounts are evaluated during checkout calculation and refreshed after any basket-affecting change (adding/removing items, changing quantities).

## Value Types

| Type | Description |
|------|-------------|
| `FixedAmount` | Fixed amount off (e.g., 5 off) |
| `Percentage` | Percentage off (e.g., 10% off) |
| `Free` | 100% off (used primarily for BuyXGetY) |

## Creating a Discount

### Percentage off products

```http
POST /umbraco/api/v1/discounts
Content-Type: application/json

{
  "name": "Summer Sale",
  "category": "AmountOffProducts",
  "method": "Automatic",
  "valueType": "Percentage",
  "value": 20,
  "startsAt": "2026-06-01T00:00:00Z",
  "endsAt": "2026-08-31T23:59:59Z",
  "targetRules": [
    {
      "type": "Collections",
      "collectionIds": ["guid-of-summer-collection"]
    }
  ]
}
```

### Code-based order discount

```http
POST /umbraco/api/v1/discounts
Content-Type: application/json

{
  "name": "Welcome 10",
  "category": "AmountOffOrder",
  "method": "Code",
  "code": "WELCOME10",
  "valueType": "FixedAmount",
  "value": 10,
  "requirementType": "MinimumPurchaseAmount",
  "requirementValue": 50,
  "perCustomerUsageLimit": 1
}
```

## Targeting Rules

Targets control *what* the discount applies to:

| Target Type | Applies To |
|-------------|-----------|
| `AllProducts` | Every product in the store |
| `SpecificProducts` | Listed products and variants |
| `Collections` | Products in specific collections |
| `ProductFilters` | Products matching filter values |
| `ProductTypes` | Products of specific types |
| `Suppliers` | Products from specific suppliers |
| `Warehouses` | Products from specific warehouses |

## Eligibility Rules

Eligibility controls *who* can use the discount:

| Eligibility Type | Who Qualifies |
|-----------------|---------------|
| `AllCustomers` | Everyone |
| `CustomerSegments` | Customers in specific segments |
| `SpecificCustomers` | Named individual customers |

### Segment-based eligibility

This is where [Customer Segments](../customers/customer-segments.md) shine. You can create automated segments like "Customers who spent over 500" and then target discounts exclusively to them:

```json
{
  "eligibilityRules": [
    {
      "type": "CustomerSegments",
      "segmentIds": ["guid-of-high-spenders-segment"]
    }
  ]
}
```

## Minimum Requirements

| Requirement Type | Description |
|-----------------|-------------|
| `None` | No minimum required |
| `MinimumPurchaseAmount` | Order must be at least X amount |
| `MinimumQuantity` | Cart must contain at least X items |

## Usage Limits

Control how many times a discount can be used:

| Limit | Description |
|-------|-------------|
| `TotalUsageLimit` | Maximum total uses across all customers |
| `PerCustomerUsageLimit` | Maximum uses per customer |
| `PerOrderUsageLimit` | Maximum applications per order (relevant for BOGO) |

## Scheduling

Discounts support time-based activation:

- `StartsAt` -- when the discount becomes active (UTC)
- `EndsAt` -- when the discount expires (null for no expiry)
- `Timezone` -- timezone for display purposes (scheduling uses UTC dates)

A background job (`DiscountStatusJob`) automatically transitions discounts between `Scheduled`, `Active`, and `Expired` statuses.

## Discount Statuses

| Status | Description |
|--------|-------------|
| `Draft` | Not yet active, being configured |
| `Active` | Currently usable |
| `Scheduled` | Will become active at `StartsAt` |
| `Expired` | Past `EndsAt`, no longer usable |
| `Disabled` | Manually deactivated |

### Activating and deactivating

```http
POST /umbraco/api/v1/discounts/{id}/activate
POST /umbraco/api/v1/discounts/{id}/deactivate
```

## Combination Rules

Control whether discounts can stack:

| Property | Controls |
|----------|---------|
| `CanCombineWithProductDiscounts` | Can this stack with product-level discounts? |
| `CanCombineWithOrderDiscounts` | Can this stack with order-level discounts? |
| `CanCombineWithShippingDiscounts` | Can this stack with shipping discounts? |

## Priority

When multiple discounts could apply, `Priority` determines the order (lower value = higher priority, default 1000). If combination rules prevent stacking, the highest-priority discount wins.

## Buy X Get Y

The BOGO configuration supports flexible promotions:

```json
{
  "category": "BuyXGetY",
  "buyXGetYConfig": {
    "buyQuantity": 2,
    "getQuantity": 1,
    "buyTriggerType": "SpecificProducts",
    "buyProductIds": ["guid-1", "guid-2"],
    "selectionMethod": "LowestPrice",
    "getValueType": "Free",
    "getValue": 0
  }
}
```

The `SelectionMethod` determines which items become the "get" items:
- `LowestPrice` -- cheapest qualifying items are discounted
- `HighestPrice` -- most expensive qualifying items are discounted

## Free Shipping

Free shipping discounts can be scoped to specific countries:

```json
{
  "category": "FreeShipping",
  "freeShippingConfig": {
    "countryScope": "SpecificCountries",
    "countryCodes": ["GB", "US", "DE"]
  }
}
```

When shipping options are configured on the discount, the free-shipping check validates against all selected shipping groups (`SelectedShippingOptionIds`).

## Tax Interaction: ApplyAfterTax

By default, discounts are calculated on the pre-tax subtotal. Setting `ApplyAfterTax = true` changes this:

- The discount is calculated based on the tax-inclusive total
- Then reverse-calculated to determine the pre-tax discount amount
- The customer sees the expected saving (e.g., 10% off 120 inc. tax = 12 saved)

This is important for jurisdictions where promotions must reflect the tax-inclusive price the customer sees.

## Code Validation

Check if a discount code is available:

```http
GET /umbraco/api/v1/discounts/validate-code?code=WELCOME10
```

Returns whether the code exists, is currently active, and hasn't exceeded usage limits.

## Centralized Calculation

All discount logic flows through centralized services:

- `IDiscountEngine` -- evaluates which discounts apply and calculates amounts
- `IDiscountService.CalculateDiscount()` -- core calculation
- `ILineItemService.AddDiscountLineItem()` -- adds discount as a line item

> **Warning:** Never calculate discounts outside these services. The engine handles combination rules, priority ordering, usage tracking, and currency rounding.

## Checkout Integration

During checkout, the `ICheckoutDiscountService.RefreshPromotionalDiscountsAsync()` method refreshes both code-based and automatic discounts after any basket-affecting change. This ensures discounts stay accurate as the customer modifies their cart.

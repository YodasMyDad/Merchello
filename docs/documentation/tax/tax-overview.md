# Tax System Overview

Merchello's tax system is designed to handle everything from simple single-rate VAT to complex multi-jurisdiction sales tax with external providers like Avalara. At its core, the system revolves around **Tax Groups**, **Tax Group Rates**, and a clear **rate lookup chain**.

## Core Concepts

### Tax Groups

A Tax Group represents a category of taxation. You might have:

- **Standard Rate** (20% in the UK, varies by US state)
- **Reduced Rate** (5% for children's clothing in some jurisdictions)
- **Zero Rate** (0% for books in many EU countries)
- **Exempt** (0% for certain medical supplies)

Each tax group has:

| Property | Description |
|----------|-------------|
| `Id` | Unique identifier |
| `Name` | Display name (e.g., "Standard Rate") |
| `TaxPercentage` | Default rate (0-100) used when no location-specific rate exists |

Products are linked to tax groups through `ProductRoot.TaxGroupId`. This is important because the tax group ID flows through the entire order pipeline -- from basket line items to invoice tax calculations.

> **Invariant (CLAUDE.md):** `TaxGroupId` must be preserved from `ProductRoot` -> basket line item -> order line item -> `TaxableLineItem` payload sent to the provider. External providers (Avalara, TaxJar, etc.) rely on this mapping to select the correct tax code.

### Tax Group Rates (Geographic Overrides)

The default rate on a tax group is just the fallback. You can define location-specific rates using **Tax Group Rates**:

```
Tax Group: "Standard Rate" (default: 20%)
  ├── GB (country): 20%
  ├── US (country): no override (different states have different rates)
  │   ├── US-CA (state): 7.25%
  │   ├── US-NY (state): 8.0%
  │   └── US-TX (state): 6.25%
  └── DE (country): 19%
```

Each rate has:
- `TaxGroupId` -- which tax group it belongs to
- `CountryCode` -- ISO country code (e.g., "US", "GB")
- `RegionCode` -- state/province code (optional, e.g., "CA", "NY")
- `TaxPercentage` -- the rate for this location (0-100)

## Rate Lookup Chain

When Merchello needs to calculate tax for a product, it uses [`ITaxService.GetApplicableRateAsync()`](../../../src/Merchello.Core/Accounting/Services/Interfaces/ITaxService.cs) which follows a strict priority:

```
1. State-specific rate   -->  Found? Use it.
2. Country-level rate    -->  Found? Use it.
3. TaxGroup default rate -->  Always available as fallback.
```

For example, if a customer in California buys a product in the "Standard Rate" tax group:

1. Look for a rate with `CountryCode = "US"` and `RegionCode = "CA"` -- found 7.25%, use that.

If a customer in Florida buys the same product but there is no Florida rate:

1. Look for `US` + `FL` -- not found.
2. Look for `US` with no region -- found 6%, use that.

If a customer in a country with no overrides at all:

1. State lookup -- nothing.
2. Country lookup -- nothing.
3. Fall back to the tax group's default `TaxPercentage`.

> **Tip:** Rates are cached for 5 minutes using the `ICacheService` with the tag `"tax"`. When you update rates through the API, the cache is automatically invalidated.

## Tax-Inclusive vs Tax-Exclusive Pricing

Merchello supports both pricing models, controlled by your store settings:

- **Tax-exclusive** (default): Prices are shown without tax. Tax is added at checkout.
- **Tax-inclusive**: Prices include tax. The tax amount is calculated backwards from the displayed price.

The checkout basket DTO includes reactive fields for tax-inclusive display:
- `DisplayPricesIncTax`
- `TaxInclusiveDisplaySubTotal`
- `FormattedTaxInclusiveDisplaySubTotal`
- `TaxIncludedMessage`

## How Tax Flows Through the System

1. **Product setup**: You assign a `TaxGroupId` to each `ProductRoot`.
2. **Basket creation**: When a product is added to the basket, the `TaxGroupId` is captured on the line item by the line-item factory.
3. **Checkout calculation**: [`CheckoutService.CalculateBasketAsync()`](../../../src/Merchello.Core/Checkout/Services/CheckoutService.cs) triggers tax calculation.
4. **Tax orchestration**: [`ITaxOrchestrationService`](../../../src/Merchello.Core/Tax/Services/Interfaces/ITaxOrchestrationService.cs) coordinates with the active tax provider ([`TaxOrchestrationService`](../../../src/Merchello.Core/Tax/Services/TaxOrchestrationService.cs)).
5. **Rate application**: The provider (manual or external) returns rates per line item.
6. **Invoice creation**: Tax amounts are locked into the invoice.

> **Invariant (CLAUDE.md):** Controllers must never call a tax provider directly. Always go through `ITaxOrchestrationService` or `CheckoutService`. The orchestration layer handles provider selection, fallback behavior, and caching. Only `Product`, `Custom`, and `Addon` line types are sent to providers -- `Discount` lines are not sent directly.

## Managing Tax Groups via API

### Create a tax group

```http
POST /umbraco/api/v1/tax-groups
Content-Type: application/json

{
  "name": "Standard Rate",
  "rate": 20
}
```

### Add a geographic rate

```http
POST /umbraco/api/v1/tax-groups/{taxGroupId}/rates
Content-Type: application/json

{
  "countryCode": "US",
  "regionCode": "CA",
  "taxPercentage": 7.25
}
```

### Update a rate

```http
PUT /umbraco/api/v1/tax-groups/rates/{rateId}
Content-Type: application/json

{
  "taxPercentage": 8.0
}
```

### Delete a tax group

You can only delete a tax group if no products are using it. If products reference the tax group, you will get an error.

## Notifications

Tax group operations fire notifications that you can hook into:

| Operation | Before (Cancelable) | After (Informational) |
|-----------|---------------------|----------------------|
| Create | `TaxGroupCreatingNotification` | `TaxGroupCreatedNotification` |
| Update | `TaxGroupSavingNotification` | `TaxGroupSavedNotification` |
| Delete | `TaxGroupDeletingNotification` | `TaxGroupDeletedNotification` |

## Key Service Methods

| Method | Description |
|--------|-------------|
| `TaxService.GetApplicableRateAsync()` | The primary rate lookup (follows the 3-tier chain) |
| `TaxService.GetTaxGroups()` | List all tax groups |
| `TaxService.GetRatesForTaxGroup()` | Get all geographic rates for a tax group |
| `TaxService.CreateTaxGroup()` | Create a new tax group |
| `TaxService.CreateTaxGroupRate()` | Add a location-specific rate |

## Next Steps

- [Shipping Tax](shipping-tax.md) -- how tax is applied to shipping costs
- [Tax Providers](tax-providers.md) -- manual rates vs Avalara AvaTax

# Shipping Tax

Taxing shipping costs is surprisingly complex. Different jurisdictions have different rules -- some don't tax shipping at all, some apply a fixed rate, and some (like EU/UK VAT) require a proportional rate based on the products being shipped. Merchello handles all of these through a 4-tier priority system.

## The 4-Tier Shipping Tax Model

When Merchello needs to determine how shipping should be taxed for a given destination, it queries the active tax provider via `ITaxProviderManager.GetShippingTaxConfigurationAsync(countryCode, stateCode)`. The provider returns a `ShippingTaxConfigurationResult` with a **mode** and optionally a **rate**:

| Mode | Description | Rate |
|------|-------------|------|
| `NotTaxed` | Shipping is explicitly not taxable | 0% |
| `FixedRate` | Apply the returned fixed rate | e.g., 20% |
| `Proportional` | Calculate weighted average from line item tax rates | Calculated |
| `ProviderCalculated` | External provider determines from full order context | Provider decides |

### How the modes work

**NotTaxed** -- The simplest case. Shipping has no tax applied. Many US states don't tax shipping, and some products (like digital goods) have no shipping at all.

**FixedRate** -- A specific tax rate is applied to the shipping amount. For example, in the UK you might apply the standard 20% VAT to shipping. The rate comes from a configured shipping tax group.

**Proportional** -- Used extensively in the EU/UK. The shipping tax rate is calculated as a weighted average of the tax rates on the products being shipped. If your basket has items at 20% and items at 5%, the shipping tax rate is proportionally calculated using `ITaxCalculationService.CalculateProportionalShippingTax()`.

**ProviderCalculated** -- For external providers like Avalara that determine shipping taxability from the full order context, destination, and their own tax rules database.

## Priority Resolution (Manual Tax Provider)

The Manual Tax Provider resolves shipping tax configuration in this order:

```
1. Regional Override (state-specific)
   └── Found? Use its tax group's rate (FixedRate) or NotTaxed if no group assigned

2. Regional Override (country-level)
   └── Found? Use its tax group's rate (FixedRate) or NotTaxed if no group assigned

3. Provider Setting: "isShippingTaxable"
   └── false? → NotTaxed
   └── true? → Check next step

4. Provider Setting: "shippingTaxGroupId"
   └── Has value? → FixedRate with that group's rate
   └── Empty? → Proportional (weighted average)
```

> **Tip:** Regional overrides always take precedence. This lets you set a global "tax shipping" rule but exempt specific countries or states.

## Shipping Tax Overrides

Shipping tax overrides are geographic rules that control shipping tax behavior for specific locations. Each override has:

| Property | Description |
|----------|-------------|
| `CountryCode` | ISO country code (required) |
| `RegionCode` | State/province code (optional -- country-wide if null) |
| `ShippingTaxGroupId` | Tax group to use for shipping tax (null = shipping not taxed) |

### Override lookup priority

Just like product tax rates, overrides follow a state-first lookup:

1. **State-specific override** -- e.g., `US-CA`
2. **Country-level override** -- e.g., `US` (no state)
3. **No override found** -- falls back to provider-level settings

### Managing overrides via API

```http
POST /umbraco/api/v1/shipping-tax-overrides
Content-Type: application/json

{
  "countryCode": "GB",
  "shippingTaxGroupId": "guid-of-standard-rate-group"
}
```

To make shipping tax-free for a specific country:

```http
POST /umbraco/api/v1/shipping-tax-overrides
Content-Type: application/json

{
  "countryCode": "US",
  "regionCode": "MT",
  "shippingTaxGroupId": null
}
```

## Proportional Shipping Tax Calculation

The proportional method calculates a weighted average tax rate for shipping based on the taxable products in the basket. This is the approach required by EU/UK VAT rules when a basket contains products at different tax rates.

The formula used by `ITaxCalculationService.CalculateProportionalShippingTax()`:

```
Weighted Rate = (Total Line Item Tax / Taxable Subtotal)
Shipping Tax  = Shipping Amount * Weighted Rate
```

For example, with a basket containing:
- Product A: 50.00 at 20% = 10.00 tax
- Product B: 30.00 at 5% = 1.50 tax
- Shipping: 8.00

```
Weighted Rate = (10.00 + 1.50) / (50.00 + 30.00) = 0.14375 (14.375%)
Shipping Tax  = 8.00 * 0.14375 = 1.15
```

> **Warning:** Never reimplement the proportional formula outside `ITaxCalculationService`. The centralized calculation handles currency rounding correctly.

## Where Shipping Tax Is Calculated

Shipping tax is calculated at three key entry points:

1. **Checkout** -- `CheckoutService.CalculateBasketAsync()` includes shipping tax in basket totals.
2. **Storefront display** -- `StorefrontContextService.GetDisplayContextAsync()` shows tax-inclusive prices.
3. **Invoice recalculation** -- When invoices are edited, shipping tax is recalculated.

In all cases, the system queries `ITaxProviderManager.GetShippingTaxConfigurationAsync()` to determine the mode and rate.

## Notifications

Shipping tax override operations fire notifications:

| Operation | Before (Cancelable) | After |
|-----------|---------------------|-------|
| Create | `ShippingTaxOverrideCreatingNotification` | `ShippingTaxOverrideCreatedNotification` |
| Update | `ShippingTaxOverrideSavingNotification` | `ShippingTaxOverrideSavedNotification` |
| Delete | `ShippingTaxOverrideDeletingNotification` | `ShippingTaxOverrideDeletedNotification` |

## Best Practices

1. **Start with overrides** -- if you sell internationally, set up country-level shipping tax overrides for your primary markets.
2. **Use proportional for EU/UK** -- don't assign a fixed shipping tax group for EU countries. Let the proportional calculation handle mixed-rate baskets correctly.
3. **Test with mixed baskets** -- verify shipping tax is correct when a basket contains items at different tax rates.
4. **Don't hardcode rates** -- always query via `ITaxProviderManager.GetShippingTaxConfigurationAsync()`.

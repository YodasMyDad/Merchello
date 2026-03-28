# Multi-Currency Support

Merchello supports selling in multiple currencies while maintaining a single **store currency** as the source of truth for all financial records. This guide explains how currency conversion works, when rates are locked, and the critical invariants you need to understand.

## Core Principle: Store Currency Is King

All product prices, stock costs, and financial calculations are stored in the **store currency** (configured in `MerchelloSettings.StoreCurrencyCode`, e.g., `"USD"` or `"GBP"`). When a customer shops in a different currency, prices are converted for display only -- the underlying amounts never change.

```
Store Currency: GBP
Customer Currency: EUR

Product Price (stored): 100.00 GBP
Exchange Rate: 1.17 (1 GBP = 1.17 EUR)
Display Price: 117.00 EUR  (100.00 * 1.17)
```

> **Warning:** Basket amounts are stored in store currency and NEVER change when the display currency changes. Display prices are calculated on-the-fly using the current exchange rate.

## Exchange Rate Direction

Rates are stored as **presentment-to-store** direction:

```
Rate = 1.25 means: 1 presentment currency = 1.25 store currency
```

For example, if the store currency is USD and the customer shops in GBP:
- Rate: 1.25 (1 GBP = 1.25 USD)
- **Display** uses multiply: `amount * rate` (store amount to display currency is the inverse)
- **Checkout/payment** uses divide: `amount / rate`

> **Warning:** Never charge from display amounts. Always use the invoice conversion path with the locked rate.

## Rate Locking at Invoice Creation

When an invoice is created (at checkout), the exchange rate is **locked** onto the invoice with three audit fields:

| Field | Description | Example |
|-------|-------------|---------|
| `PricingExchangeRate` | The locked rate | `1.25` |
| `PricingExchangeRateSource` | Where the rate came from | `"frankfurter"` |
| `PricingExchangeRateTimestampUtc` | When the rate was captured | `2026-03-15T14:30:00Z` |

These fields serve two purposes:

1. **Financial accuracy** -- the customer pays exactly what they saw at checkout, regardless of rate fluctuations after the order is placed
2. **Audit trail** -- you can always trace back to the exact rate used and where it came from

## Store Currency Equivalents

For multi-currency reporting, invoices and line items store parallel amounts in the store currency:

| Field | Store Currency Equivalent |
|-------|--------------------------|
| `SubTotal` | `SubTotalInStoreCurrency` |
| `Tax` | `TaxInStoreCurrency` |
| `Discount` | `DiscountInStoreCurrency` |
| `Total` | `TotalInStoreCurrency` |
| `ShippingCost` | `ShippingCostInStoreCurrency` |
| `LineItem.Amount` | `LineItem.AmountInStoreCurrency` |
| `LineItem.Cost` | `LineItem.CostInStoreCurrency` |

This means your reporting queries can always sum amounts in a single currency without needing to look up historical exchange rates.

## How Display Conversion Works

When a customer browses in a non-store currency:

1. The `StorefrontContextService.GetDisplayContextAsync()` fetches the current exchange rate
2. Product prices are converted on-the-fly for display
3. The basket shows totals in the customer's currency
4. The stored basket amounts remain in store currency

```
Stored basket:   SubTotal = 100.00 GBP
Display rate:    1.17 EUR/GBP
Displayed as:    117.00 EUR
```

If the rate changes between visits, the displayed price changes -- but the underlying store currency amount stays the same.

## How Checkout Conversion Works

At checkout, when the invoice is created:

1. The current exchange rate is fetched and locked
2. All amounts are stored in the customer's currency (`Invoice.CurrencyCode`)
3. Parallel store currency amounts are calculated and stored
4. The rate, source, and timestamp are recorded

From this point forward, the locked rate is used for all calculations on this invoice -- including edits, refunds, and payment processing.

## Currency on Invoices

| Field | Description |
|-------|-------------|
| `CurrencyCode` | Customer's payment currency (e.g., `"EUR"`) |
| `CurrencySymbol` | Display symbol (e.g., `"EUR"`) |
| `StoreCurrencyCode` | Store's base currency snapshot (protects reporting if store settings change) |

## Best Practices

1. **Never convert manually** -- always use the exchange rate cache and storefront context services for conversions.
2. **Don't mutate store currency amounts** -- they are the financial source of truth.
3. **Check rate freshness** -- the exchange rate cache has a configurable TTL. Stale rates may affect the customer experience.
4. **Audit rate locks** -- the three audit fields on the invoice let you reconcile any rate disputes with customers.
5. **Use store currency for reports** -- the `*InStoreCurrency` fields give you a consistent basis for financial reporting across all currencies.

## Next Steps

- [Exchange Rate Providers](exchange-rate-providers.md) -- how rates are fetched and cached

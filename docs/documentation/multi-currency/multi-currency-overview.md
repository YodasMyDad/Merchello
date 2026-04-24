# Multi-Currency Support

Merchello supports selling in multiple currencies while maintaining a single **store currency** as the source of truth for all financial records. This guide explains how currency conversion works, when rates are locked, and the critical invariants you must respect.

> **Critical invariants (from `CLAUDE.md`).** Get these wrong and baskets drift, customers get charged the wrong amount, or reporting breaks. Every change in this area must preserve them:
>
> - Basket amounts are stored in **store currency** and NEVER change when display currency changes. Display is calculated on the fly.
> - Rate is stored as **presentment-to-store** (e.g. `1.25` means `1 GBP = 1.25 USD`).
> - **Display uses multiply:** `amount * rate`.
> - **Checkout/payment uses divide:** `amount / rate`.
> - At invoice creation, lock `PricingExchangeRate`, `PricingExchangeRateSource` and `PricingExchangeRateTimestampUtc` for audit.
> - Never charge from display amounts. Always use the invoice conversion path.

## Core Principle: Store Currency Is King (For the Basket)

While a customer is still browsing or shopping, all basket amounts are kept in the **store currency** (configured in `MerchelloSettings.StoreCurrencyCode`, e.g. `"USD"` or `"GBP"`). Product prices in the database are also net amounts in the store currency. When a customer switches display currency, prices are converted **for display only** -- the underlying stored amounts never change.

```
Store Currency: GBP
Customer Currency: EUR

Product Price (stored): 100.00 GBP
Exchange Rate: 1.17 (1 GBP = 1.17 EUR)
Display Price: 117.00 EUR  (100.00 * 1.17)
```

> **Note.** Once the basket is converted into an invoice at checkout, the monetary fields on the invoice (`Total`, `SubTotal`, `Tax`, `Discount`, `ShippingCost`) are written in the **customer's presentment currency**, and parallel `*InStoreCurrency` fields are written alongside them for reporting. See [Store Currency Equivalents](#store-currency-equivalents) below.

## Exchange Rate Direction

Rates are stored as **presentment-to-store** direction:

```
Rate = 1.25 means: 1 presentment currency = 1.25 store currency
```

For example, if the store currency is USD and the customer shops in GBP with a stored rate of `1.25`:

- Rate: `1.25` (1 GBP = 1.25 USD)
- **Display** uses multiply: `amount * rate`
- **Checkout/payment** uses divide: `amount / rate`

The two directions are intentional and non-negotiable. Display and checkout use **the same stored rate** but in opposite directions because display and invoice-conversion paths have different input/output currencies. See [Architecture-Diagrams Section 5.4 and 5.5](https://github.com/YodasMyDad/Merchello/blob/main/docs/Architecture-Diagrams.md) for the full worked examples, including tax-inclusive math.

> **Warning.** Never charge from display amounts. Always use the invoice conversion path with the locked rate.

## Rate Locking at Invoice Creation

When an invoice is created at checkout, the exchange rate is **locked** onto the invoice with three audit fields on [`Invoice.cs`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Accounting/Models/Invoice.cs#L90):

| Field | Description | Example |
|-------|-------------|---------|
| `PricingExchangeRate` | The locked rate | `1.25` |
| `PricingExchangeRateSource` | The provider alias that produced the rate | `"frankfurter"` |
| `PricingExchangeRateTimestampUtc` | When the rate was captured | `2026-03-15T14:30:00Z` |

These fields serve two purposes:

1. **Financial accuracy** -- the customer pays exactly what they saw at checkout, regardless of rate fluctuations after the order is placed.
2. **Audit trail** -- you can always trace back to the exact rate used and where it came from (useful for reconciling refunds and disputes).

The rate, timestamp and source are populated from an [`ExchangeRateQuote`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/ExchangeRates/Models/ExchangeRateQuote.cs) returned by `IExchangeRateCache.GetRateQuoteAsync()` at invoice creation time.

## Store Currency Equivalents

On the invoice, the primary monetary fields (`Total`, `SubTotal`, `Tax`, `Discount`, `ShippingCost`) are in the **customer's presentment currency**. Alongside them, Merchello writes parallel amounts in the store currency so reporting can aggregate consistently regardless of which currency the customer paid in:

| Presentment field | Store currency equivalent |
|-------------------|---------------------------|
| `SubTotal` | `SubTotalInStoreCurrency` |
| `Tax` | `TaxInStoreCurrency` |
| `Discount` | `DiscountInStoreCurrency` |
| `Total` | `TotalInStoreCurrency` |
| `ShippingCost` | `ShippingCostInStoreCurrency` |
| `LineItem.Amount` | `LineItem.AmountInStoreCurrency` |
| `LineItem.Cost` | `LineItem.CostInStoreCurrency` |

Reporting queries always use the `*InStoreCurrency` fields so totals can be summed across invoices without looking up historical exchange rates. See [Architecture-Diagrams.md Section 5.6](https://github.com/YodasMyDad/Merchello/blob/main/docs/Architecture-Diagrams.md) for the full field matrix.

## How Display Conversion Works

When a customer browses in a non-store currency:

1. `StorefrontContextService.GetDisplayContextAsync()` fetches the current exchange rate and display preferences.
2. Product prices are converted on the fly for display using **multiply** (`amount * rate`).
3. The basket shows totals in the customer's currency.
4. The stored basket amounts remain in store currency.

```
Stored basket:   SubTotal = 100.00 GBP (store currency)
Display rate:    1.17 EUR/GBP
Displayed as:    117.00 EUR            (100 * 1.17)
```

If the rate changes between visits, the displayed price changes -- but the underlying store currency amount stays the same. The display-side extension methods (for example `basket.GetDisplayAmounts(...)` and `lineItem.GetDisplayLineItemTotal(...)`) are the only sanctioned place to apply display rates.

## How Checkout Conversion Works

At checkout, when the invoice is created:

1. The current exchange rate quote is fetched via `IExchangeRateCache.GetRateQuoteAsync(presentmentCurrency, storeCurrency, ct)`.
2. The rate, source and UTC timestamp are written to the invoice (`PricingExchangeRate`, `PricingExchangeRateSource`, `PricingExchangeRateTimestampUtc`).
3. Primary amounts (`Total`, `SubTotal`, `Tax`, `Discount`, `ShippingCost`) are computed in the customer's presentment currency using **divide** (`storeAmount / rate`), then rounded per-currency via `ICurrencyService.Round(...)`.
4. Parallel `*InStoreCurrency` fields are written for reporting.

From this point forward, the locked rate is used for all calculations on this invoice, including edits, refunds and payment processing. The customer is charged from the invoice amounts, **not** from the display conversion used while they were browsing.

```csharp
// WRONG - using display amounts at payment time
var displayAmounts = basket.GetDisplayAmounts(context, currencyService);
config.Amount = displayAmounts.Total;

// CORRECT - invoice conversion path
var quote = await exchangeRateCache.GetRateQuoteAsync(presentmentCurrency, storeCurrency, ct);
var total = currencyService.Round(basket.Total / quote.Rate, presentmentCurrency);
config.Amount = total;
```

## Currency on Invoices

| Field | Description |
|-------|-------------|
| `CurrencyCode` | Customer's payment (presentment) currency (e.g., `"EUR"`) |
| `CurrencySymbol` | Snapshot symbol for display (e.g., `"€"`) |
| `StoreCurrencyCode` | Store's base currency snapshot (protects reporting if store settings change later) |
| `PricingExchangeRate` | Locked presentment-to-store rate |
| `PricingExchangeRateSource` | Provider alias that supplied the rate |
| `PricingExchangeRateTimestampUtc` | When the rate was captured |

## Country -> Currency Auto-Selection

When a shipping or billing country changes, Merchello can auto-map the customer's display currency using `ICountryCurrencyMappingService.GetCurrencyForCountry(...)` (80+ built-in country-to-currency mappings). The customer's choice is then persisted in the `Merchello` currency cookie (30-day expiry). A customer can override the auto-selected currency via:

```http
POST /api/merchello/storefront/currency
Content-Type: application/json

{
    "currencyCode": "EUR"
}
```

The GET counterpart returns the current display currency:

```http
GET /api/merchello/storefront/currency
```

Endpoints live on [`StorefrontApiController.cs:273-310`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello/Controllers/StorefrontApiController.cs#L273).

## Best Practices

1. **Never convert manually.** Always go through `IExchangeRateCache` for rate quotes and `IStorefrontContextService` / display extensions for UI conversion.
2. **Don't mutate stored basket amounts when display currency changes.** Amounts in the basket are the financial source of truth until invoice creation.
3. **Check rate freshness.** The exchange rate cache has a configurable TTL (see [Exchange Rate Providers](exchange-rate-providers.md)). Stale rates affect the customer experience, not the invoice (which is locked).
4. **Audit rate locks.** The three `PricingExchangeRate*` fields let you reconcile any rate disputes with customers.
5. **Report in store currency.** Always use `*InStoreCurrency` fields for financial aggregation.
6. **Don't `.toFixed()` in the frontend.** Use `formatCurrency` / `formatNumber` from `@shared/utils/formatting.js` -- rounding rules vary by currency (e.g. JPY has zero decimal places, BHD has three).

## Next Steps

- [Exchange Rate Providers](exchange-rate-providers.md) -- how rates are fetched, cached and refreshed
- [Creating Custom Exchange Rate Providers](../extending/creating-exchange-rate-providers.md) -- implement `IExchangeRateProvider` for a premium data source
- [Checkout Flow](../checkout/checkout-flow.md) -- where rate locking fits in the checkout pipeline
- [Payments Overview](../payments/payment-system-overview.md) -- how payment providers consume locked invoice amounts

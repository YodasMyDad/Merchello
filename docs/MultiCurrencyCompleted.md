# Currency Architecture Fix (Shopify Approach)

## Architecture
Shopify-style ([source](https://help.shopify.com/en/manual/international/pricing/exchange-rates)):
- Basket stays in store currency (USD)
- Display converts on-the-fly everywhere
- Exchange rate locked at invoice creation

**Flow:** Product(USD) → Basket(USD) → Display(on-the-fly) → Invoice(rate locked) → Payment(invoice values)

**Trade-off:** Slight price fluctuation between browse/checkout acceptable (industry standard).

## Bug Summary

**Critical bugs in `CheckoutPaymentsApiController.cs`:**

| Endpoint (Lines) | Issue |
|------------------|-------|
| `GetExpressCheckoutConfig` (1154-1161) | Currency=GBP but Amount=USD value |
| `CreateExpressPaymentIntent` (1268-1276) | Same mismatch |

**Client-side issues:** `SinglePage.cshtml` (22-27, 95-96), `_OrderSummary.cshtml` (26-30) - manual `* exchangeRate` without currency-aware rounding.

**JS workaround to remove:** `express-checkout.js` (95-106) overrides API amounts - masks backend bug.

**Verified correct:** `InvoiceService.CreateOrderFromBasketAsync`, `ApplyPricingRateToStoreAmounts`, `ExchangeRateCache`, `CurrencyService.Round`, all post-invoice endpoints.

## Fix Implementation

### Pattern (all pre-invoice endpoints)
```csharp
var currencyContext = await storefrontContextService.GetCurrencyContextAsync(ct);
var displayAmounts = basket.GetDisplayAmounts(
    currencyContext.ExchangeRate, currencyService, currencyContext.CurrencyCode);
// Use: Amount = displayAmounts.Total, Currency = currencyContext.CurrencyCode
```

### Phase 1: DisplayCurrencyExtensions.cs (CREATE)
Location: `src/Merchello.Core/Checkout/Extensions/`

Extensions: `GetDisplayAmounts(basket, rate, svc, currency)` → `DisplayAmounts` record, `GetDisplayTotal(lineItem, ...)`, `GetDisplayDiscountAmount(lineItem, ...)`

All use `ICurrencyService.Round()` for JPY=0, BHD=3, default=2 decimals.

### Phase 2: Fix Payment Endpoints
Apply pattern to: `GetExpressCheckoutConfig`, `CreateExpressPaymentIntent`

Already correct (use invoice amounts): `ProcessExpressCheckout`, `InitiateHostedPayment`, `InitiatePayment`, `ProcessPayment`, `InitiateWidgetPayment`, `CaptureWidgetOrder`

### Phase 3: Invoice Line Item Conversion ✅
Added `ConvertToPresentmentCurrency()` (~line 3013) - divides by rate for store→presentment.
Applied to: line items (~290), add-ons (~306), discounts (~323), shipping (~248).

`ApplyPricingRateToStoreAmounts()` multiplies (opposite) for `TotalInStoreCurrency` reporting.

Invoice fields: `PricingExchangeRate`, `PricingExchangeRateSource`, `PricingExchangeRateTimestampUtc`, `CurrencyCode`, `StoreCurrencyCode`, `TotalInStoreCurrency` - all implemented.

### Phase 4: View Updates ✅
`CheckoutViewModel.cs`: Added `DisplayTotal/SubTotal/Shipping/Tax/Discount`, `CurrencyDecimalPlaces`

`MerchelloCheckoutController`: Calculates display amounts before view.

`SinglePage.cshtml`, `_OrderSummary.cshtml`: Use pre-calculated values with `$"N{decimalPlaces}"` format.

### Phase 5: ConvertBasketCurrencyAsync Refactor ✅
Now only updates `basket.Currency`/`CurrencySymbol` (display preference). Amounts unchanged (Shopify approach). Still publishes notifications with rate.

### Phase 6: Remove JS Workaround
Delete `express-checkout.js` lines 95-106 after backend fix deployed.

## Files Modified

| File | Action |
|------|--------|
| `Checkout/Extensions/DisplayCurrencyExtensions.cs` | CREATE |
| `CheckoutPaymentsApiController.cs` | FIX endpoints |
| `InvoiceService.cs` | ADD conversion method |
| `LineItemFactory.cs` | UPDATE addon/discount methods |
| `CheckoutViewModel.cs` | ADD display props |
| `MerchelloCheckoutController.cs` | ADD display calc |
| `SinglePage.cshtml`, `_OrderSummary.cshtml` | FIX formatting |
| `CheckoutService.cs` | ADD currency update |
| `express-checkout.js` | REMOVE workaround |

## Verification

1. **Display:** Set currency to GBP → all prices show £ (converted)
2. **Basket:** Add item → internal USD, display GBP
3. **Checkout:** Totals + shipping in GBP
4. **Payments (all types):** Express/Hosted/Direct/Widget show GBP, charge GBP, amount matches display
5. **Invoice:** Has `CurrencyCode=GBP`, `Total=GBP`, `TotalInStoreCurrency=USD`, `PricingExchangeRate=locked`
6. **Admin:** Shows GBP, reports aggregate USD via `TotalInStoreCurrency`

## Edge Cases
- Rate change browse→checkout: Customer sees current rate (accepted)
- Rate change checkout→payment: Invoice locked, payment uses invoice
- Currency change mid-session: Display updates, basket unchanged
- Return visitor: Display in their currency, basket unchanged

## Unit Tests

**DisplayCurrencyExtensions:** `GetDisplayAmounts_WithRate_ConvertsCorrectly`, `_ZeroDecimalCurrency_RoundsCorrectly`, `_NullBasket_ReturnsZeros`

**ConvertBasketCurrencyAsync:** `_DoesNotConvertAmounts` (verify Shopify approach), `_PublishesNotifications`

**Payments:** `GetExpressCheckoutConfig_ReturnsConvertedAmounts`, `CreateExpressPaymentIntent_SendsCorrectCurrencyToProvider`

## Sources
- [Shopify Exchange Rates](https://help.shopify.com/en/manual/international/pricing/exchange-rates)
- [Shopify Multi-currency](https://help.shopify.com/en/manual/payments/shopify-payments/store-currency/multi-currency)

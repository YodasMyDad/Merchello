# Currency Architecture Fix (Shopify Approach)

## Chosen Architecture: Shopify-Style

Following Shopify's proven approach ([source](https://help.shopify.com/en/manual/international/pricing/exchange-rates)):

- **Basket stays in store currency (USD)** - No basket conversion needed
- **Display is on-the-fly everywhere** - All prices converted for display using current rate
- **Exchange rate locked at payment time** - When invoice is created, rate is captured

```
Product in DB (USD) ────► Basket (USD) ────► Checkout Display (GBP on-the-fly)
                                                        │
                                                        ▼
                                                Invoice Creation
                                                ┌─────────────────────────────────┐
                                                │ Rate locked HERE                │
                                                │ • Convert basket.Total to GBP   │
                                                │ • Lock rate on invoice          │
                                                │ • Store USD equivalent          │
                                                └─────────────────────────────────┘
                                                        │
                                                        ▼
                                                Payment in GBP
                                                (uses invoice values)
```

## Why Shopify Approach?

| Aspect | Shopify (Chosen) | Early-Lock (Rejected) |
|--------|------------------|----------------------|
| Basket storage | Always USD | Converted to display currency |
| Conversion point | At invoice creation | At add-to-cart |
| Complexity | Simple | Complex |
| Rate changes | Prices may fluctuate slightly | Price locked from add-to-cart |
| Proven at scale | Yes (millions of stores) | No |

**Trade-off accepted:** Customer might see £80.00 when browsing and £80.15 at checkout if rate changed. This is acceptable and how Shopify works.

---

## The Fix

### Current Bug

```csharp
// CheckoutPaymentsApiController - CURRENT (WRONG)
Amount = basket?.Total ?? 0,           // USD amount
Currency = currencyContext.CurrencyCode,  // GBP currency code
// MISMATCH!
```

### The Solution

**Everything stays in USD until invoice creation.** All display is on-the-fly conversion.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           STOREFRONT & CHECKOUT                             │
│                                                                             │
│  Product Page:     $100 USD in DB  →  Display: £80 (on-the-fly)            │
│  Add to Basket:    Line item stored as $100 USD                            │
│  Basket Display:   $100 USD  →  Display: £80 (on-the-fly)                  │
│  Checkout Display: $120 USD total  →  Display: £96 (on-the-fly)            │
│  Shipping Options: $10 USD  →  Display: £8 (on-the-fly)                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INVOICE CREATION (Rate Locked)                      │
│                                                                             │
│  1. Get current exchange rate (e.g., 0.80)                                 │
│  2. Convert basket totals: $120 × 0.80 = £96                               │
│  3. Create invoice:                                                         │
│     • CurrencyCode = "GBP"                                                 │
│     • Total = £96                                                          │
│     • StoreCurrencyCode = "USD"                                            │
│     • TotalInStoreCurrency = $120                                          │
│     • PricingExchangeRate = 0.80 (LOCKED)                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PAYMENT                                        │
│                                                                             │
│  Uses invoice values directly:                                              │
│  • Amount = invoice.Total (£96)                                            │
│  • Currency = invoice.CurrencyCode ("GBP")                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Audit Findings

### Confirmed Bugs

#### Bug #1: GetExpressCheckoutConfig (Critical)
**File:** `src/Merchello/Controllers/CheckoutPaymentsApiController.cs` (Lines 1154-1161)

Current code sends **mismatched** currency code and amount:
```csharp
Currency = currencyContext.CurrencyCode,  // Display currency (e.g., "GBP")
Amount = basket?.Total ?? 0,               // Store currency amount (e.g., 100.00 USD)
```

**Impact:** Payment providers receive GBP as currency but USD amount, causing incorrect charges.

#### Bug #2: CreateExpressPaymentIntent (Critical)
**File:** `src/Merchello/Controllers/CheckoutPaymentsApiController.cs` (Lines 1268-1276)

Same mismatch:
```csharp
Amount = basket.Total,                     // Store currency (USD)
Currency = currencyContext.CurrencyCode,   // Display currency (GBP)
```

**Impact:** Payment provider creates intent with wrong amount.

### Client-Side Conversion Issues

| File | Lines | Issue |
|------|-------|-------|
| `SinglePage.cshtml` | 22-27 | Manual `* exchangeRate` without proper rounding |
| `_OrderSummary.cshtml` | 26-30 | Same manual multiplication without currency-aware rounding |
| `SinglePage.cshtml` | 95-96 | Discount line items formatted with N2, ignores currency decimals (JPY=0) |

### JavaScript Workaround (To Remove After Fix)

`express-checkout.js` lines 95-106 override API amounts with checkout store values:
```javascript
const store = this.$store?.checkout;
if (store?.basket) {
    this.config.amount = store.basket.total ?? this.config.amount;
}
```
This masks the backend bug and should be removed after the fix is implemented.

### Verified Correct Components

| Component | Status | Notes |
|-----------|--------|-------|
| `InvoiceService.CreateOrderFromBasketAsync` | ✓ Correct | Properly locks exchange rate at invoice creation |
| `ApplyPricingRateToStoreAmounts` | ✓ Correct | Converts all amounts with proper rounding |
| `ExchangeRateCache.GetRateQuoteAsync` | ✓ Correct | Includes rate, timestamp, source for audit trail |
| `CurrencyService.Round` | ✓ Correct | Handles JPY (0), BHD (3), default (2) decimals |
| `ProcessExpressCheckout` endpoint | ✓ Correct | Uses invoice amounts after creation |
| `ProcessPayment` endpoint | ✓ Correct | Uses invoice amounts |
| Widget payment endpoints | ✓ Correct | Use invoice amounts |

---

## Fix Plan

### Phase 1: Centralized Display Conversion (Extension Methods)

Create extension methods for all display conversions. Uses existing `ICurrencyService` for proper currency-aware rounding.

#### 1.1 Create `DisplayCurrencyExtensions.cs`

Location: `src/Merchello.Core/Checkout/Extensions/DisplayCurrencyExtensions.cs`

```csharp
using Merchello.Core.Checkout.Models;
using Merchello.Core.Shared.Services.Interfaces;

namespace Merchello.Core.Checkout.Extensions;

/// <summary>
/// Extension methods for display currency conversions.
/// Uses ICurrencyService for proper rounding per currency (JPY=0, BHD=3, default=2 decimals).
/// </summary>
public static class DisplayCurrencyExtensions
{
    /// <summary>
    /// Get basket totals converted to display currency with proper rounding.
    /// </summary>
    public static DisplayAmounts GetDisplayAmounts(
        this Basket? basket,
        decimal exchangeRate,
        ICurrencyService currencyService,
        string targetCurrency)
    {
        if (basket == null)
            return new DisplayAmounts(0, 0, 0, 0, 0);

        return new DisplayAmounts(
            currencyService.Round(basket.Total * exchangeRate, targetCurrency),
            currencyService.Round(basket.SubTotal * exchangeRate, targetCurrency),
            currencyService.Round(basket.Shipping * exchangeRate, targetCurrency),
            currencyService.Round(basket.Tax * exchangeRate, targetCurrency),
            currencyService.Round(basket.Discount * exchangeRate, targetCurrency)
        );
    }

    /// <summary>
    /// Get line item total converted to display currency.
    /// </summary>
    public static decimal GetDisplayTotal(
        this LineItem lineItem,
        decimal exchangeRate,
        ICurrencyService currencyService,
        string targetCurrency)
    {
        return currencyService.Round(
            lineItem.Amount * lineItem.Quantity * exchangeRate,
            targetCurrency);
    }

    /// <summary>
    /// Get discount amount converted to display currency.
    /// </summary>
    public static decimal GetDisplayDiscountAmount(
        this LineItem discountItem,
        decimal exchangeRate,
        ICurrencyService currencyService,
        string targetCurrency)
    {
        return currencyService.Round(
            Math.Abs(discountItem.Amount * discountItem.Quantity) * exchangeRate,
            targetCurrency);
    }
}

/// <summary>
/// Display amounts in customer's selected currency.
/// </summary>
public record DisplayAmounts(
    decimal Total,
    decimal SubTotal,
    decimal Shipping,
    decimal Tax,
    decimal Discount);
```

#### 1.2 Update all display points to use extension methods

| Location | Current | After Fix |
|----------|---------|-----------|
| Product listing | On-the-fly ✓ | No change |
| Product detail | On-the-fly ✓ | No change |
| Basket display | Mixed/broken | Use `basket.GetDisplayAmounts(exchangeRate)` |
| Checkout display | Mixed/broken | Use `basket.GetDisplayAmounts(exchangeRate)` |
| Shipping options | On-the-fly ✓ | No change |
| Express payment buttons | WRONG | Use `basket.GetDisplayAmounts(exchangeRate).Total` |
| Line items | Manual multiply | Use `lineItem.GetDisplayTotal(exchangeRate)` |

### Phase 2: Fix ALL Payment Endpoints

**All payment methods** must convert basket totals before sending to providers:

| Payment Method | Endpoint | Fix Required |
|----------------|----------|--------------|
| Express (PayPal, Apple Pay, Google Pay) | `GetExpressCheckoutConfig`, `CreateExpressPaymentIntent` | Convert basket total |
| Hosted (redirect to provider) | `InitiateHostedPayment` | Convert basket total |
| Direct (card form on page) | `InitiatePayment`, `ProcessPayment` | Convert basket total |
| Widget (embedded) | `InitiateWidgetPayment` | Convert basket total |

#### 2.1 Update `CheckoutPaymentsApiController.GetExpressCheckoutConfig`

```csharp
using Merchello.Core.Checkout.Extensions;

// Get currency context
var currencyContext = await storefrontContextService.GetCurrencyContextAsync(ct);

// Convert basket totals using extension method (ICurrencyService already injected)
var displayAmounts = basket.GetDisplayAmounts(
    currencyContext.ExchangeRate,
    currencyService,
    currencyContext.CurrencyCode);

var config = new ExpressCheckoutConfigDto
{
    Currency = currencyContext.CurrencyCode,  // GBP
    Amount = displayAmounts.Total,             // £96 (converted from $120)
    SubTotal = displayAmounts.SubTotal,
    Shipping = displayAmounts.Shipping,
    Tax = displayAmounts.Tax,
    Methods = []
};
```

#### 2.2 Update `CreateExpressPaymentIntent`

```csharp
using Merchello.Core.Checkout.Extensions;

var currencyContext = await storefrontContextService.GetCurrencyContextAsync(ct);
var displayAmounts = basket.GetDisplayAmounts(
    currencyContext.ExchangeRate,
    currencyService,
    currencyContext.CurrencyCode);

var paymentRequest = new PaymentRequest
{
    Amount = displayAmounts.Total,            // Converted amount
    Currency = currencyContext.CurrencyCode,  // Display currency
    // ...
};
```

#### 2.3 Note: Already Correct Endpoints

The following endpoints **do not need changes** - they already create an invoice first and use invoice amounts:

| Endpoint | Why It's Correct |
|----------|------------------|
| `InitiateHostedPayment` | Creates invoice first, uses `invoice.Total` |
| `InitiatePayment` / `ProcessPayment` | Creates invoice first, uses `invoice.Total` |
| `InitiateWidgetPayment` / `CaptureWidgetOrder` | Creates invoice first, uses `invoice.Total` |
| `ProcessExpressCheckout` | Creates invoice first, uses `invoice.Total` and `invoice.CurrencyCode` |

These endpoints follow the correct pattern: **invoice creation locks the exchange rate**, then payment uses invoice values.

#### 2.4 Pattern for Pre-Invoice Payment Endpoints

**Every endpoint that sends amount to a payment provider must:**

```csharp
using Merchello.Core.Checkout.Extensions;

// 1. Get currency context
var currencyContext = await storefrontContextService.GetCurrencyContextAsync(ct);

// 2. Convert basket totals using extension method (currencyService already injected)
var displayAmounts = basket.GetDisplayAmounts(
    currencyContext.ExchangeRate,
    currencyService,
    currencyContext.CurrencyCode);

// 3. Use converted amount with matching currency
Amount = displayAmounts.Total,
Currency = currencyContext.CurrencyCode,
```

### Phase 3: Invoice Creation (Fixed - Centralized Conversion)

**Status: FIXED - Line items, add-ons, and discounts now converted**

The `InvoiceService.CreateOrderFromBasketAsync` method uses a centralized conversion pattern:

#### 3.1 Centralized Conversion Method

Added `ConvertToPresentmentCurrency()` at line ~3013:
```csharp
/// <summary>
/// Converts an amount from store currency to presentment currency.
/// Rate is presentment → store, so divide to convert store → presentment.
/// </summary>
private decimal ConvertToPresentmentCurrency(
    decimal storeCurrencyAmount,
    ExchangeRateQuote? pricingQuote,
    string presentmentCurrency)
{
    if (pricingQuote == null || pricingQuote.Rate <= 0m)
        return storeCurrencyAmount;

    return currencyService.Round(storeCurrencyAmount / pricingQuote.Rate, presentmentCurrency);
}
```

#### 3.2 All Amounts Now Converted

| Item Type | Location | Conversion |
|-----------|----------|------------|
| Line items | ~line 290 | `ConvertToPresentmentCurrency(shippingLineItem.Amount, pricingQuote, presentmentCurrency)` |
| Add-ons | ~line 306 | `ConvertToPresentmentCurrency(addon.Amount, pricingQuote, presentmentCurrency)` |
| Discounts | ~line 323 | `ConvertToPresentmentCurrency(discountLineItem.Amount, pricingQuote, presentmentCurrency)` |
| Shipping | ~line 248 | `ConvertToPresentmentCurrency(shippingCost, pricingQuote, presentmentCurrency)` |

#### 3.3 No Double Conversion

The conversion flow is intentionally two-step:
1. `ConvertToPresentmentCurrency()` - **divides** by rate (store → presentment for invoice amounts)
2. `ApplyPricingRateToStoreAmounts()` - **multiplies** by rate (presentment → store for reporting)

These are **opposite operations** for different purposes:
- `Invoice.Total` = £80 GBP (what customer pays)
- `Invoice.TotalInStoreCurrency` = $100 USD (for internal reports)

#### 3.4 Invoice Fields

| Field | Purpose | Status |
|-------|---------|--------|
| `PricingExchangeRate` | Locked rate at invoice creation | ✓ Already implemented |
| `PricingExchangeRateSource` | Provider alias (e.g., "fixer.io") | ✓ Already implemented |
| `PricingExchangeRateTimestampUtc` | When rate was retrieved | ✓ Already implemented |
| `CurrencyCode` | Customer's display currency | ✓ Already implemented |
| `StoreCurrencyCode` | Store's base currency | ✓ Already implemented |
| `TotalInStoreCurrency` | Original USD amount for reporting | ✓ Already implemented |

### Phase 4: Update Views with Pre-Calculated Display Amounts ✅ COMPLETE

Views receive **pre-calculated** display amounts from ViewModel, ensuring proper rounding via `ICurrencyService`.

#### 4.1 CheckoutViewModel.cs ✅

**File:** `src/Merchello/Models/CheckoutViewModel.cs`

Added properties:
```csharp
public decimal DisplayTotal { get; init; }
public decimal DisplaySubTotal { get; init; }
public decimal DisplayShipping { get; init; }
public decimal DisplayTax { get; init; }
public decimal DisplayDiscount { get; init; }
public int CurrencyDecimalPlaces { get; init; } = 2;  // For JPY=0, BHD=3, etc.
```

#### 4.2 MerchelloCheckoutController ✅

Calculates display amounts before passing to view:
```csharp
var currencyContext = await storefrontContext.GetCurrencyContextAsync(ct);
var displayAmounts = basket.GetDisplayAmounts(
    currencyContext.ExchangeRate,
    currencyService,
    currencyContext.CurrencyCode);

var viewModel = new CheckoutViewModel(...)
{
    DisplayTotal = displayAmounts.Total,
    DisplaySubTotal = displayAmounts.SubTotal,
    DisplayShipping = displayAmounts.Shipping,
    DisplayTax = displayAmounts.Tax,
    DisplayDiscount = displayAmounts.Discount,
    CurrencyDecimalPlaces = currencyContext.DecimalPlaces
};
```

#### 4.3 SinglePage.cshtml ✅

**Totals:** Now use pre-calculated `Model.DisplayTotal`, `Model.DisplaySubTotal`, etc.

**Discount line items:** Fixed to use proper rounding with decimal places:
```csharp
var decimalPlaces = Model.CurrencyDecimalPlaces;
// ...
amount = Math.Round(Math.Abs(d.Amount * d.Quantity) * exchangeRate, decimalPlaces),
formattedAmount = $"{displayCurrencySymbol}{Math.Round(..., decimalPlaces).ToString($"N{decimalPlaces}")}",
```

#### 4.4 _OrderSummary.cshtml ✅

**Totals:** Use pre-calculated display values from ViewModel with proper formatting.

**All currency displays:** Fixed to use `numberFormat` instead of hardcoded `:N2`:
```csharp
var decimalPlaces = isReadonly ? 2 : (model?.CurrencyDecimalPlaces ?? 2);
var numberFormat = $"N{decimalPlaces}";

// Line item prices - properly rounded
@displayCurrencySymbol@(Math.Round((item.Amount * item.Quantity) * exchangeRate, decimalPlaces).ToString(numberFormat))

// Totals - use pre-calculated values with proper format
$"{displayCurrencySymbol}{displayTotal.ToString(numberFormat)}"
$"{displayCurrencySymbol}{displaySubTotal.ToString(numberFormat)}"
$"{displayCurrencySymbol}{displayShipping.ToString(numberFormat)}"
$"{displayCurrencySymbol}{displayTax.ToString(numberFormat)}"
```

### Phase 5: Refactor `ConvertBasketCurrencyAsync` ✅ COMPLETE

**Decision:** Refactor to update display preference only (Shopify approach). This:
- Maintains the `ICheckoutService` interface (no breaking changes)
- Aligns with Shopify (basket amounts stay in store currency)
- Keeps clean separation of concerns (display vs storage)
- Updates `basket.Currency` and `basket.CurrencySymbol` for downstream use (invoices, shipping quotes, etc.)

**File:** `src/Merchello.Core/Checkout/Services/CheckoutService.cs`

**Key changes:**
- Removed line item amount conversion (amounts stay in store currency)
- Added `basket.Currency` and `basket.CurrencySymbol` update
- Kept notification publishing with exchange rate for handlers

**Implementation (lines 830-845):**
```csharp
// NOTE: We intentionally do NOT modify basket amounts here.
// Basket amounts always stay in store currency.
// Display conversion happens at render time using DisplayCurrencyExtensions.

// Update display preference only - NO amount conversion (Shopify approach)
basket.Currency = newCurrencyCode;
basket.CurrencySymbol = currencyService.GetCurrency(newCurrencyCode).Symbol;
basket.DateUpdated = DateTime.UtcNow;

await SaveBasketAsync(basket, cancellationToken);

// Publish "After" notification (rate provided for notification handlers that need it)
await notificationPublisher.PublishAsync(
    new BasketCurrencyChangedNotification(basket, storeCurrencyCode, newCurrencyCode, rate.Value),
    cancellationToken);

result.ResultObject = basket;
return result;
```

**Why `basket.Currency` is updated:**
The `basket.Currency` property is used by:
- `InvoiceService` - determines invoice presentment currency
- `InvoiceFactory` - sets currency symbol on invoice
- `ShippingQuoteService` - includes currency in shipping quotes
- `AbandonedCheckoutService` - preserves customer's currency preference

### Phase 6: Remove JavaScript Workaround

**File:** `src/Merchello/wwwroot/js/checkout/components/express-checkout.js`

**Remove lines 95-106** (after backend fix is deployed):
```javascript
// DELETE - This workaround is no longer needed after backend fix
const store = this.$store?.checkout;
if (store?.basket) {
    this.config.amount = store.basket.total ?? this.config.amount;
    this.config.subTotal = store.basket.subtotal ?? this.config.subTotal;
    this.config.shipping = store.basket.shipping ?? this.config.shipping;
    this.config.tax = store.basket.tax ?? this.config.tax;
}
if (store?.currency?.code) {
    this.config.currency = store.currency.code;
}
```

The API now returns correctly converted amounts directly.

---

## Files Modified (All Complete)

| File | Action | Phase | Status |
|------|--------|-------|--------|
| `Merchello.Core/Checkout/Extensions/DisplayCurrencyExtensions.cs` | CREATE extension methods | 1 | ✅ Done |
| `CheckoutPaymentsApiController.cs` | FIX amount/currency mismatch | 2 | ✅ Done |
| `InvoiceService.cs` | ADD `ConvertToPresentmentCurrency()`, apply to all line items | 3 | ✅ Done |
| `LineItemFactory.cs` | UPDATE `CreateAddonForOrder()` and `CreateDiscountForOrder()` to accept amount | 3 | ✅ Done |
| `CheckoutViewModel.cs` | ADD display properties + CurrencyDecimalPlaces | 4 | ✅ Done |
| `MerchelloCheckoutController.cs` | ADD display amount calculation | 4 | ✅ Done |
| `SinglePage.cshtml` | FIX discount formatting with proper rounding | 4 | ✅ Done |
| `_OrderSummary.cshtml` | FIX line item formatting with proper rounding | 4 | ✅ Done |
| `CheckoutService.cs` | ADD basket.Currency/CurrencySymbol update | 5 | ✅ Done |
| `express-checkout.js` | REMOVE workaround | 6 | ✅ Done |

### Payment Endpoints Summary

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GetExpressCheckoutConfig` | ✅ Fixed | Uses `basket.GetDisplayAmounts()` |
| `CreateExpressPaymentIntent` | ✅ Fixed | Uses `basket.GetDisplayAmounts()` |
| `ProcessExpressCheckout` | ✅ Correct | Uses invoice amounts |
| `InitiateHostedPayment` | ✅ Correct | Uses invoice amounts |
| `InitiatePayment` | ✅ Correct | Uses invoice amounts |
| `ProcessPayment` | ✅ Correct | Uses invoice amounts |
| `InitiateWidgetPayment` | ✅ Correct | Uses invoice amounts |

---

## What Does NOT Change

| Component | Why |
|-----------|-----|
| `Basket.cs` | No new fields needed - basket stays in USD |
| Add to basket flow | Items added in USD, no conversion |
| Product display | Already does on-the-fly conversion |
| Shipping options | Already does on-the-fly conversion |

## What DID Change (Phase 3 Fixes)

| Component | Change |
|-----------|--------|
| `InvoiceService.cs` | Added `ConvertToPresentmentCurrency()` method, applied to all line items at invoice creation |
| `LineItemFactory.cs` | Updated `CreateAddonForOrder()` and `CreateDiscountForOrder()` to accept pre-converted amount parameter |

---

## Flow Summary

```
1. PRODUCT PAGE
   DB: $100 USD
   Display: £80 GBP (on-the-fly: $100 × 0.80)

2. ADD TO BASKET
   Basket stores: $100 USD (no conversion)

3. BASKET PAGE
   Basket has: $100 USD
   Display: £80 GBP (on-the-fly)

4. CHECKOUT PAGE
   Basket total: $120 USD
   Display: £96 GBP (on-the-fly)
   Shipping options: converted on-the-fly

5. EXPRESS PAYMENT BUTTON
   var currencyContext = await storefrontContextService.GetCurrencyContextAsync(ct);
   var displayAmounts = basket.GetDisplayAmounts(
       currencyContext.ExchangeRate,
       currencyService,
       currencyContext.CurrencyCode);
   Send to PayPal/Apple Pay: displayAmounts.Total = £96 ✓

6. INVOICE CREATION (Rate Locked Here!)
   Get current rate: 0.80 (might have changed slightly)
   Create invoice:
     CurrencyCode = "GBP"
     Total = £96 (converted)
     TotalInStoreCurrency = $120 (original)
     PricingExchangeRate = 0.80 (LOCKED)

7. PAYMENT PROCESSING
   Use invoice.Total = £96
   Use invoice.CurrencyCode = "GBP"
   Customer charged £96 GBP ✓

8. ADMIN/REPORTS
   Order shows: £96 GBP
   Reports aggregate: $120 USD (using TotalInStoreCurrency)
```

---

## Verification Steps

### 1. Product Display
- Set currency to GBP
- View product - should show £ price (converted from USD)

### 2. Add to Basket
- Add item to basket
- Verify basket internally stores USD amount
- Verify display shows GBP (converted)

### 3. Checkout Display
- Go to checkout
- Verify all totals display in GBP
- Verify shipping options display in GBP

### 4. Express Checkout (PayPal, Apple Pay, Google Pay)
- Click PayPal/Apple Pay/Google Pay button
- Verify payment sheet shows GBP amount
- Verify amount matches checkout total displayed
- Complete payment and verify charged in GBP

### 4b. Hosted Payment (Redirect)
- Select hosted payment method (e.g., Stripe Checkout, PayPal Standard)
- Verify redirect URL contains correct GBP amount
- Complete payment on provider page
- Verify charged in GBP

### 4c. Direct Payment (Card Form)
- Enter card details on checkout page
- Submit payment
- Verify payment processed in GBP
- Verify amount matches checkout total

### 4d. Widget Payment (Embedded)
- Use embedded payment widget
- Verify widget shows GBP amount
- Complete payment
- Verify charged in GBP

### 5. Complete Order
- Complete checkout
- Verify invoice has:
  - `CurrencyCode` = "GBP"
  - `Total` = GBP amount
  - `TotalInStoreCurrency` = USD amount
  - `PricingExchangeRate` = locked rate

### 6. Admin View
- View order in admin
- Verify shows GBP amounts
- Verify reports can aggregate using USD equivalents

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Rate changes between browse and checkout | Accepted - customer sees current rate at checkout |
| Rate changes between checkout and payment | Invoice has locked rate, payment uses invoice values |
| Customer changes currency mid-session | Display updates immediately, basket stays USD |
| Return visitor with currency cookie | Display in their currency, basket unchanged |

---

## Architecture Alignment

Per `docs/Architecture-Diagrams.md`:

| Principle | Compliance |
|-----------|------------|
| Controllers thin, no logic | ✓ Controllers call service/extension methods |
| Services hold business logic | ✓ ICurrencyService.Round() handles conversion |
| Factories for creation | ✓ InvoiceFactory unchanged |
| RORO parameters | ✓ DisplayAmounts record for returns |
| DbContext in services only | ✓ No DB access in extensions |

### Calculation Flow (Unchanged)

```
CheckoutService.CalculateBasketAsync() → LineItemService.CalculateFromLineItems()
                                        (stays in store currency)
                                                    ↓
                                         Display: extension methods convert
                                                    ↓
                                         Invoice: rate locked at creation
```

---

## Unit Tests Required

### DisplayCurrencyExtensions Tests

```csharp
[Fact]
public void GetDisplayAmounts_WithRate_ConvertsCorrectly()
{
    var basket = new Basket { Total = 100, SubTotal = 90, Tax = 10 };
    var mockCurrencyService = CreateMockCurrencyService();

    var result = basket.GetDisplayAmounts(0.80m, mockCurrencyService, "GBP");

    result.Total.ShouldBe(80m);
    result.SubTotal.ShouldBe(72m);
    result.Tax.ShouldBe(8m);
}

[Fact]
public void GetDisplayAmounts_ZeroDecimalCurrency_RoundsCorrectly()
{
    var basket = new Basket { Total = 100.50m };
    var mockCurrencyService = CreateMockCurrencyService(); // Returns 0 decimals for JPY

    var result = basket.GetDisplayAmounts(150m, mockCurrencyService, "JPY");

    result.Total.ShouldBe(15075m); // No decimals for JPY
}

[Fact]
public void GetDisplayAmounts_NullBasket_ReturnsZeros()
{
    Basket? basket = null;
    var mockCurrencyService = CreateMockCurrencyService();

    var result = basket.GetDisplayAmounts(0.80m, mockCurrencyService, "GBP");

    result.Total.ShouldBe(0m);
}
```

### ConvertBasketCurrencyAsync Tests

```csharp
[Fact]
public async Task ConvertBasketCurrencyAsync_DoesNotConvertAmounts()
{
    // Arrange
    var basket = await SetupBasketWithItems(100m);

    // Act
    await checkoutService.ConvertBasketCurrencyAsync(
        new ConvertBasketCurrencyParameters { NewCurrencyCode = "GBP" });

    // Assert
    var updatedBasket = await checkoutService.GetBasket();
    updatedBasket.LineItems.First().Amount.ShouldBe(100m); // Unchanged - Shopify approach
    updatedBasket.Currency.ShouldBe("GBP"); // Display preference updated
}

[Fact]
public async Task ConvertBasketCurrencyAsync_PublishesNotifications()
{
    // Verify that BasketCurrencyChangingNotification and
    // BasketCurrencyChangedNotification are still published
}
```

### Payment Endpoint Tests

```csharp
[Fact]
public async Task GetExpressCheckoutConfig_ReturnsConvertedAmounts()
{
    // Arrange
    var basket = await SetupBasketWithTotal(100m); // USD
    SetDisplayCurrency("GBP", exchangeRate: 0.80m);

    // Act
    var config = await controller.GetExpressCheckoutConfig();

    // Assert
    config.Currency.ShouldBe("GBP");
    config.Amount.ShouldBe(80m); // Converted, not 100
}

[Fact]
public async Task CreateExpressPaymentIntent_SendsCorrectCurrencyToProvider()
{
    // Verify provider receives matching currency code and converted amount
}
```

---

## Sources

- [Shopify: Currency conversions and exchange rates](https://help.shopify.com/en/manual/international/pricing/exchange-rates)
- [Shopify: Multi-currency](https://help.shopify.com/en/manual/payments/shopify-payments/store-currency/multi-currency)

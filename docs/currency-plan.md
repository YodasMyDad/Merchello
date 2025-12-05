# Multi-Currency Architecture Plan for Merchello

## Goal

Enable customers to checkout in their local currency while maintaining all reporting, order lists, and exports in the store's default currency (e.g., USD).

---

## Shopify Alignment Validation

This plan has been validated against Shopify's multi-currency implementation:

| Concept | Shopify Term | Merchello Equivalent |
|---------|--------------|---------------------|
| Store's home currency | **Store currency** | `StoreCurrencyCode` in settings |
| What customer sees/pays | **Presentment currency** | `CurrencyCode` on Invoice |
| What merchant receives | **Settlement currency** | `*InStoreCurrency` fields |

**Key alignments:**
- **Dual storage** - Shopify stores both `shop_money` and `presentment_money`; we store `Total` + `TotalInStoreCurrency`
- **Exchange rate from payment provider** - Shopify uses real-time rates at payment time; we capture from Stripe/PayPal
- **Reporting in store currency** - Shopify reports all revenue in store currency; we use `*InStoreCurrency` fields
- **Display rates are approximate** - Shopify shows estimates until payment; we use `~` indicator
- **Single store currency** - Shopify allows only ONE store currency per store; we follow the same pattern

This approach is proven at scale and positions Merchello as an enterprise-grade solution.

---

## 1. How It Should Work (Matching Shopify)

| View | Currency Shown | Example |
|------|----------------|---------|
| **Customer Checkout** | Customer's currency | £17.85 GBP |
| **Order List (Admin)** | Store currency | $23.81 USD |
| **Order Detail (Admin)** | Both | "£17.85 GBP — Paid $23.81 USD (rate: 0.749)" |
| **Reports/Exports** | Store currency | All totals in USD |

**Key Principle**: Store BOTH amounts on every invoice - the original customer amount AND the store currency equivalent.

---

## 2. How Currency Conversion Works

Multi-currency requires **two exchange rates** at different stages:

### Display Rate (from Exchange Rate Provider)
To show customers prices in their local currency, an exchange rate provider is **required**:

```
Product stored: $20.00 USD
                    ↓
Exchange Rate Provider → 1 USD = 0.75 GBP (cached hourly)
                    ↓
Customer (UK) → Sees ~£15.00 GBP
```

### Settlement Rate (from Payment Provider)
When the customer pays, Stripe handles the actual currency conversion:

```
Customer pays £15.00 GBP → Stripe converts → You receive ~$20 USD
                                    ↓
                     Stripe tells us the settlement rate used
```

**Key distinction:**
| Rate | Source | Purpose | When Used |
|------|--------|---------|-----------|
| **Display rate** | Exchange Rate Provider (Fixer, etc.) | Show prices to customers | Browsing/cart |
| **Settlement rate** | Payment Provider (Stripe) | Actual conversion | Payment time |

These rates may differ slightly. The display rate is approximate (~); the settlement rate is final and stored on the invoice.

---

## 3. Data Model Changes

### 3.1 Invoice Model ([Invoice.cs](../src/Merchello.Core/Accounting/Models/Invoice.cs))

```csharp
// Customer's currency (what they see/pay)
public string CurrencyCode { get; set; } = "USD";
public string CurrencySymbol { get; set; } = "$";

// Store currency equivalents (for reporting)
public decimal? SubTotalInStoreCurrency { get; set; }
public decimal? TaxInStoreCurrency { get; set; }
public decimal? TotalInStoreCurrency { get; set; }
public decimal? ExchangeRate { get; set; }  // Rate used for conversion
```

**When invoice currency = store currency**: Store currency fields are null (or same as original).

**When different**: Populated when payment is recorded with the rate from payment provider.

### 3.2 Payment Model ([Payment.cs](../src/Merchello.Core/Accounting/Models/Payment.cs))

```csharp
public string CurrencyCode { get; set; } = "USD";       // Currency payment was made in
public decimal? ExchangeRate { get; set; }               // Rate at payment time
public decimal? AmountInStoreCurrency { get; set; }      // For reporting
public string? ExchangeRateSource { get; set; }          // "stripe", "paypal", "manual"
```

### 3.3 Line Item Model

Add store currency tracking to line items for detailed reporting:

```csharp
public class InvoiceLineItem
{
    // ... existing fields ...
    public decimal? AmountInStoreCurrency { get; set; }  // For reporting
}
```

**Important**: When invoice store currency amounts are updated, all line items must be recalculated in sync:

```csharp
// In InvoiceService after payment with exchange rate
public async Task UpdateStoreCurrencyAmountsAsync(Invoice invoice, decimal exchangeRate)
{
    invoice.ExchangeRate = exchangeRate;
    invoice.SubTotalInStoreCurrency = invoice.SubTotal * exchangeRate;
    invoice.TaxInStoreCurrency = invoice.Tax * exchangeRate;
    invoice.TotalInStoreCurrency = invoice.Total * exchangeRate;

    // Sync all line items
    foreach (var item in invoice.Items)
    {
        item.AmountInStoreCurrency = item.Amount * exchangeRate;
    }

    await _invoiceRepository.UpdateAsync(invoice);
}
```

### 3.4 Database Mapping Updates

| File | New Columns |
|------|-------------|
| [InvoiceDbMapping.cs](../src/Merchello.Core/Accounting/Mapping/InvoiceDbMapping.cs) | CurrencyCode, CurrencySymbol, SubTotalInStoreCurrency, TaxInStoreCurrency, TotalInStoreCurrency, ExchangeRate |
| [PaymentDbMapping.cs](../src/Merchello.Core/Accounting/Mapping/PaymentDbMapping.cs) | CurrencyCode, ExchangeRate, AmountInStoreCurrency, ExchangeRateSource |
| InvoiceLineItemDbMapping.cs | AmountInStoreCurrency |

---

## 4. Flow Changes

### 4.1 Checkout → Invoice Creation

In [InvoiceService.CreateOrderFromBasketAsync()](../src/Merchello.Core/Accounting/Services/InvoiceService.cs):

```csharp
var newInvoice = new Invoice
{
    // ... existing fields ...
    CurrencyCode = basket.Currency ?? _settings.StoreCurrencyCode,
    CurrencySymbol = basket.CurrencySymbol ?? _settings.CurrencySymbol,
    // Store currency fields populated later when payment recorded
};
```

### 4.2 Payment Recording

When payment is processed, capture exchange rate from provider response:

```csharp
// In PaymentService after successful payment
var payment = new Payment
{
    Amount = request.Amount,                    // £15.00
    CurrencyCode = request.Currency,            // "GBP"
    ExchangeRate = providerResult.ExchangeRate, // 0.75 (from Stripe)
    AmountInStoreCurrency = providerResult.AmountInStoreCurrency, // $20.00
    ExchangeRateSource = "stripe"
};

// Update invoice with store currency totals
invoice.TotalInStoreCurrency = CalculateStoreCurrencyTotal(invoice, payment.ExchangeRate);
invoice.ExchangeRate = payment.ExchangeRate;
```

### 4.3 Order List Query

```csharp
// Return store currency for list view
public decimal GetDisplayTotal(Invoice invoice)
{
    return invoice.TotalInStoreCurrency ?? invoice.Total;
}
```

---

## 5. Frontend Currency Display (Optional Feature)

### 5.1 Feature Toggle

Currency detection is **disabled by default**. Simple stores just use the store currency everywhere.

In [MerchelloSettings.cs](../src/Merchello.Core/Shared/Models/MerchelloSettings.cs) (nested class approach):

```csharp
// In MerchelloSettings.cs
public class MerchelloSettings
{
    // Existing settings...
    public string StoreCurrencyCode { get; set; } = "USD";

    // NEW - Nested currency display settings
    public CurrencyDisplaySettings CurrencyDisplay { get; set; } = new();
}

// Separate nested class
public class CurrencyDisplaySettings
{
    /// <summary>
    /// When false, all prices display in store currency only. No detection, no conversion.
    /// </summary>
    public bool EnableMultiCurrency { get; set; } = false;

    /// <summary>
    /// Allow customers to manually select their currency via a picker.
    /// </summary>
    public bool ShowSelector { get; set; } = false;

    /// <summary>
    /// Auto-detect currency from geo-IP/locale (requires EnableMultiCurrency).
    /// </summary>
    public bool AutoDetect { get; set; } = false;

    /// <summary>
    /// Currencies available for selection/detection.
    /// </summary>
    public List<string> EnabledCurrencies { get; set; } = [];
}
```

**appsettings.json example:**
```json
{
  "Merchello": {
    "StoreCurrencyCode": "USD",
    "CurrencyDisplay": {
      "EnableMultiCurrency": true,
      "ShowSelector": true,
      "AutoDetect": false,
      "EnabledCurrencies": ["USD", "GBP", "EUR", "CAD"]
    }
  }
}
```

**Default behavior**: `EnableMultiCurrency = false` → everything in store currency, no complexity.

### 5.2 How It Works (When Enabled)

All product prices are stored in store currency (e.g., USD). For customers in other regions, prices are converted for **display only** using a cached exchange rate.

```
Product stored: $25.00 USD
                    ↓
Customer in UK → Exchange rate lookup (cached) → 1 USD = 0.79 GBP
                    ↓
Display: "~£19.75 GBP" (approximate indicator)
                    ↓
Checkout: Customer pays £19.75 → Stripe handles actual conversion
```

### 5.3 Currency Detection (When Auto-Detection Enabled)

Customer currency determined by (in priority order):
1. **Explicit selection** - Currency picker in UI (if `ShowSelector = true`)
2. **Customer preference** - Saved in customer profile (if logged in)
3. **Geo-IP detection** - Country → default currency mapping (if `AutoDetect = true`)
4. **Browser locale** - `Accept-Language` header (if `AutoDetect = true`)
5. **Fallback** - Store default currency

### 5.4 Exchange Rate Caching

Rates cached to avoid excessive API calls:

```csharp
public interface IExchangeRateCache
{
    Task<decimal?> GetRateAsync(string fromCurrency, string toCurrency);
    Task SetRatesAsync(Dictionary<string, decimal> rates, string baseCurrency);
    Task InvalidateAsync();
}
```

**Cache strategy:**
- Rates refreshed every **1 hour** (configurable)
- Background job fetches all rates from provider
- Fallback to last known rate if provider fails
- Store rates as `USD → X` pairs (convert via cross-rate if needed)

### 5.5 Price Conversion Service

```csharp
public interface ICurrencyConversionService
{
    Task<decimal> ConvertAsync(decimal amount, string fromCurrency, string toCurrency);
    Task<string> FormatPriceAsync(decimal amount, string currencyCode);
    Task<ConvertedPrice> GetDisplayPriceAsync(decimal storePrice, string customerCurrency);
}

public record ConvertedPrice(
    decimal OriginalAmount,
    string OriginalCurrency,
    decimal ConvertedAmount,
    string ConvertedCurrency,
    decimal ExchangeRate,
    bool IsApproximate  // true when using cached rate
);
```

### 5.6 Display Formatting

When showing converted prices:
- Use **approximate indicator**: "~£19.75" or "≈ £19.75"
- Show original on hover/click: "~£19.75 (US$25.00)"
- Checkout shows: "You'll be charged approximately £19.75 GBP"
- Final charge may differ slightly due to real-time rate at payment

### 5.7 Basket Currency

Once customer adds to basket, currency is locked:

```csharp
public class Basket
{
    public string CurrencyCode { get; set; }      // Locked at first add-to-cart
    public decimal ExchangeRateAtCreation { get; set; }  // Rate when basket created
}
```

This prevents price fluctuation during shopping session.

### 5.8 Basket Currency Change Behavior

If a customer changes their currency after adding items to the basket, **convert prices** to the new currency (do not clear the basket):

```csharp
public async Task ChangeCurrencyAsync(Basket basket, string newCurrencyCode)
{
    if (basket.Currency == newCurrencyCode) return;

    var rate = await _exchangeRateService.GetRateAsync(basket.Currency, newCurrencyCode);

    foreach (var item in basket.Items)
    {
        item.Price = item.Price * rate;  // Convert to new currency
    }

    basket.Currency = newCurrencyCode;
    basket.CurrencySymbol = GetSymbol(newCurrencyCode);
    basket.ExchangeRateAtCreation = rate;

    await _basketRepository.UpdateAsync(basket);
}
```

This provides a better customer experience than clearing the basket.

---

## 6. Exchange Rate Provider Architecture

### 6.1 Single-Active Provider Pattern

Unlike Payment/Shipping providers (where multiple can be enabled), exchange rate providers use a **single-active** pattern:

- Only ONE provider can be active at a time
- Enabling a provider **automatically disables** all others
- Ensures consistent rates across the system

### 6.2 Provider Interface

```csharp
public interface IExchangeRateProvider
{
    ExchangeRateProviderMetadata Metadata { get; }

    Task<List<ProviderConfigField>> GetConfigurationFieldsAsync();
    Task ConfigureAsync(ExchangeRateProviderConfiguration configuration);

    /// <summary>
    /// Fetch current rates for all currencies relative to base currency.
    /// </summary>
    Task<ExchangeRateResult> GetRatesAsync(string baseCurrency);

    /// <summary>
    /// Get rate for specific currency pair (optional optimization).
    /// </summary>
    Task<decimal?> GetRateAsync(string fromCurrency, string toCurrency);
}

public record ExchangeRateProviderMetadata(
    string Alias,
    string DisplayName,
    string? Icon,
    string? Description,
    bool SupportsHistoricalRates,
    string[] SupportedCurrencies  // Empty = all currencies
);

public record ExchangeRateResult(
    bool Success,
    string BaseCurrency,
    Dictionary<string, decimal> Rates,  // e.g., { "GBP": 0.79, "EUR": 0.92 }
    DateTime Timestamp,
    string? ErrorMessage
);
```

### 6.3 Provider Manager (Single-Active)

```csharp
public interface IExchangeRateProviderManager
{
    Task<List<RegisteredExchangeRateProvider>> GetProvidersAsync();
    Task<RegisteredExchangeRateProvider?> GetActiveProviderAsync();

    /// <summary>
    /// Enable provider and automatically disable all others.
    /// </summary>
    Task<bool> SetActiveProviderAsync(string alias);

    Task SaveProviderSettingsAsync(string alias, Dictionary<string, object> settings);
}
```

### 6.4 Configuration Storage

```csharp
public class ExchangeRateProviderSetting
{
    public Guid Id { get; set; }
    public string ProviderAlias { get; set; }
    public bool IsActive { get; set; }  // Only one can be true
    public string? ConfigurationJson { get; set; }
    public DateTime? LastFetchedAt { get; set; }
    public DateTime CreateDate { get; set; }
    public DateTime UpdateDate { get; set; }
}
```

### 6.5 Built-in Providers

| Provider | Alias | Free Tier | Notes |
|----------|-------|-----------|-------|
| **Exchange Rates API** | `exchangeratesapi` | 250 req/month | Open Exchange Rates data |
| **Fixer.io** | `fixer` | 100 req/month | Popular, reliable |
| **Manual/Static** | `manual` | Unlimited | Admin enters rates manually |

**Manual Provider**: For stores with fixed exchange rates or low volume. Admin sets rates via backoffice.

### 6.6 Custom Provider Example

```csharp
public class MyBankExchangeProvider : IExchangeRateProvider
{
    public ExchangeRateProviderMetadata Metadata => new(
        Alias: "mybank",
        DisplayName: "My Bank Rates",
        Icon: "icon-bank",
        Description: "Fetch rates from our bank's API",
        SupportsHistoricalRates: false,
        SupportedCurrencies: ["GBP", "EUR", "CAD"]
    );

    public async Task<ExchangeRateResult> GetRatesAsync(string baseCurrency)
    {
        // Call your bank's API...
    }
}
```

Custom providers auto-discovered via `ExtensionManager` (same as Payment/Shipping).

### 6.7 Rate Refresh Strategy

```csharp
// Background job (runs hourly by default)
public class ExchangeRateRefreshJob : IHostedService
{
    public async Task RefreshRatesAsync()
    {
        var provider = await _providerManager.GetActiveProviderAsync();
        if (provider == null) return;

        var result = await provider.Provider.GetRatesAsync(_settings.StoreCurrencyCode);
        if (result.Success)
        {
            await _cache.SetRatesAsync(result.Rates, result.BaseCurrency);
            await _providerManager.UpdateLastFetchedAsync(provider.Setting.Id);
        }
        else
        {
            _logger.LogWarning("Exchange rate fetch failed: {Error}", result.ErrorMessage);
            // Keep using cached rates
        }
    }
}
```

### 6.8 Fallback Behavior

If rate fetch fails:
1. Use last successfully cached rate
2. If no cache, use rate from last successful fetch (stored in DB)
3. If never fetched, display prices in store currency only (no conversion)
4. Log warning for admin notification

---

## 7. Payment Provider Interface Update

### 7.1 Exchange Rate Support by Provider

All major payment providers return exchange rate information in their API responses:

| Provider | Exchange Rate in API | How It's Returned |
|----------|---------------------|-------------------|
| **Stripe** | Yes | `exchange_rate` on Charge/BalanceTransaction objects |
| **PayPal** | Yes | `exchange_rate` in capture response; also FX Quote API |
| **Braintree** | Yes | FX Optimizer with `exchangeRateQuoteId` for settlement |
| **Worldpay** | Yes | FX API returns `bidRate`, `askRate`, `rateId` |

### 7.2 Existing Architecture Support

The current `PaymentResult` model already has a `ProviderData` dictionary that can store exchange rate data:

```csharp
// Existing field in PaymentResult
public Dictionary<string, object>? ProviderData { get; init; }
```

### 7.3 Recommended: Add Explicit Fields

For type safety and consistency across all providers, add explicit fields to [PaymentResult.cs](../src/Merchello.Core/Payments/Models/PaymentResult.cs):

```csharp
public class PaymentResult
{
    // ... existing fields ...

    // NEW: Multi-currency settlement info
    public decimal? ExchangeRate { get; init; }
    public string? SettlementCurrency { get; init; }
    public decimal? SettlementAmount { get; init; }
}
```

### 7.4 Provider Implementation Examples

**Stripe:**
```csharp
var charge = await _stripeClient.Charges.GetAsync(chargeId);
return new PaymentResult
{
    // ... existing fields ...
    ExchangeRate = charge.BalanceTransaction?.ExchangeRate,
    SettlementCurrency = charge.BalanceTransaction?.Currency,
    SettlementAmount = charge.BalanceTransaction?.Amount / 100m
};
```

**PayPal:**
```csharp
var capture = await _paypalClient.CapturePaymentAsync(orderId);
return new PaymentResult
{
    // ... existing fields ...
    ExchangeRate = capture.SellerReceivableBreakdown?.ExchangeRate?.Value,
    SettlementCurrency = capture.SellerReceivableBreakdown?.NetAmount?.CurrencyCode,
    SettlementAmount = capture.SellerReceivableBreakdown?.NetAmount?.Value
};
```

All providers that handle multi-currency will populate these fields consistently.

---

## 8. Admin UI Considerations

### Order List

- Column shows `TotalInStoreCurrency` (or `Total` if same currency)
- All amounts display with store currency symbol

### Order Detail

- Show original: "Total: £17.85 GBP"
- Show conversion: "Paid: $23.81 USD (1 USD = 0.749 GBP)"

### Reports/Exports

- Always use `*InStoreCurrency` fields
- Consistent currency for profit calculations

---

## 9. Order Edits & Discounts for Multi-Currency Orders

### 9.1 Core Principle

All order edits are performed in the **customer's currency** (the currency the order was placed in), not the store currency.

| Edit Type | Currency Used | Example |
|-----------|---------------|---------|
| Fixed discount | Customer currency | £5 off (not $6.68) |
| Percentage discount | N/A (works same) | 10% off |
| Custom item | Customer currency | £12.00 item |
| Refund | Customer currency | Refund £5.00 |

**Why?** The exchange rate is locked at payment time. Using the original rate ensures:
- Customer fairness (no rate drift)
- Accurate store currency reporting
- Consistent audit trail

### 9.2 Store Currency Calculation for Edits

When an edit is made to a foreign currency order, recalculate store currency using the **original exchange rate**:

```csharp
// In EditInvoiceAsync after applying discount
if (invoice.CurrencyCode != _settings.StoreCurrencyCode && invoice.ExchangeRate.HasValue)
{
    // Discount is in customer currency, convert to store currency
    discountLineItem.AmountInStoreCurrency = discountLineItem.Amount * invoice.ExchangeRate.Value;

    // Recalculate invoice store currency totals
    invoice.SubTotalInStoreCurrency = invoice.SubTotal * invoice.ExchangeRate.Value;
    invoice.TaxInStoreCurrency = invoice.Tax * invoice.ExchangeRate.Value;
    invoice.TotalInStoreCurrency = invoice.Total * invoice.ExchangeRate.Value;
}
```

### 9.3 Data Model Addition

Add store currency tracking to discount line items:

```csharp
// LineItem extended data for discounts
ExtendedData = new Dictionary<string, object>
{
    ["DiscountType"] = discountType,
    ["DiscountValue"] = discountValue,
    ["AmountInStoreCurrency"] = amountInStoreCurrency  // NEW
}
```

### 9.4 Admin UI for Order Edits

When editing a foreign currency order:

- **Show customer currency prominently**: "Order Currency: £ GBP"
- **Input fields use customer currency**: Discount amount in £
- **Show store equivalent**: "£5.00 discount (≈ $6.68 USD)"
- **Lock indicator**: "Using exchange rate from payment: 1 USD = 0.749 GBP"

### 9.5 Refund Handling

Refunds follow the same principle:

```csharp
var refund = new Payment
{
    Amount = -refundAmount,                    // -£5.00 (customer currency)
    CurrencyCode = invoice.CurrencyCode,       // "GBP"
    ExchangeRate = invoice.ExchangeRate,       // Original rate
    AmountInStoreCurrency = -refundAmount * invoice.ExchangeRate  // -$6.68
};
```

**Reporting**: Always use `AmountInStoreCurrency` for reports/exports.

### 9.6 Edge Cases

| Scenario | Handling |
|----------|----------|
| Order not yet paid | No exchange rate yet - edits still in customer currency, store amounts calculated when payment recorded |
| Multiple partial payments | Use rate from first payment (or weighted average if needed) |
| Same currency order | Store currency fields null/same - no conversion needed |

---

## 10. Implementation Phases

### Phase 1: Data Model (MVP Foundation)

1. Add currency fields to Invoice model
2. Add currency/rate fields to Payment model
3. Add `AmountInStoreCurrency` to InvoiceLineItem model
4. Add exchange rate fields to PaymentResult model
5. Update DB mappings (Invoice, Payment, InvoiceLineItem)
6. Run migration
7. Update `CreateOrderFromBasketAsync()` to copy basket currency

### Phase 2: Payment Flow & Order Edits

1. Update `PaymentService` to store currency info
2. Update Stripe provider to return exchange rate from webhooks/responses
3. Calculate and store `TotalInStoreCurrency` on invoice after payment
4. **Sync all line items** with `AmountInStoreCurrency` when exchange rate is recorded
5. Update `EditInvoiceAsync` to:
   - Use invoice currency for all edit inputs
   - Calculate `AmountInStoreCurrency` for discount line items
   - Recalculate `*InStoreCurrency` totals after edits
   - Keep line items in sync with invoice totals
6. Update refund flow to use original exchange rate

### Phase 3: Admin Display

1. Update order list API to return store currency totals
2. Update order detail to show both currencies
3. Update TypeScript DTOs

### Phase 4: Future Enhancements (Not MVP)

- Multi-currency product pricing
- Historical exchange rate reports

### Phase 5: Exchange Rate Provider (Future)

1. Create `IExchangeRateProvider` interface
2. Create `ExchangeRateProviderManager` with single-active pattern
3. Implement `ManualExchangeRateProvider` (built-in)
4. Implement one API provider (e.g., `ExchangeRatesApiProvider`)
5. Create rate caching service
6. Create background refresh job

### Phase 6: Frontend Currency Display (Future, Optional)

1. Add `CurrencyDisplaySettings` to `MerchelloSettings` (all disabled by default)
2. Create `ICurrencyConversionService` (only active when enabled)
3. Add currency detection (geo-IP/locale) - optional setting
4. Update product API to return converted prices (when enabled)
5. Add currency selector component (optional setting)
6. Lock basket currency on first item add

**Note**: Simple stores leave all settings disabled → no complexity, just store currency.

---

## 11. Key Files to Modify

| File | Changes |
|------|---------|
| [Invoice.cs](../src/Merchello.Core/Accounting/Models/Invoice.cs) | Add currency + store currency fields |
| [Payment.cs](../src/Merchello.Core/Accounting/Models/Payment.cs) | Add currency + exchange rate fields |
| [InvoiceLineItem.cs](../src/Merchello.Core/Accounting/Models/InvoiceLineItem.cs) | Add AmountInStoreCurrency field |
| [PaymentResult.cs](../src/Merchello.Core/Payments/Models/PaymentResult.cs) | Add ExchangeRate, SettlementCurrency, SettlementAmount fields |
| [InvoiceDbMapping.cs](../src/Merchello.Core/Accounting/Mapping/InvoiceDbMapping.cs) | Map new columns |
| [PaymentDbMapping.cs](../src/Merchello.Core/Accounting/Mapping/PaymentDbMapping.cs) | Map new columns |
| InvoiceLineItemDbMapping.cs | Map AmountInStoreCurrency |
| [InvoiceService.cs](../src/Merchello.Core/Accounting/Services/InvoiceService.cs) | Copy currency, calculate store amounts, sync line items |
| [PaymentService.cs](../src/Merchello.Core/Payments/Services/PaymentService.cs) | Capture exchange rate |
| [StripePaymentProvider.cs](../src/Merchello.PaymentProviders/Stripe/StripePaymentProvider.cs) | Return exchange rate info |

---

## 12. Estimated Effort

| Phase | Effort | Dependency |
|-------|--------|------------|
| Phase 1: Data Model | 1 day | None |
| Phase 2: Payment Flow | 2 days | Phase 1 |
| Phase 3: Admin Display | 1-2 days | Phase 2 |
| **Total MVP** | **4-5 days** | |

---

## 13. Summary

**Approach**: Use an exchange rate provider to display prices in customer currencies, let payment providers handle settlement conversion, and store both amounts for reporting.

**Architecture**:

- **Exchange Rate Provider** - Required for displaying prices in customer's currency (cached hourly)
- **Payment Provider** - Handles actual currency conversion at payment time
- **Dual storage** - Store both customer currency amount AND store currency equivalent

**Why this works**:

- Clear separation: display rates vs. settlement rates
- Stripe/PayPal handle the complex settlement conversion
- All reporting stays in store currency
- Matches Shopify's proven approach

**Data stored per invoice**:

- `Total` = £17.85 (what customer paid)
- `CurrencyCode` = "GBP"
- `TotalInStoreCurrency` = $23.81 (for reporting)
- `ExchangeRate` = 0.749 (from Stripe)

---

## 14. Next Steps

- [x] ~~Validate plan against Shopify's approach~~ (Done - see Shopify Alignment Validation section)
- [x] ~~Confirm payment providers support exchange rate data~~ (Done - Stripe, PayPal, Braintree, Worldpay all confirmed)
- [x] ~~Clarify basket currency change behavior~~ (Done - convert prices, not clear basket)
- [x] ~~Clarify line item store currency tracking~~ (Done - sync all line items with invoice)
- [ ] Update seed data to include multi-currency items so we can test in the admin
- [ ] Begin Phase 1 implementation


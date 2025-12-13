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
| Store reporting currency | **Shop money** | `*InStoreCurrency` fields on Invoice/Orders/LineItems |
| What payment provider settles | **Settlement currency** | `Payment.Settlement*` fields (optional but required for reconciliation) |

**Key alignments:**
- **Dual storage** - Shopify stores both `shop_money` and `presentment_money`; we store `Total` + `TotalInStoreCurrency` (and store breakdown where needed)
- **Pricing rate is stored** - Shopify stores the order exchange rate used to compute presentment amounts; Merchello must store the pricing (quote) rate + timestamp/source on the Invoice
- **Settlement is separate** - payout/settlement can differ (fees/FX timing); Merchello captures settlement info per Payment when providers expose it
- **Reporting in store currency** - Shopify sales reports use `shop_money`; Merchello uses `*InStoreCurrency` fields
- **Display rates are approximate** - prices may be approximate while browsing; once the rate is locked for checkout, presentment totals are exact and auditable
- **Single store currency** - Shopify allows only ONE store currency per store; we follow the same pattern

This approach is proven at scale and positions Merchello as an enterprise-grade solution.

---

## Enterprise Requirements (Non-Negotiable)

These constraints make the feature correct and supportable at enterprise scale:

- **Single currency per invoice**: an Invoice (and its Orders/LineItems/Payments/Refunds) must have one presentment currency code; never mix currencies within a single invoice total.
- **No “today’s rate” recomputation**: store-currency amounts used for reporting must be persisted so reports never drift when rates change.
- **Explicit FX audit trail**: persist the pricing rate (source + timestamp) used to compute presentment amounts; optionally persist settlement info per payment for reconciliation.
- **Correct minor units**: 0- and 3-decimal currencies must be supported end-to-end (DB precision, rounding, formatting, provider integration).
- **Centralised calculations**: only backend services calculate totals/taxes/discounts; UI is display-only.

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

Multi-currency separates **pricing** from **settlement**:

- **Pricing/quote rate (presentment <-> store)**: lock the FX rate used to price the order; persist it in a defined direction (recommended: presentment -> store) so store equivalents can be computed as `store = presentment * PricingExchangeRate` (and `presentment = store / PricingExchangeRate`).
- **Settlement rate (presentment -> store/payout)**: the payment provider’s FX rate used for settlement/payout/reconciliation (can differ due to timing, spreads, and fees).

> Once an invoice is created, the presentment totals are not approximate. The "~" indicator only applies to converted previews while browsing.

### Display Rate (from Exchange Rate Provider)
To show customers prices in their local currency, an exchange rate provider is **required**:

```
Product stored: $20.00 USD
                    ↓
Exchange Rate Provider → 1 USD = 0.75 GBP (cached hourly)
                    ↓
Customer (UK) → Sees ~£15.00 GBP
```

### Pricing/Quote Rate (Rate Lock)

At checkout (or at first add-to-basket), lock a pricing rate and persist it (rate + timestamp + source) so totals don't drift if rates change:

- `PricingExchangeRate`: locked FX rate used to compute presentment prices
- `PricingExchangeRateTimestampUtc`: when it was locked
- `PricingExchangeRateSource`: which provider/source was used

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
| **Display rate** | Exchange rate provider | Browsing previews | Browsing/cart |
| **Pricing/quote rate** | Exchange rate provider | Locked checkout totals | Checkout / invoice creation |
| **Settlement rate** | Payment provider | Settlement/payout/reconciliation | Payment capture / payout |

These rates can differ. Merchello must store the pricing rate on the Invoice for auditability and stable reporting, and may store settlement details per Payment when available.

---

## 3. Data Model Changes

### 3.1 Invoice Model ([Invoice.cs](../src/Merchello.Core/Accounting/Models/Invoice.cs))

```csharp
// Customer's currency (what they see/pay)
public string CurrencyCode { get; set; } = "USD"; // ISO 4217
public string CurrencySymbol { get; set; } = "$"; // Convenience snapshot (prefer deriving via ICurrencyService)

// Store currency snapshot (protects reporting if StoreCurrencyCode ever changes)
public string StoreCurrencyCode { get; set; } = "USD"; // ISO 4217

// Pricing FX rate locked for the order (recommended direction: presentment -> store)
public decimal? PricingExchangeRate { get; set; }
public string? PricingExchangeRateSource { get; set; } // "frankfurter", "manual", etc.
public DateTime? PricingExchangeRateTimestampUtc { get; set; }

// Store currency equivalents (for reporting)
public decimal? SubTotalInStoreCurrency { get; set; }
public decimal? DiscountInStoreCurrency { get; set; }
public decimal? TaxInStoreCurrency { get; set; }
public decimal? TotalInStoreCurrency { get; set; }
```

**When invoice currency = store currency**: Store currency fields may be null (or equal to the presentment fields). Use `COALESCE(*InStoreCurrency, *)` when querying.

**When different**: Store-currency fields must be populated at invoice creation time (Shopify-style “shop money”), using either:
- store amounts already known at pricing time (preferred), or
- the locked `PricingExchangeRate` (acceptable with clearly defined rounding rules).

Settlement/payout details (which can differ) are captured per payment.

### 3.2 Payment Model ([Payment.cs](../src/Merchello.Core/Accounting/Models/Payment.cs))

```csharp
public string CurrencyCode { get; set; } = "USD"; // Payment currency (should match Invoice.CurrencyCode)

// Store currency equivalent of this payment amount ("shop money" for reporting/payment status)
public decimal? AmountInStoreCurrency { get; set; }

// Optional settlement details from payment provider (for payout reconciliation; may be net of fees)
public string? SettlementCurrencyCode { get; set; }
public decimal? SettlementExchangeRate { get; set; }
public decimal? SettlementAmount { get; set; }
public string? SettlementExchangeRateSource { get; set; } // "stripe", "paypal", "manual"
```

### 3.3 Line Item Model

Add store currency tracking to line items for detailed reporting:

```csharp
// In Merchello.Core.Accounting.Models.LineItem
public decimal? AmountInStoreCurrency { get; set; }  // Unit price in store currency
```

### 3.3.1 Order (Shipping) Model

Shipping is stored on `Order` (not `Invoice`) in this codebase, so we must add store-currency equivalents there for reporting breakdown:

```csharp
// In Merchello.Core.Accounting.Models.Order
public decimal? ShippingCostInStoreCurrency { get; set; }
public decimal? DeliveryDateSurchargeInStoreCurrency { get; set; }
```

**Important**: When invoice store currency amounts are updated, all line items must be recalculated in sync:

```csharp
// In InvoiceService - used after invoice creation or edits when a pricing rate is known
private static void ApplyPricingRateToStoreAmounts(
    ICurrencyService currencyService,
    Invoice invoice,
    IReadOnlyCollection<Order> orders,
    decimal presentmentToStoreRate,
    string source,
    DateTime timestampUtc)
{
    var storeCurrency = invoice.StoreCurrencyCode;

    invoice.PricingExchangeRate = presentmentToStoreRate;
    invoice.PricingExchangeRateSource = source;
    invoice.PricingExchangeRateTimestampUtc = timestampUtc;

    invoice.SubTotalInStoreCurrency = currencyService.Round(invoice.SubTotal * presentmentToStoreRate, storeCurrency);
    invoice.DiscountInStoreCurrency = currencyService.Round(invoice.Discount * presentmentToStoreRate, storeCurrency);
    invoice.TaxInStoreCurrency = currencyService.Round(invoice.Tax * presentmentToStoreRate, storeCurrency);
    invoice.TotalInStoreCurrency = currencyService.Round(invoice.Total * presentmentToStoreRate, storeCurrency);

    foreach (var order in orders)
    {
        order.ShippingCostInStoreCurrency = currencyService.Round(order.ShippingCost * presentmentToStoreRate, storeCurrency);
        order.DeliveryDateSurchargeInStoreCurrency = currencyService.Round((order.DeliveryDateSurcharge ?? 0m) * presentmentToStoreRate, storeCurrency);

        foreach (var item in order.LineItems ?? [])
        {
            item.AmountInStoreCurrency = currencyService.Round(item.Amount * presentmentToStoreRate, storeCurrency);
        }
    }
}
```

### 3.4 Database Mapping Updates

| File | New Columns |
|------|-------------|
| [InvoiceDbMapping.cs](../src/Merchello.Core/Accounting/Mapping/InvoiceDbMapping.cs) | CurrencyCode, CurrencySymbol, StoreCurrencyCode, PricingExchangeRate, PricingExchangeRateSource, PricingExchangeRateTimestampUtc, SubTotalInStoreCurrency, DiscountInStoreCurrency, TaxInStoreCurrency, TotalInStoreCurrency |
| [PaymentDbMapping.cs](../src/Merchello.Core/Accounting/Mapping/PaymentDbMapping.cs) | CurrencyCode, AmountInStoreCurrency, SettlementCurrencyCode, SettlementExchangeRate, SettlementAmount, SettlementExchangeRateSource |
| [LineItemDbMapping.cs](../src/Merchello.Core/Accounting/Mapping/LineItemDbMapping.cs) | AmountInStoreCurrency |
| [OrderDbMapping.cs](../src/Merchello.Core/Accounting/Mapping/OrderDbMapping.cs) | ShippingCostInStoreCurrency, DeliveryDateSurchargeInStoreCurrency |

### 3.4.1 Database Precision Strategy (Enterprise Requirement)

The current schema uses `decimal(18,2)` in many places. That is not compatible with 0- and 3-decimal currencies (e.g., JPY/KWD) and will silently lose precision.

**Required change:**
- Store monetary amounts using at least `decimal(18,4)` (or `HasPrecision(18, 4)`) across the domain.
- Store FX rates using at least `decimal(18,8)` (or `HasPrecision(18, 8)`).

**Places that must be upgraded (not exhaustive):**
- `Invoice` totals (`SubTotal`, `Discount`, `AdjustedSubTotal`, `Tax`, `Total`, and new `*InStoreCurrency` fields)
- `Payment.Amount` and new settlement/store fields
- `LineItem.Amount`, `OriginalAmount`, and new `AmountInStoreCurrency`
- `Order.ShippingCost` (and new `ShippingCostInStoreCurrency`)
- `Basket` totals and line item JSON values
- Product pricing (`Product.Price`, `Product.PreviousPrice`, `Product.CostOfGoods`)
- Shipping configuration amounts (`ShippingOption.FixedCost`, `ShippingCost.Cost`, `ShippingWeightTier.Surcharge`)

This must be done early (Phase 2) because it impacts migrations, calculations, and provider integrations.

### 3.5 Currency Service (Decimal Places & Formatting)

Different currencies have different decimal places (JPY=0, USD=2, KWD=3). The Stripe provider already handles zero-decimal currencies with a HashSet, but we need a centralized service for consistent handling across the system.

**Interface:**

```csharp
public interface ICurrencyService
{
    CurrencyInfo GetCurrency(string currencyCode);
    string FormatAmount(decimal amount, string currencyCode);
    decimal Round(decimal amount, string currencyCode);
    int GetDecimalPlaces(string currencyCode);
    long ToMinorUnits(decimal amount, string currencyCode);
    decimal FromMinorUnits(long minorUnits, string currencyCode);
}

public record CurrencyInfo(
    string Code,           // "USD", "GBP", "JPY"
    string Symbol,         // "$", "£", "¥"
    int DecimalPlaces,     // 2, 2, 0
    bool SymbolBefore      // true for $100, false for 100€
);
```

**Implementation approach:**
- Static dictionary for ISO 4217 currencies (common ones + fallback to 2 decimals)
- Leverage .NET's `CultureInfo`/`RegionInfo` for symbols (as `MerchelloSettings` already does)
- Decimal places from lookup table (not available from .NET APIs)
- Minor units factor is `10^DecimalPlaces` (used for PSP integer amounts; do not hardcode `* 100`)
- Zero-decimal currencies (examples): `JPY, KRW, VND, CLP, PYG, GNF, RWF, UGX, BIF, XOF, XAF, KMF, DJF, MGA, VUV, XPF`
- Three-decimal currencies (examples): `KWD, BHD, OMR` (and other 3-decimal ISO 4217 currencies)

**Where it's used:**
- `InvoiceService` - formatting for display/notes
- `PaymentService` - amount validation and rounding
- Payment providers (e.g., Stripe) - conversion to/from minor units
- Admin UI - displaying amounts correctly
- Stripe provider - can delegate to this instead of its own HashSet

**Location:** `src/Merchello.Core/Shared/Services/CurrencyService.cs`

### 3.6 Fix/Verify: InvoiceForEditDto Currency Defaults

> Update: `InvoiceService.GetInvoiceForEditAsync()` already populates currency from store settings. The remaining work is to remove misleading GBP defaults from the DTO class and later populate from the invoice for multi-currency orders.

**Current issue:** `InvoiceForEditDto` defaults to `CurrencyCode = "GBP"` and `CurrencySymbol = "£"` instead of reading from settings.

**Fix in `GetInvoiceForEditAsync`:**

```csharp
// Before (hardcoded)
return new InvoiceForEditDto
{
    CurrencyCode = "GBP",
    CurrencySymbol = "£",
    // ...
};

// After (from settings, then from invoice when multi-currency is implemented)
return new InvoiceForEditDto
{
    CurrencyCode = _settings.StoreCurrencyCode,
    CurrencySymbol = _settings.CurrencySymbol,
    // ...
};
```

Status: `GetInvoiceForEditAsync()` is fixed; update DTO defaults and later return invoice currency when multi-currency is enabled.

---

## 4. Flow Changes

### 4.1 Checkout → Invoice Creation

In [InvoiceService.CreateOrderFromBasketAsync()](../src/Merchello.Core/Accounting/Services/InvoiceService.cs):

```csharp
var presentmentCurrency = basket.Currency ?? _settings.StoreCurrencyCode;
var storeCurrency = _settings.StoreCurrencyCode;

var newInvoice = new Invoice
{
    // ... existing fields ...
    CurrencyCode = presentmentCurrency,
    CurrencySymbol = basket.CurrencySymbol ?? _settings.CurrencySymbol,
    StoreCurrencyCode = storeCurrency,
    // Store-currency fields are populated at invoice creation time (shop money)
};

// After orders/line items are created:
if (!string.Equals(presentmentCurrency, storeCurrency, StringComparison.OrdinalIgnoreCase))
{
    var rate = await _currencyConversionService.GetPresentmentToStoreRateAsync(presentmentCurrency, storeCurrency);
    ApplyPricingRateToStoreAmounts(_currencyService, newInvoice, orders, rate, source: "frankfurter", timestampUtc: DateTime.UtcNow);
}
```

### 4.2 Payment Recording

When payment is recorded, persist settlement metadata (when available) and compute store-equivalent "shop money" using the locked pricing rate:

```csharp
// In PaymentService after successful payment
var paymentAmount = paymentResult.Amount ?? request.Amount ?? 0m;
var storeCurrency = invoice.StoreCurrencyCode;

var payment = new Payment
{
    Amount = paymentAmount,
    CurrencyCode = invoice.CurrencyCode,

    // Store-equivalent "shop money" for reporting/payment status (pricing rate, not settlement)
    AmountInStoreCurrency = string.Equals(invoice.CurrencyCode, storeCurrency, StringComparison.OrdinalIgnoreCase)
        ? paymentAmount
        : (invoice.PricingExchangeRate.HasValue
            ? _currencyService.Round(paymentAmount * invoice.PricingExchangeRate.Value, storeCurrency)
            : null),

    // Optional settlement info for payout reconciliation
    SettlementCurrencyCode = paymentResult.SettlementCurrency,
    SettlementExchangeRate = paymentResult.SettlementExchangeRate,
    SettlementAmount = paymentResult.SettlementAmount,
    SettlementExchangeRateSource = request.ProviderAlias
};

// Do NOT overwrite invoice *InStoreCurrency totals here - those are based on the locked pricing rate at invoice creation.
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

All product prices are stored in store currency (e.g., USD). For customers in other regions, prices are converted to a **presentment currency** for browsing and checkout. Browsing prices may be approximate, but checkout must lock a pricing rate and produce exact presentment totals.

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

> Enterprise note: once the pricing rate is locked for checkout, the presentment amount charged is exact. Only the store-currency equivalent can differ at settlement.

### 5.7 Basket Currency

Once customer adds to basket, currency is locked:

```csharp
public class Basket
{
    // Existing Merchello fields
    public string? Currency { get; set; }            // ISO 4217, locked at first add-to-basket
    public string? CurrencySymbol { get; set; }

    // Recommended additions (enterprise correctness / auditability)
    public decimal? PricingExchangeRate { get; set; } // presentment -> store
    public string? PricingExchangeRateSource { get; set; }
    public DateTime? PricingExchangeRateTimestampUtc { get; set; }
}
```

This prevents price fluctuation during shopping session.

### 5.8 Basket Currency Change Behavior

If a customer changes their currency after adding items to the basket, **convert prices** to the new currency (do not clear the basket):

```csharp
public async Task ChangeCurrencyAsync(Basket basket, string newCurrencyCode)
{
    if (basket.Currency == newCurrencyCode) return;

    var rate = await _exchangeRateCache.GetRateAsync(basket.Currency!, newCurrencyCode);

    foreach (var item in basket.LineItems)
    {
        item.Amount = _currencyService.Round(item.Amount * rate, newCurrencyCode);
    }

    basket.Currency = newCurrencyCode;
    basket.CurrencySymbol = _currencyService.GetCurrency(newCurrencyCode).Symbol;
    basket.PricingExchangeRate = await _exchangeRateCache.GetRateAsync(newCurrencyCode, _settings.StoreCurrencyCode);
    basket.PricingExchangeRateSource = "frankfurter";
    basket.PricingExchangeRateTimestampUtc = DateTime.UtcNow;

    // Persist basket via CheckoutService/EF Core (no repository in this codebase)
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

### 6.5 Built-in Provider: Frankfurter

Merchello ships with the **Frankfurter** exchange rate provider as the default:

| Provider | Alias | Rate Limits | Notes |
|----------|-------|-------------|-------|
| **Frankfurter** | `frankfurter` | **None** | Free, open-source, ECB data |

**Why Frankfurter:**
- **No API key required** - works out of the box
- **No rate limits** - unlimited requests
- **European Central Bank data** - institutional, reliable source
- **Open source** - can self-host if needed
- **Simple REST API** - easy to integrate

**API Details:**
- Base URL: `https://api.frankfurter.dev/v1/`
- Rates updated daily ~16:00 CET
- Supports 30+ currencies

**Endpoints:**

| Endpoint | Purpose | Example |
|----------|---------|---------|
| `/latest` | Current rates | `/latest?base=USD` |
| `/currencies` | List supported currencies | `/currencies` |
| `/{date}` | Historical rate | `/2024-01-15?base=USD` |

**Response format:**
```json
{
  "base": "USD",
  "date": "2024-01-15",
  "rates": {
    "GBP": 0.79,
    "EUR": 0.92,
    "JPY": 145.23
  }
}
```

**Supported currencies:** AUD, BGN, BRL, CAD, CHF, CNY, CZK, DKK, EUR, GBP, HKD, HUF, IDR, ILS, INR, ISK, JPY, KRW, MXN, MYR, NOK, NZD, PHP, PLN, RON, SEK, SGD, THB, TRY, USD, ZAR

### 6.6 Frankfurter Provider Implementation

```csharp
public class FrankfurterExchangeRateProvider : IExchangeRateProvider
{
    private readonly HttpClient _httpClient;
    private const string BaseUrl = "https://api.frankfurter.dev/v1";

    public ExchangeRateProviderMetadata Metadata => new(
        Alias: "frankfurter",
        DisplayName: "Frankfurter (ECB Rates)",
        Icon: "icon-globe",
        Description: "Free exchange rates from the European Central Bank",
        SupportsHistoricalRates: true,
        SupportedCurrencies: []  // Empty = all supported
    );

    public async Task<ExchangeRateResult> GetRatesAsync(string baseCurrency)
    {
        var response = await _httpClient.GetAsync($"{BaseUrl}/latest?base={baseCurrency}");

        if (!response.IsSuccessStatusCode)
        {
            return new ExchangeRateResult(
                Success: false,
                BaseCurrency: baseCurrency,
                Rates: new(),
                Timestamp: DateTime.UtcNow,
                ErrorMessage: $"API returned {response.StatusCode}"
            );
        }

        var data = await response.Content.ReadFromJsonAsync<FrankfurterResponse>();

        return new ExchangeRateResult(
            Success: true,
            BaseCurrency: data.Base,
            Rates: data.Rates,
            Timestamp: DateTime.Parse(data.Date),
            ErrorMessage: null
        );
    }

    public async Task<decimal?> GetRateAsync(string fromCurrency, string toCurrency)
    {
        var response = await _httpClient.GetAsync(
            $"{BaseUrl}/latest?base={fromCurrency}&symbols={toCurrency}");

        if (!response.IsSuccessStatusCode) return null;

        var data = await response.Content.ReadFromJsonAsync<FrankfurterResponse>();
        return data?.Rates.GetValueOrDefault(toCurrency);
    }
}

internal record FrankfurterResponse(
    string Base,
    string Date,
    Dictionary<string, decimal> Rates
);
```

### 6.7 Custom Provider Example

Custom providers can be added via `ExtensionManager` (same as Payment/Shipping):

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

### 6.8 Rate Refresh Strategy

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

### 6.9 Fallback Behavior

If rate fetch fails:
1. Use last successfully cached rate
2. If no cache, use rate from last successful fetch (stored in DB)
3. If never fetched, display prices in store currency only (no conversion)
4. Log warning for admin notification

### 6.10 Notifications (per Developer Guidelines)

Exchange rate events integrate with the existing notification system:

| Notification | When | Use Case |
|--------------|------|----------|
| `ExchangeRatesRefreshedNotification` | After successful rate fetch | Sync rates to external systems, logging |
| `ExchangeRateFetchFailedNotification` | After failed fetch attempt | Alert admin, trigger fallback logic |

**Example handler:**

```csharp
public class MyComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        builder.AddNotificationAsyncHandler<ExchangeRatesRefreshedNotification, LogRatesHandler>();
        builder.AddNotificationAsyncHandler<ExchangeRateFetchFailedNotification, AlertAdminHandler>();
    }
}

public class LogRatesHandler(ILogger<LogRatesHandler> logger)
    : INotificationAsyncHandler<ExchangeRatesRefreshedNotification>
{
    public Task HandleAsync(ExchangeRatesRefreshedNotification notification, CancellationToken ct)
    {
        logger.LogInformation(
            "Exchange rates refreshed: {Count} rates from {Provider}",
            notification.Rates.Count,
            notification.ProviderAlias);
        return Task.CompletedTask;
    }
}

public class AlertAdminHandler(IEmailService emailService)
    : INotificationAsyncHandler<ExchangeRateFetchFailedNotification>
{
    public async Task HandleAsync(ExchangeRateFetchFailedNotification notification, CancellationToken ct)
    {
        await emailService.SendAdminAlertAsync(
            $"Exchange rate fetch failed: {notification.ErrorMessage}");
    }
}
```

**Notification models (in separate files per guidelines):**

```csharp
// ExchangeRates/Notifications/ExchangeRatesRefreshedNotification.cs
public class ExchangeRatesRefreshedNotification : INotification
{
    public required string ProviderAlias { get; init; }
    public required string BaseCurrency { get; init; }
    public required IReadOnlyDictionary<string, decimal> Rates { get; init; }
    public required DateTime Timestamp { get; init; }
}

// ExchangeRates/Notifications/ExchangeRateFetchFailedNotification.cs
public class ExchangeRateFetchFailedNotification : INotification
{
    public required string ProviderAlias { get; init; }
    public required string ErrorMessage { get; init; }
    public required DateTime Timestamp { get; init; }
    public int ConsecutiveFailures { get; init; }
}
```

---

## 7. Payment Provider Interface Update

### 7.1 Exchange Rate Support by Provider

Many payment providers can expose settlement FX data (rate/currency/amount), but availability varies by provider, region, and account configuration. Treat settlement fields as optional and do not depend on them for "shop money" reporting.

| Provider | Settlement FX Data | Notes |
|----------|--------------------|------|
| **Stripe** | Yes | `exchange_rate` + amounts on `BalanceTransaction` (when available/expanded) |
| **PayPal** | Usually | `exchange_rate` + receivable breakdown (gross/fee/net) |
| **Braintree** | Depends | May require FX Optimizer/settlement reports; treat as optional |
| **Worldpay** | Depends | May require separate FX APIs; treat as optional |

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

    // NEW: Optional settlement/payout info (provider-specific; may be net of fees)
    public string? SettlementCurrency { get; init; }
    public decimal? SettlementExchangeRate { get; init; }
    public decimal? SettlementAmount { get; init; }
}
```

### 7.4 Provider Implementation Examples

**Stripe:**
```csharp
var charge = await _stripeClient.Charges.GetAsync(chargeId, new ChargeGetOptions
{
    Expand = ["balance_transaction"]
});

var balance = charge.BalanceTransaction;
return new PaymentResult
{
    // ... existing fields ...
    SettlementCurrency = balance?.Currency,
    SettlementExchangeRate = balance?.ExchangeRate,
    // Stripe amounts are in minor units (0/2/3 decimals). Do not assume `/ 100m`.
    SettlementAmount = balance != null && !string.IsNullOrEmpty(balance.Currency)
        ? _currencyService.FromMinorUnits(balance.Net, balance.Currency)
        : null
};
```

**PayPal:**
```csharp
var capture = await _paypalClient.CapturePaymentAsync(orderId);
return new PaymentResult
{
    // ... existing fields ...
    SettlementCurrency = capture.SellerReceivableBreakdown?.NetAmount?.CurrencyCode,
    SettlementExchangeRate = capture.SellerReceivableBreakdown?.ExchangeRate?.Value,
    SettlementAmount = capture.SellerReceivableBreakdown?.NetAmount?.Value
};
```

Providers may populate these fields when available; the core payment flow must tolerate null settlement values.

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

**Why?** The pricing exchange rate is locked at checkout/invoice creation. Using the original rate ensures:
- Customer fairness (no rate drift)
- Accurate store currency reporting
- Consistent audit trail

### 9.2 Store Currency Calculation for Edits

When an edit is made to a foreign currency order, recalculate store currency using the **original exchange rate**:

```csharp
// In EditInvoiceAsync after applying discount
if (invoice.CurrencyCode != invoice.StoreCurrencyCode && invoice.PricingExchangeRate.HasValue)
{
    var rate = invoice.PricingExchangeRate.Value;

    // Discount is in customer currency, convert to store currency
    discountLineItem.AmountInStoreCurrency = discountLineItem.Amount * rate;

    // Recalculate invoice store currency totals (shop money)
    invoice.SubTotalInStoreCurrency = invoice.SubTotal * rate;
    invoice.DiscountInStoreCurrency = invoice.Discount * rate;
    invoice.TaxInStoreCurrency = invoice.Tax * rate;
    invoice.TotalInStoreCurrency = invoice.Total * rate;
}
```

### 9.3 Data Model Addition

Discount line items use the same `LineItem.AmountInStoreCurrency` property as all other line item types. Keep discount metadata (type/value) in `ExtendedData`, but do not store currency amounts there.

### 9.4 Admin UI for Order Edits

When editing a foreign currency order:

- **Show customer currency prominently**: "Order Currency: £ GBP"
- **Input fields use customer currency**: Discount amount in £
- **Show store equivalent**: "£5.00 discount (≈ $6.68 USD)"
- **Lock indicator**: "Using locked pricing rate: captured at order creation (source + timestamp)"

### 9.5 Refund Handling

Refunds follow the same principle:

```csharp
var refund = new Payment
{
    Amount = -refundAmount,                    // -£5.00 (customer currency)
    CurrencyCode = invoice.CurrencyCode,       // "GBP"
    AmountInStoreCurrency = invoice.PricingExchangeRate.HasValue
        ? -refundAmount * invoice.PricingExchangeRate.Value
        : null
};
```

**Reporting**: Always use `AmountInStoreCurrency` for reports/exports.

### 9.6 Edge Cases

| Scenario | Handling |
|----------|----------|
| Missing pricing rate | Block edits/checkout until a pricing rate is captured (must not happen when multi-currency is enabled) |
| Multiple payments/refunds | Invoice "shop money" uses locked pricing rate; settlement details (if any) are stored per payment |
| Same currency order | Store currency fields null/same - no conversion needed |

---

## 10. Implementation Phases

Each phase is broken into atomic tasks. Complete all tasks in a phase before moving to the next.

---

### Phase 1: Foundation & Fixes (Pre-requisites)

**Goal:** Set up infrastructure and fix existing issues before adding multi-currency.

#### 1.1 Create ICurrencyService
- [ ] Create `src/Merchello.Core/Shared/Services/ICurrencyService.cs` interface
- [ ] Create `src/Merchello.Core/Shared/Services/CurrencyService.cs` implementation
- [ ] Add static dictionary with common currencies (code, symbol, decimal places)
- [ ] Implement ISO 4217 minor units mapping (0/2/3) and drive `Round()` + `ToMinorUnits()`/`FromMinorUnits()` from it (do not hardcode `* 100`)
- [ ] Register in DI container
- [ ] Add unit tests for `Round()`, `FormatAmount()`, `GetDecimalPlaces()`, `ToMinorUnits()`, `FromMinorUnits()`

#### 1.2 Fix InvoiceForEditDto Hardcoded Currency - COMPLETE
- [x] Update `GetInvoiceForEditAsync()` in `InvoiceService.cs`
- [x] Change `CurrencyCode` from hardcoded `"GBP"` to `_settings.StoreCurrencyCode`
- [x] Change `CurrencySymbol` from hardcoded store symbol to `_settings.CurrencySymbol`
- [ ] Verify in admin UI that correct currency displays

> **Note:** This fix was implemented prior to this plan. See `InvoiceService.cs` lines 1883-1884.

---

### Phase 2: Data Model Changes

**Goal:** Add all currency-related fields to models and database.

#### 2.1 Update Invoice Model
- [ ] Add to `Invoice.cs`:
  ```csharp
  public string CurrencyCode { get; set; } = "USD";
  public string CurrencySymbol { get; set; } = "$";
  public string StoreCurrencyCode { get; set; } = "USD";
  public decimal? PricingExchangeRate { get; set; }             // Direction: presentment -> store
  public string? PricingExchangeRateSource { get; set; }
  public DateTime? PricingExchangeRateTimestampUtc { get; set; }
  public decimal? SubTotalInStoreCurrency { get; set; }
  public decimal? DiscountInStoreCurrency { get; set; }
  public decimal? TaxInStoreCurrency { get; set; }
  public decimal? TotalInStoreCurrency { get; set; }
  ```

#### 2.2 Update Payment Model
- [ ] Add to `Payment.cs`:
  ```csharp
  public string CurrencyCode { get; set; } = "USD";
  public decimal? AmountInStoreCurrency { get; set; }
  public string? SettlementCurrencyCode { get; set; }
  public decimal? SettlementExchangeRate { get; set; }
  public decimal? SettlementAmount { get; set; }
  public string? SettlementExchangeRateSource { get; set; }
  ```

#### 2.3 Update LineItem Model
- [ ] Add to `LineItem.cs`:
  ```csharp
  public decimal? AmountInStoreCurrency { get; set; }
  ```

#### 2.3.1 Update Order Model (Shipping)
- [ ] Add to `Order.cs`:
  ```csharp
  public decimal? ShippingCostInStoreCurrency { get; set; }
  public decimal? DeliveryDateSurchargeInStoreCurrency { get; set; }
  ```

#### 2.4 Update PaymentResult Model
- [ ] Add to `PaymentResult.cs`:
  ```csharp
  public string? SettlementCurrency { get; init; }
  public decimal? SettlementExchangeRate { get; init; }
  public decimal? SettlementAmount { get; init; }
  ```
- [ ] Update factory methods if needed

#### 2.5 Update Database Mappings
- [ ] Update `InvoiceDbMapping.cs` - add all new columns and precision (see section 3.4.1)
- [ ] Update `PaymentDbMapping.cs` - add all new columns
- [ ] Update `LineItemDbMapping.cs` - add `AmountInStoreCurrency`
- [ ] Update `OrderDbMapping.cs` - add shipping store-currency fields
- [ ] Upgrade existing monetary columns from `decimal(18,2)` to at least `decimal(18,4)` (Invoice/Payment/LineItem/Order/Basket/Product/Shipping config)
- [ ] **Add index on `Invoice.CurrencyCode`** for filtering/grouping reports by currency
- [ ] Consider composite index on `(DateCreated, CurrencyCode)` for time-series reports

#### 2.6 Create and Run Migration
- [ ] Run `scripts/add-migration.ps1` to generate migration for all providers (SQLite + SQL Server)
- [ ] Test migration on dev database
- [ ] Verify columns created correctly

#### 2.7 Migration Data Transformation (Existing Data)
**Important:** Existing invoices need currency codes set for data integrity.

- [ ] Add data migration to set `CurrencyCode`, `CurrencySymbol`, and `StoreCurrencyCode` for all existing invoices:
  ```csharp
  // In migration Up() method - set existing invoices to store default
  migrationBuilder.Sql(@"
      UPDATE merchelloInvoices
      SET CurrencyCode = 'USD',  -- Replace with your store default
          CurrencySymbol = '$',
          StoreCurrencyCode = 'USD'
      WHERE CurrencyCode IS NULL OR CurrencyCode = ''
  ");
  ```
- [ ] Set legacy `Payment.CurrencyCode` to the store currency for existing payments (table: `merchelloPayments`)
- [ ] Document that `*InStoreCurrency` fields can be NULL for legacy same-currency orders (this is correct behavior if you use `COALESCE`)
- [ ] Verify existing invoice queries still work after migration

---

### Phase 3: Invoice Creation Flow

**Goal:** Capture currency when creating invoices from baskets.

#### 3.1 Update CreateOrderFromBasketAsync
- [ ] In `InvoiceService.CreateOrderFromBasketAsync()`:
  - Set `invoice.CurrencyCode` from `basket.Currency` (fallback to `_settings.StoreCurrencyCode`)
  - Set `invoice.CurrencySymbol` from `basket.CurrencySymbol` (fallback to `_settings.CurrencySymbol` or derive via `ICurrencyService`)
  - Set `invoice.StoreCurrencyCode` from `_settings.StoreCurrencyCode`
  - If presentment != store:
    - Lock a pricing rate (presentment -> store) and set `PricingExchangeRate*` fields
    - Populate invoice `*InStoreCurrency` totals ("shop money") and sync `Order.*InStoreCurrency` + `LineItem.AmountInStoreCurrency`
- [ ] If presentment == store, store-currency fields may be null or equal (use `COALESCE` downstream)

#### 3.2 Update Invoice DTOs
- [ ] Add currency fields to any invoice DTOs used by APIs
- [ ] Update `InvoiceForEditDto` to read from invoice (not just settings)

#### 3.3 Fix Hardcoded Currency Defaults

**CRITICAL:** These defaults are hardcoded to GBP and must use store settings.

**ShippingServiceLevel.cs** (line 14):
```csharp
// BEFORE - hardcoded!
public string CurrencyCode { get; init; } = "GBP";

// AFTER - providers must set explicitly (recommended)
public required string CurrencyCode { get; init; }

// OR - use a factory/builder that pulls from settings
```
- [ ] Change `ShippingServiceLevel.CurrencyCode` to `required` (no default)
- [ ] Update `FlatRateShippingProvider` and all other providers to pass currency explicitly
- [ ] Currency should come from `ShippingQuoteRequest.CurrencyCode` (basket currency) with fallback to `_settings.StoreCurrencyCode`

**CheckoutService.cs** (line 436):
```csharp
// BEFORE - hardcoded GBP!
public Basket CreateBasket(string currency = "GBP", string currencySymbol = "£", ...)

// AFTER - use store settings
public Basket CreateBasket(string? currency = null, string? currencySymbol = null, ...)
{
    return new Basket
    {
        Currency = currency ?? _settings.StoreCurrencyCode,
        CurrencySymbol = currencySymbol ?? _settings.CurrencySymbol,
        // ...
    };
}
```
- [ ] Update `CheckoutService.CreateBasket()` to default to store currency from settings
- [ ] Update `AddToBasket()` (line 264) - currently hardcodes "GB" country code (separate issue but related)

#### 3.4 Shipping Quotes: Currency Safety
- [ ] Update `ShippingQuoteService.BuildCacheKey()` to include `basket.Currency` so quotes cannot be served in the wrong currency
- [ ] Ensure flat-rate shipping costs (configured in store currency) are converted to the request/basket currency when different

---

### Phase 4: Payment Flow

**Goal:** Capture settlement info from payment providers (per payment) for reconciliation. Do not overwrite invoice "shop money" totals during payment recording.

#### 4.1 Update Stripe Provider
- [ ] In `StripePaymentProvider.cs`, after successful payment:
  - Extract `exchange_rate` from `BalanceTransaction`
  - Extract settlement currency and amount
  - Populate `PaymentResult.SettlementExchangeRate`, `SettlementCurrency`, `SettlementAmount`
- [ ] Update Stripe minor-unit conversion helpers to support 0/2/3-decimal currencies (delegate to `ICurrencyService.ToMinorUnits` / `FromMinorUnits`; do not hardcode `* 100`)
- [ ] Update webhook handler to capture exchange rate from events

#### 4.2 Update PaymentService
- [ ] In `RecordPaymentAsync()`:
  - Set `Payment.CurrencyCode` from the invoice (presentment currency)
  - If provider returns settlement info, copy to:
    - `Payment.SettlementCurrencyCode`
    - `Payment.SettlementExchangeRate`
    - `Payment.SettlementAmount`
    - `Payment.SettlementExchangeRateSource`
  - Set `Payment.AmountInStoreCurrency` using the locked `invoice.PricingExchangeRate` (shop money). Settlement fields are for reconciliation only.

#### 4.3 Do Not Overwrite Invoice Store Totals
- [ ] Ensure payment recording does not modify invoice `*InStoreCurrency` totals (those are based on the locked pricing rate at invoice creation)
- [ ] If legacy invoices have null `*InStoreCurrency` values, backfill via migration or admin job (never using “today’s” rates)

#### 4.4 Update Manual Payment Recording
- [ ] For manual payments, set `Payment.CurrencyCode = invoice.CurrencyCode`
- [ ] Set `Payment.AmountInStoreCurrency` using `invoice.PricingExchangeRate` when presentment != store
- [ ] Leave settlement fields null (manual payments are not PSP settlement events)

---

### Phase 5: Order Edits & Refunds

**Goal:** Ensure edits and refunds work correctly with multi-currency orders.

#### 5.1 Update EditInvoiceAsync for Multi-Currency
- [ ] All edit inputs (discounts, custom items) are in invoice currency
- [ ] After applying edits, if `invoice.PricingExchangeRate` exists:
  - Recalculate `*InStoreCurrency` totals
  - Set `AmountInStoreCurrency` on new/modified line items
- [ ] Add validation: if editing a presentment != store invoice with no pricing rate, block or require a manual pricing rate (enterprise auditability)

#### 5.2 Update Refund Flow
- [ ] In refund creation:
  - Use `invoice.CurrencyCode` for refund currency
  - Use `invoice.PricingExchangeRate` for store-equivalent calculations (original pricing rate)
  - Calculate `Payment.AmountInStoreCurrency` using the original pricing rate
- [ ] Ensure refund reporting uses store currency amounts

#### 5.3 Update Centralized Calculation Methods

**CRITICAL**: These methods contain hardcoded 2-decimal rounding and must use `ICurrencyService` for currency-aware calculations.

| Method | File | Lines | Changes Required |
|--------|------|-------|------------------|
| `RecalculateInvoiceTotals` | InvoiceService.cs | 2836-2904 | Use ICurrencyService for rounding; sync `*InStoreCurrency` fields |
| `PreviewInvoiceEditAsync` | InvoiceService.cs | 1902-2250+ | "Single source of truth" - add exchange rate to all calculations |
| `CalculateLineItems` | LineItemService.cs | 111-175 | Accept currency parameter; use ICurrencyService.Round() |
| `CalculatePaymentStatus` | PaymentService.cs | 504-558 | Use ICurrencyService for decimal places; add store currency totals |
| `CalculateBreakdown` | ReportingService.cs | 287-319 | Convert all amounts to store currency before summing |
| `CalculateBasketAsync` | CheckoutService.cs | 104-136 | Pass currency through to CalculateLineItems |
| `GetInvoiceForEditAsync` | InvoiceService.cs | 1757-1899 | Already uses settings (OK), but needs multi-currency support |
| `CalculateShippingCost` | InvoiceService.cs | 318-359 | Ensure shipping costs are in invoice currency; persist store equivalents; do not assume store currency |
| `CalculateDiscountAmount` | InvoiceService.cs | 2826-2834 | No changes needed (percentage/fixed amount math) |

**Key Implementation Notes:**
- `PreviewInvoiceEditAsync` is documented as "the single source of truth for all invoice calculations" (comment line 144-145). Frontend should NOT calculate locally.
- All methods currently use `Math.Round(amount, 2, _settings.DefaultRounding)` - must change to `_currencyService.Round(amount, currencyCode)`
- Replace currency formatting (`{amount:C}`, `.toFixed(2)`) with currency-code aware formatting using `ICurrencyService` (and frontend helpers that accept `currencyCode`)
- `TaxExtensions.cs` is used in monetary calculations and currently hardcodes 2-decimal rounding (e.g., `PercentageAmount`). It must be updated to use `ICurrencyService` (or accept decimal places) for currency-correct rounding.

#### 5.4 Update LineItemService.CalculateLineItems Signature

**File:** `src/Merchello.Core/Accounting/Services/LineItemService.cs:111-114`

The signature must change to accept currency for proper rounding:
```csharp
// BEFORE
public (decimal subTotal, decimal discount, decimal adjustedSubTotal, decimal tax, decimal total, decimal shipping)
    CalculateLineItems(
        List<LineItem> lineItems,
        List<Adjustment> adjustments,
        decimal shippingAmount,
        decimal defaultTaxRate,
        bool isShippingTaxable = true,
        MidpointRounding rounding = MidpointRounding.AwayFromZero)

// AFTER - add currency parameter
public (decimal subTotal, decimal discount, decimal adjustedSubTotal, decimal tax, decimal total, decimal shipping)
    CalculateLineItems(
        List<LineItem> lineItems,
        List<Adjustment> adjustments,
        decimal shippingAmount,
        decimal defaultTaxRate,
        string currencyCode,  // NEW - for decimal places
        bool isShippingTaxable = true,
        MidpointRounding rounding = MidpointRounding.AwayFromZero)
```

- [ ] Add `ICurrencyService` dependency to `LineItemService`
- [ ] Add `currencyCode` parameter to `CalculateLineItems`
- [ ] Replace all `Math.Round(amount, 2, rounding)` with `_currencyService.Round(amount, currencyCode)`
- [ ] Update calling sites:
  - `CheckoutService.CalculateBasketAsync` (line 130)
  - `InvoiceService.RecalculateInvoiceTotals`
  - Any other callers

#### 5.5 Update ReportingService for Multi-Currency

**CRITICAL:** Reports currently sum raw amounts which will mix currencies!

**File:** `src/Merchello.Core/Reporting/Services/ReportingService.cs`

**CalculateBreakdown** (lines 287-319) - must use store currency:
```csharp
// BEFORE - mixes currencies!
var grossSales = invoices.Sum(i => i.SubTotal);
var discounts = invoices.Sum(i => i.Discount);
var taxes = invoices.Sum(i => i.Tax);

// AFTER - use store currency amounts
var grossSales = invoices.Sum(i => i.SubTotalInStoreCurrency ?? i.SubTotal);
var discounts = invoices.Sum(i => i.DiscountInStoreCurrency ?? i.Discount);
var taxes = invoices.Sum(i => i.TaxInStoreCurrency ?? i.Tax);
var shippingCharges = invoices
    .SelectMany(i => i.Orders ?? [])
    .Sum(o => o.ShippingCostInStoreCurrency ?? o.ShippingCost);  // Requires Order.ShippingCostInStoreCurrency
```

- [ ] Update `CalculateBreakdown()` to use `*InStoreCurrency` fields
- [ ] Update `GetAnalyticsSummaryAsync()` (line 60-61) - uses `i.SubTotal`, should use store currency
- [ ] Update `GetSalesTimeSeriesAsync()` (line 149) - uses `i.Total`, should use store currency
- [ ] Update `GetAverageOrderValueTimeSeriesAsync()` (line 203) - uses `i.Total`, should use store currency
- [ ] `Order.ShippingCostInStoreCurrency` is required (shipping is part of totals and reports must not mix currencies)
- [ ] Update refunds/returns reporting to use `Payment.AmountInStoreCurrency` (fallback to `Math.Abs(Amount)` only for legacy same-currency records)

---

### Phase 6: Admin Display

**Goal:** Show correct currencies in the admin UI.

#### 6.1 Update Order List API
- [ ] Return `TotalInStoreCurrency ?? Total` for list display
- [ ] Always show store currency symbol in list view
- [ ] Add `OriginalCurrencyCode` field if different from store currency

#### 6.2 Update Order Detail API
- [ ] Return both customer currency and store currency amounts
- [ ] Return pricing exchange rate used (`PricingExchangeRate` + source + timestamp)
- [ ] Format: "£17.85 GBP — Paid $23.81 USD (rate: 0.749)"

#### 6.3 Update C# DTOs (Backend)

**HIGH Priority DTOs** (contain monetary amounts displayed to users):

| DTO | File | Fields to Add |
|-----|------|---------------|
| `OrderDetailDto` | Accounting/Dtos/OrderDetailDto.cs | `CurrencyCode`, `CurrencySymbol`, `StoreCurrencyCode`, `PricingExchangeRate?`, `PricingExchangeRateSource?`, `PricingExchangeRateTimestampUtc?`, `TotalInStoreCurrency?` |
| `OrderListItemDto` | Accounting/Dtos/OrderListItemDto.cs | `CurrencyCode`, `CurrencySymbol`, `StoreCurrencyCode`, `TotalInStoreCurrency?`, `IsMultiCurrency` |
| `PreviewEditResultDto` | Accounting/Dtos/PreviewEditResultDto.cs | `CurrencyCode`, `CurrencySymbol`, `StoreCurrencyCode`, `PricingExchangeRate?` |
| `OrderExportItemDto` | Accounting/Dtos/OrderExportItemDto.cs | `CurrencyCode`, `StoreCurrencyCode`, `TotalInStoreCurrency?` |
| `DashboardStatsDto` | Accounting/Dtos/DashboardStatsDto.cs | `StoreCurrencyCode`, `StoreCurrencySymbol` (or derive via settings) |
| `PaymentDto` | Payments/Dtos/PaymentDto.cs | `CurrencyCode`, `AmountInStoreCurrency?`, `SettlementCurrencyCode?`, `SettlementExchangeRate?`, `SettlementAmount?` |
| `PaymentStatusDto` | Payments/Dtos/PaymentStatusDto.cs | `CurrencyCode`, `StoreCurrencyCode` |

**MEDIUM Priority DTOs** (nested, may inherit from parent):

| DTO | File | Notes |
|-----|------|-------|
| `LineItemDto` | Accounting/Dtos/LineItemDto.cs | Optional - can inherit from parent |
| `LineItemForEditDto` | Accounting/Dtos/LineItemForEditDto.cs | Optional - can inherit from parent |
| `FulfillmentOrderDto` | Accounting/Dtos/FulfillmentOrderDto.cs | Optional - can inherit from parent |
| `FulfillmentSummaryDto` | Accounting/Dtos/FulfillmentSummaryDto.cs | Consider adding for completeness |
| `DiscountLineItemDto` | Accounting/Dtos/DiscountLineItemDto.cs | Optional - can inherit from parent |

**Reference Pattern** - `InvoiceForEditDto` has currency fields; defaults should be neutral and values should come from service mapping:
```csharp
public string CurrencySymbol { get; set; } = "£";
public string CurrencyCode { get; set; } = "GBP";
```

#### 6.3.1 Update Controller Mapping Methods

**OrdersApiController.cs** - Add currency to mapping methods:
- [ ] `MapToListItem()` (~line 393) - Populate `CurrencyCode`, `CurrencySymbol` from invoice
- [ ] `MapToDetail()` (~line 431) - Populate `CurrencyCode`, `CurrencySymbol` from invoice
- [ ] Export methods - Ensure `OrderExportItemDto` includes currency
- [ ] Dashboard stats - Ensure `DashboardStatsDto` includes store currency

**PaymentsApiController.cs** - Add currency to payment responses:
- [ ] Payment mapping - Populate `CurrencyCode`, `CurrencySymbol` from invoice
- [ ] `GetPaymentStatus()` - Populate currency in `PaymentStatusDto`

**Note**: Controller may need `MerchelloSettings` injected to access currency. `InvoiceService` already has `_settings`.

#### 6.4 Update TypeScript (per TypeScript Guidelines)

**File structure:**
```
src/backoffice/
├── orders/
│   └── types/
│       └── order.types.ts           # Add currency fields to existing types
├── shared/
│   ├── types/
│   │   └── currency.types.ts        # NEW - Currency interfaces
│   └── utils/
│       └── currency-formatting.ts   # NEW - Format helpers
```

**Type definitions (interface over type per guidelines):**
```typescript
// shared/types/currency.types.ts
export interface CurrencyAmount {
  amount: number;
  currencyCode: string;
  currencySymbol?: string;
}

export interface MultiCurrencyInvoice {
  // Customer currency (what they paid)
  total: number;
  currencyCode: string;
  currencySymbol: string;

  // Store currency (for reporting)
  storeCurrencyCode: string;
  totalInStoreCurrency?: number;
  pricingExchangeRate?: number;

  // Helper
  isMultiCurrency: boolean;  // true if currencyCode !== storeCurrencyCode
}
```

**Update existing order types:**
```typescript
// orders/types/order.types.ts - extend existing interfaces
export interface InvoiceListItem {
  // ... existing fields ...
  currencyCode: string;
  storeCurrencyCode: string;
  totalInStoreCurrency?: number;
  isMultiCurrency: boolean;
}

export interface InvoiceForEdit {
  // ... existing fields ...
  currencyCode: string;
  currencySymbol: string;
  storeCurrencyCode: string;
  pricingExchangeRate?: number;
  totalInStoreCurrency?: number;
}
```

#### 6.4 Update Frontend DTOs (order.types.ts)

**DTOs that need `currencyCode` and `currencySymbol` fields added:**

| DTO | Current State | Fields to Add |
|-----|---------------|---------------|
| `OrderListItemDto` | Only `total: number` | `currencyCode`, `currencySymbol`, `totalInStoreCurrency?`, `isMultiCurrency` |
| `OrderDetailDto` | Multiple amounts, no currency | `currencyCode`, `currencySymbol`, `exchangeRate?`, `*InStoreCurrency` fields |
| `FulfillmentOrderDto` | `shippingCost: number` | `currencyCode`, `currencySymbol` |
| `LineItemDto` | `amount`, `originalAmount` | `currencyCode`, `currencySymbol`, `amountInStoreCurrency?` |
| `PaymentDto` | `amount: number` | `currencyCode`, `currencySymbol`, `amountInStoreCurrency?` |
| `PaymentStatusDto` | `invoiceTotal`, `totalPaid`, etc. | `currencyCode`, `currencySymbol` |
| `InvoiceForEditDto` | **Already has currency** ✓ | No changes needed |

#### 6.5 Update Formatting Utilities

**File:** `src/Merchello/Client/src/shared/utils/formatting.ts`

Current `formatCurrency()` uses global store currency. Update to:
```typescript
// Add optional currency parameter
export function formatCurrency(amount: number, currencySymbol?: string): string {
  const symbol = currencySymbol ?? getCurrencySymbol();
  return `${symbol}${amount.toFixed(2)}`;
}
```

#### 6.6 Update Order List Component
- [ ] Update `orders-list.element.ts` (line 228) to use order-specific currency
- [ ] Show currency indicator badge for foreign currency orders
- [ ] Use `totalInStoreCurrency` for consistent sorting/filtering

#### 6.7 Update Order Detail Component

**File:** `src/Merchello/Client/src/orders/components/order-detail.element.ts`

Currency displays to update:
- Lines 493, 512, 516: Fulfillment card amounts
- Lines 737-772: Payment summary (subtotal, discount, shipping, tax, total, paid, balance)
- Pass `order.currencySymbol` to all `formatCurrency()` calls

#### 6.8 Update Payment Panel Component

**File:** `src/Merchello/Client/src/orders/components/payment-panel.element.ts`

- Lines 248, 252, 258, 265: Payment status summary
- Line 174: Payment history amounts
- Pass currency from `PaymentStatusDto` and `PaymentDto`

#### 6.9 Update Modal Components

| Modal | File | Issue | Fix |
|-------|------|-------|-----|
| Manual Payment | `manual-payment-modal.element.ts` | Line 101 uses global currency | Pass currency in modal data |
| Refund | `refund-modal.element.ts` | Lines 46, 97, 125 hardcoded | Pass currency in modal data |
| Add Discount | `add-discount-modal.element.ts` | **Already OK** ✓ | Receives `currencySymbol` in data |
| Add Custom Item | `add-custom-item-modal.element.ts` | **Already OK** ✓ | Receives `currencySymbol` in data |

#### 6.10 Update Order Table Component
- [ ] Update `order-table.element.ts` line 177 to use order-specific currency

---

### Phase 7: Testing & Seed Data

**Goal:** Ensure everything works end-to-end.

#### 7.1 Unit Tests (per Developer Guidelines)
- [ ] Add unit tests for `ICurrencyService.Round()`, `FormatAmount()`, `GetDecimalPlaces()`
- [ ] Use **Shouldly** for assertions: `result.ShouldBe(expected)`, `decimals.ShouldBe(0)` for JPY
- [ ] Test edge cases: zero-decimal currencies (JPY), three-decimal currencies (KWD)

#### 7.2 Update Seed Data
- [ ] Add test invoices with different currencies (GBP, EUR, JPY)
- [ ] Include legacy same-currency invoices with null pricing rates and multi-currency invoices with pricing rates set
- [ ] Include invoices with refunds in foreign currency

#### 7.3 Manual Testing Checklist
- [ ] Create basket in store currency → invoice correct
- [ ] Create basket in foreign currency → invoice has currency fields
- [ ] Pay invoice → settlement exchange rate captured from provider (pricing rate already exists on invoice)
- [ ] Edit paid foreign currency order → store amounts recalculate
- [ ] Refund foreign currency order → uses original rate
- [ ] Order list shows store currency
- [ ] Order detail shows both currencies

#### 7.4 Update Documentation
- [ ] Update `docs/PaymentProviders-Architecture.md` - Add `SettlementExchangeRate`, `SettlementCurrency`, `SettlementAmount` fields to PaymentResult
- [ ] Update `docs/PaymentProviders-DevGuide.md` - Document how providers should return exchange rate data
- [ ] Update `docs/Architecture-Diagrams.md` - Add multi-currency flow, note `*InStoreCurrency` fields on Invoice/Payment
- [ ] **Shipping Providers**: configured shipping costs are stored in store currency and must be converted to basket/invoice currency (and store equivalents persisted)

---

### Phase 8: Exchange Rate Provider (Frankfurter)

**Goal:** Enable fetching live exchange rates for display and conversion.

#### 8.1 Provider Interface & Models
- [ ] Create `src/Merchello.Core/ExchangeRates/Providers/IExchangeRateProvider.cs` interface
- [ ] Create `ExchangeRateProviderMetadata` record
- [ ] Create `ExchangeRateResult` record
- [ ] Create `src/Merchello.Core/ExchangeRates/Models/ExchangeRateProviderSetting.cs` entity

#### 8.2 Provider Manager
- [ ] Create `src/Merchello.Core/ExchangeRates/Providers/ExchangeRateProviderManager.cs`
- [ ] Implement single-active pattern (enabling one disables others)
- [ ] Create `ExchangeRateProviderSettingDbMapping.cs`
- [ ] Run migration for new table

#### 8.3 Frankfurter Provider
- [ ] Create `src/Merchello.Core/ExchangeRates/Providers/FrankfurterExchangeRateProvider.cs`
- [ ] Implement `GetRatesAsync()` - fetch from `https://api.frankfurter.dev/v1/latest`
- [ ] Implement `GetRateAsync()` - fetch specific pair
- [ ] No configuration fields needed (no API key required)
- [ ] Handle HTTP errors gracefully

#### 8.4 Caching Service
- [ ] Create `src/Merchello.Core/ExchangeRates/Services/IExchangeRateCache.cs` interface
- [ ] Create `ExchangeRateCache.cs` implementation using `ICacheService` (HybridCache)
- [ ] Cache rates with configurable TTL (default 1 hour)
- [ ] Store last successful rates in DB for fallback

#### 8.5 Background Refresh Job
- [ ] Create `src/Merchello.Core/ExchangeRates/Services/ExchangeRateRefreshJob.cs`
- [ ] Implement `IHostedService` for periodic refresh
- [ ] Configurable interval (default: hourly, matches Frankfurter's daily update)
- [ ] Log warnings on fetch failures, continue using cached rates

#### 8.6 Notifications (per Developer Guidelines)
- [ ] Create `ExchangeRates/Notifications/ExchangeRatesRefreshedNotification.cs`
- [ ] Create `ExchangeRates/Notifications/ExchangeRateFetchFailedNotification.cs`
- [ ] Publish `ExchangeRatesRefreshedNotification` after successful fetch
- [ ] Publish `ExchangeRateFetchFailedNotification` after failed fetch
- [ ] Track consecutive failures in notification

#### 8.7 Register Services
- [ ] Register `IExchangeRateProvider` implementations in DI
- [ ] Register `IExchangeRateProviderManager`
- [ ] Register `IExchangeRateCache`
- [ ] Register `ExchangeRateRefreshJob` as hosted service
- [ ] Update `Merchello.Core/Startup.cs` assembly discovery to include `IExchangeRateProvider` so plugin providers are discoverable
- [ ] Ensure providers auto-discovered via `ExtensionManager`

---

### Phase 9: Frontend Currency Display (Future, Optional)

**Goal:** Allow customers to see prices in their currency.

#### 9.1 Settings
- [ ] Add `CurrencyDisplaySettings` to `MerchelloSettings`
- [ ] All options disabled by default

#### 9.2 Conversion Service
- [ ] Create `ICurrencyConversionService`
- [ ] Only active when `EnableMultiCurrency = true`
- [ ] Use cached rates from exchange rate provider

#### 9.3 Currency Detection
- [ ] Implement geo-IP detection (when `AutoDetect = true`)
- [ ] Browser locale fallback
- [ ] Customer preference storage

#### 9.4 Product API Updates
- [ ] Return converted prices when multi-currency enabled
- [ ] Include approximate indicator
- [ ] Show original price alongside

#### 9.5 Currency Selector
- [ ] Create selector component (when `ShowSelector = true`)
- [ ] Persist selection in session/cookie
- [ ] Update basket on currency change

#### 9.6 Basket Currency Locking
- [ ] Lock currency on first add-to-cart
- [ ] Convert prices if customer changes currency (don't clear basket)

---

**Note**: Phases 1-8 are MVP. Phase 9 is a future enhancement for stores that want customer-facing multi-currency display.

---

## 11. Key Files to Modify

### Feature Folder Structure (per Developer Guidelines)

```
src/Merchello.Core/
├── Shared/
│   └── Services/
│       ├── ICurrencyService.cs          # Phase 1
│       └── CurrencyService.cs           # Phase 1
│
├── ExchangeRates/                       # Phase 8 - New feature folder
│   ├── Models/
│   │   ├── ExchangeRateProviderSetting.cs
│   │   ├── ExchangeRateProviderMetadata.cs
│   │   └── ExchangeRateResult.cs
│   ├── Mapping/
│   │   └── ExchangeRateProviderSettingDbMapping.cs
│   ├── Providers/
│   │   ├── IExchangeRateProvider.cs
│   │   ├── ExchangeRateProviderManager.cs
│   │   └── FrankfurterExchangeRateProvider.cs
│   ├── Services/
│   │   ├── IExchangeRateCache.cs
│   │   ├── ExchangeRateCache.cs
│   │   └── ExchangeRateRefreshJob.cs
│   └── Notifications/
│       ├── ExchangeRatesRefreshedNotification.cs
│       └── ExchangeRateFetchFailedNotification.cs
```

### Files by Phase

| File | Changes | Phase |
|------|---------|-------|
| `Shared/Services/ICurrencyService.cs` | **NEW** - Currency metadata interface | 1 |
| `Shared/Services/CurrencyService.cs` | **NEW** - Implementation with decimal places | 1 |
| [InvoiceService.cs](../src/Merchello.Core/Accounting/Services/InvoiceService.cs) | ~~Fix hardcoded GBP~~ **DONE** (lines 1883-1884) | 1 ✓ |
| [Invoice.cs](../src/Merchello.Core/Accounting/Models/Invoice.cs) | Add `CurrencyCode`, `StoreCurrencyCode`, `PricingExchangeRate*`, and `*InStoreCurrency` totals | 2 |
| [Payment.cs](../src/Merchello.Core/Accounting/Models/Payment.cs) | Add `CurrencyCode`, `AmountInStoreCurrency`, and `Settlement*` fields | 2 |
| [LineItem.cs](../src/Merchello.Core/Accounting/Models/LineItem.cs) | Add AmountInStoreCurrency field | 2 |
| [Order.cs](../src/Merchello.Core/Accounting/Models/Order.cs) | Add `ShippingCostInStoreCurrency` + `DeliveryDateSurchargeInStoreCurrency` | 2 |
| [PaymentResult.cs](../src/Merchello.Core/Payments/Models/PaymentResult.cs) | Add SettlementExchangeRate, SettlementCurrency, SettlementAmount | 2 |
| [InvoiceDbMapping.cs](../src/Merchello.Core/Accounting/Mapping/InvoiceDbMapping.cs) | Map new columns + **add index on CurrencyCode** | 2 |
| [PaymentDbMapping.cs](../src/Merchello.Core/Accounting/Mapping/PaymentDbMapping.cs) | Map new columns | 2 |
| [LineItemDbMapping.cs](../src/Merchello.Core/Accounting/Mapping/LineItemDbMapping.cs) | Map AmountInStoreCurrency | 2 |
| [OrderDbMapping.cs](../src/Merchello.Core/Accounting/Mapping/OrderDbMapping.cs) | Map shipping store-currency fields | 2 |
| [ShippingServiceLevel.cs](../src/Merchello.Core/Shipping/Providers/ShippingServiceLevel.cs) | **Fix CurrencyCode default** (change to `required`) | 3 |
| [FlatRateShippingProvider.cs](../src/Merchello.Core/Shipping/Providers/BuiltIn/FlatRateShippingProvider.cs) | Pass currency explicitly | 3 |
| [InvoiceService.cs](../src/Merchello.Core/Accounting/Services/InvoiceService.cs) | Copy currency from basket, lock pricing rate, populate/sync store amounts | 3-5 |
| [PaymentService.cs](../src/Merchello.Core/Payments/Services/PaymentService.cs) | Persist settlement fields per payment, compute `AmountInStoreCurrency`, make `CalculatePaymentStatus` currency-aware | 4-5 |
| [StripePaymentProvider.cs](../src/Merchello.PaymentProviders/Stripe/StripePaymentProvider.cs) | Return settlement currency/exchange rate/amount from BalanceTransaction | 4 |
| [LineItemService.cs](../src/Merchello.Core/Accounting/Services/LineItemService.cs) | **Add currency parameter**, use ICurrencyService.Round() | 5 |
| [CheckoutService.cs](../src/Merchello.Core/Checkout/Services/CheckoutService.cs) | **Fix CreateBasket defaults**, pass currency to CalculateLineItems | 3, 5 |
| [ReportingService.cs](../src/Merchello.Core/Reporting/Services/ReportingService.cs) | **Use *InStoreCurrency fields** in all 4 methods | 5 |
| `Accounting/Dtos/OrderDetailDto.cs` | Add CurrencyCode/CurrencySymbol + store currency + pricing rate metadata | 6 |
| `Accounting/Dtos/OrderListItemDto.cs` | Add CurrencyCode/CurrencySymbol + StoreCurrencyCode + TotalInStoreCurrency + IsMultiCurrency | 6 |
| `Accounting/Dtos/PreviewEditResultDto.cs` | Add CurrencyCode/CurrencySymbol + StoreCurrencyCode + PricingExchangeRate | 6 |
| `Accounting/Dtos/OrderExportItemDto.cs` | Add CurrencyCode + StoreCurrencyCode + TotalInStoreCurrency (export in store currency) | 6 |
| `Accounting/Dtos/DashboardStatsDto.cs` | Return store currency context (code/symbol) | 6 |
| `Payments/Dtos/PaymentDto.cs` | Add CurrencyCode + AmountInStoreCurrency + Settlement* fields | 6 |
| `Payments/Dtos/PaymentStatusDto.cs` | Add CurrencyCode + StoreCurrencyCode | 6 |
| `Controllers/OrdersApiController.cs` | Update MapToListItem(), MapToDetail() with currency | 6 |
| `Controllers/PaymentsApiController.cs` | Update payment mapping with currency | 6 |
| `Client/src/orders/types/order.types.ts` | Add currency fields to 6 DTOs | 6 |
| `Client/src/shared/utils/formatting.ts` | Add optional currencySymbol parameter | 6 |
| `Client/src/orders/components/order-detail.element.ts` | Pass currency to formatCurrency calls | 6 |
| `Client/src/orders/components/payment-panel.element.ts` | Pass currency to formatCurrency calls | 6 |
| `Client/src/orders/components/orders-list.element.ts` | Use order-specific currency | 6 |
| `Client/src/orders/components/order-table.element.ts` | Use order-specific currency | 6 |
| `Client/src/orders/modals/manual-payment-modal.element.ts` | Receive currency in modal data | 6 |
| `Client/src/orders/modals/refund-modal.element.ts` | Receive currency in modal data | 6 |
| `ExchangeRates/Models/*.cs` | **NEW** - All model records in separate files | 8 |
| `ExchangeRates/Providers/IExchangeRateProvider.cs` | **NEW** - Provider interface | 8 |
| `ExchangeRates/Providers/ExchangeRateProviderManager.cs` | **NEW** - Provider manager | 8 |
| `ExchangeRates/Providers/FrankfurterExchangeRateProvider.cs` | **NEW** - Frankfurter implementation | 8 |
| `ExchangeRates/Mapping/ExchangeRateProviderSettingDbMapping.cs` | **NEW** - DB mapping | 8 |
| `ExchangeRates/Services/IExchangeRateCache.cs` | **NEW** - Cache interface | 8 |
| `ExchangeRates/Services/ExchangeRateCache.cs` | **NEW** - Cache implementation | 8 |
| `ExchangeRates/Services/ExchangeRateRefreshJob.cs` | **NEW** - Background refresh | 8 |
| `ExchangeRates/Notifications/*.cs` | **NEW** - Notification classes | 8 |
| `docs/PaymentProviders-Architecture.md` | Document `PaymentResult` settlement fields (`SettlementExchangeRate`, `SettlementCurrency`, `SettlementAmount`) | 7 |
| `docs/PaymentProviders-DevGuide.md` | Document how providers should return exchange rate data | 7 |
| `docs/Architecture-Diagrams.md` | Add multi-currency flow diagram | 7 |

---

## 12. Estimated Effort

| Phase | Description | Effort | Dependency |
|-------|-------------|--------|------------|
| Phase 1 | Foundation & Fixes | 0.25 day | None (1.2 already done) |
| Phase 2 | Data Model Changes | 0.5 day | Phase 1 |
| Phase 3 | Invoice Creation Flow | 0.5 day | Phase 2 |
| Phase 4 | Payment Flow | 1 day | Phase 3 |
| Phase 5 | Order Edits, Refunds & Calculation Methods | 1.5 days | Phase 4 |
| Phase 6 | Admin Display (C# DTOs + API + Frontend) | 2 days | Phase 5 |
| Phase 7 | Testing & Seed Data | 0.5 day | Phase 6 |
| Phase 8 | Exchange Rate Provider (Frankfurter) | 1.5 days | Phase 1 (can parallel) |
| **Total MVP (Phases 1-8)** | | **8-9 days** | |
| Phase 9 | Frontend Currency Display | 2-3 days | Phase 8 |

**Note:** Phase 8 can be developed in parallel with Phases 2-7 since it only depends on Phase 1 (ICurrencyService).

**Phase 5 includes:** Centralized calculation methods (RecalculateInvoiceTotals, PreviewInvoiceEditAsync, CalculateLineItems, CalculatePaymentStatus, etc.)

**Phase 6 includes:** 7 C# DTOs, 2 controllers, 6 TypeScript DTOs, 5 components, 2 modals, formatting utilities.

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
- `StoreCurrencyCode` = "USD"
- `PricingExchangeRate` = 1.333 (presentment -> store, locked at order creation)
- `PricingExchangeRateSource` = "frankfurter" (example)
- `PricingExchangeRateTimestampUtc` = 2025-12-13T10:00:00Z (example)

---

## 14. Next Steps

- [ ] Phase 1: Implement `ICurrencyService` (rounding + minor units) and wire it into invoice/payment/line-item/tax calculations.
- [ ] Phase 2: Add new currency columns + precision upgrades; run migrations/backfill on a copy of production data; validate indexes and query plans.
- [ ] Phase 3: Lock `PricingExchangeRate` at invoice creation and persist all `*InStoreCurrency` values; fix shipping quote currency safety and hardcoded currency defaults.
- [ ] Phase 4: Update payment providers to emit settlement metadata when available; persist it per `Payment` (do not overwrite invoice store totals).
- [ ] Phase 5: Update centralized calculation methods + `ReportingService` to use store-currency fields and prevent mixed-currency sums.
- [ ] Phase 6/7: Update DTOs/UI formatting to always include currency code; add tests and run full regression.
- [ ] Rollout: keep multi-currency feature-flagged; enable per environment and reconcile reports (shop money vs settlement) before production.

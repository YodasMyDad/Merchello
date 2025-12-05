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
- Zero-decimal currencies: `JPY, KRW, VND, CLP, PYG, GNF, RWF, UGX, BIF, XOF, XAF, KMF, DJF, MGA, VUV`
- Three-decimal currencies: `KWD, BHD, OMR`

**Where it's used:**
- `InvoiceService` - formatting for display/notes
- `PaymentService` - amount validation and rounding
- Admin UI - displaying amounts correctly
- Stripe provider - can delegate to this instead of its own HashSet

**Location:** `src/Merchello.Core/Shared/Services/CurrencyService.cs`

### 3.6 Fix: InvoiceForEditDto Hardcoded Currency

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

This is a prerequisite fix before adding multi-currency support.

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

Each phase is broken into atomic tasks. Complete all tasks in a phase before moving to the next.

---

### Phase 1: Foundation & Fixes (Pre-requisites)

**Goal:** Set up infrastructure and fix existing issues before adding multi-currency.

#### 1.1 Create ICurrencyService
- [ ] Create `src/Merchello.Core/Shared/Services/ICurrencyService.cs` interface
- [ ] Create `src/Merchello.Core/Shared/Services/CurrencyService.cs` implementation
- [ ] Add static dictionary with common currencies (code, symbol, decimal places)
- [ ] Include zero-decimal currencies: `JPY, KRW, VND, CLP, PYG, GNF, RWF, UGX, BIF, XOF, XAF, KMF, DJF, MGA, VUV`
- [ ] Include three-decimal currencies: `KWD, BHD, OMR`
- [ ] Register in DI container
- [ ] Add unit tests for `Round()`, `FormatAmount()`, `GetDecimalPlaces()`

#### 1.2 Fix InvoiceForEditDto Hardcoded Currency
- [ ] Update `GetInvoiceForEditAsync()` in `InvoiceService.cs`
- [ ] Change `CurrencyCode` from hardcoded `"GBP"` to `_settings.StoreCurrencyCode`
- [ ] Change `CurrencySymbol` from hardcoded `"£"` to `_settings.CurrencySymbol`
- [ ] Verify in admin UI that correct currency displays

---

### Phase 2: Data Model Changes

**Goal:** Add all currency-related fields to models and database.

#### 2.1 Update Invoice Model
- [ ] Add to `Invoice.cs`:
  ```csharp
  public string CurrencyCode { get; set; } = "USD";
  public string CurrencySymbol { get; set; } = "$";
  public decimal? SubTotalInStoreCurrency { get; set; }
  public decimal? TaxInStoreCurrency { get; set; }
  public decimal? TotalInStoreCurrency { get; set; }
  public decimal? ExchangeRate { get; set; }
  ```

#### 2.2 Update Payment Model
- [ ] Add to `Payment.cs`:
  ```csharp
  public string CurrencyCode { get; set; } = "USD";
  public decimal? ExchangeRate { get; set; }
  public decimal? AmountInStoreCurrency { get; set; }
  public string? ExchangeRateSource { get; set; }
  ```

#### 2.3 Update LineItem Model
- [ ] Add to `LineItem.cs`:
  ```csharp
  public decimal? AmountInStoreCurrency { get; set; }
  ```

#### 2.4 Update PaymentResult Model
- [ ] Add to `PaymentResult.cs`:
  ```csharp
  public decimal? ExchangeRate { get; init; }
  public string? SettlementCurrency { get; init; }
  public decimal? SettlementAmount { get; init; }
  ```
- [ ] Update factory methods if needed

#### 2.5 Update Database Mappings
- [ ] Update `InvoiceDbMapping.cs` - add all new columns with correct precision (18,2)
- [ ] Update `PaymentDbMapping.cs` - add all new columns
- [ ] Update `LineItemDbMapping.cs` (or equivalent) - add `AmountInStoreCurrency`

#### 2.6 Create and Run Migration
- [ ] Run `migrations.ps1` to generate migration for all providers
- [ ] Test migration on dev database
- [ ] Verify columns created correctly

---

### Phase 3: Invoice Creation Flow

**Goal:** Capture currency when creating invoices from baskets.

#### 3.1 Update CreateOrderFromBasketAsync
- [ ] In `InvoiceService.CreateOrderFromBasketAsync()`:
  - Copy `basket.Currency` to `invoice.CurrencyCode` (fallback to `_settings.StoreCurrencyCode`)
  - Copy `basket.CurrencySymbol` to `invoice.CurrencySymbol` (fallback to `_settings.CurrencySymbol`)
- [ ] If invoice currency equals store currency, leave `*InStoreCurrency` fields null

#### 3.2 Update Invoice DTOs
- [ ] Add currency fields to any invoice DTOs used by APIs
- [ ] Update `InvoiceForEditDto` to read from invoice (not just settings)

---

### Phase 4: Payment Flow

**Goal:** Capture exchange rate from payment providers and update invoice.

#### 4.1 Update Stripe Provider
- [ ] In `StripePaymentProvider.cs`, after successful payment:
  - Extract `exchange_rate` from `BalanceTransaction`
  - Extract settlement currency and amount
  - Populate `PaymentResult.ExchangeRate`, `SettlementCurrency`, `SettlementAmount`
- [ ] Update webhook handler to capture exchange rate from events

#### 4.2 Update PaymentService
- [ ] In `RecordPaymentAsync()`:
  - Copy `PaymentResult.ExchangeRate` to `Payment.ExchangeRate`
  - Set `Payment.CurrencyCode` from invoice
  - Calculate `Payment.AmountInStoreCurrency` if exchange rate provided
  - Set `Payment.ExchangeRateSource` (e.g., "stripe")

#### 4.3 Create UpdateStoreCurrencyAmountsAsync Method
- [ ] Add method to `InvoiceService`:
  ```csharp
  public async Task UpdateStoreCurrencyAmountsAsync(Invoice invoice, decimal exchangeRate)
  ```
- [ ] Calculate and set `SubTotalInStoreCurrency`, `TaxInStoreCurrency`, `TotalInStoreCurrency`
- [ ] Sync all line items with `AmountInStoreCurrency`
- [ ] Call this method after payment is recorded (if exchange rate provided)

#### 4.4 Update Manual Payment Recording
- [ ] For manual payments, allow optional exchange rate input
- [ ] If no rate provided and currencies differ, leave store amounts null (or require rate)

---

### Phase 5: Order Edits & Refunds

**Goal:** Ensure edits and refunds work correctly with multi-currency orders.

#### 5.1 Update EditInvoiceAsync for Multi-Currency
- [ ] All edit inputs (discounts, custom items) are in invoice currency
- [ ] After applying edits, if `invoice.ExchangeRate` exists:
  - Recalculate `*InStoreCurrency` totals
  - Set `AmountInStoreCurrency` on new/modified line items
- [ ] Add validation: if editing unpaid foreign currency order, warn that store amounts will be calculated at payment

#### 5.2 Update Refund Flow
- [ ] In refund creation:
  - Use `invoice.CurrencyCode` for refund currency
  - Use `invoice.ExchangeRate` for refund exchange rate (original rate)
  - Calculate `AmountInStoreCurrency` using original rate
- [ ] Ensure refund reporting uses store currency amounts

---

### Phase 6: Admin Display

**Goal:** Show correct currencies in the admin UI.

#### 6.1 Update Order List API
- [ ] Return `TotalInStoreCurrency ?? Total` for list display
- [ ] Always show store currency symbol in list view
- [ ] Add `OriginalCurrencyCode` field if different from store currency

#### 6.2 Update Order Detail API
- [ ] Return both customer currency and store currency amounts
- [ ] Return exchange rate used
- [ ] Format: "£17.85 GBP — Paid $23.81 USD (rate: 0.749)"

#### 6.3 Update TypeScript (per TypeScript Guidelines)

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
  amount: decimal;
  currencyCode: string;
  currencySymbol: string;
}

export interface MultiCurrencyInvoice {
  // Customer currency (what they paid)
  total: decimal;
  currencyCode: string;
  currencySymbol: string;

  // Store currency (for reporting)
  totalInStoreCurrency?: decimal;
  exchangeRate?: decimal;

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
  totalInStoreCurrency?: decimal;
  isMultiCurrency: boolean;
}

export interface InvoiceForEdit {
  // ... existing fields ...
  currencyCode: string;
  currencySymbol: string;
  exchangeRate?: decimal;
  totalInStoreCurrency?: decimal;
}
```

#### 6.4 Update Order List Component
- [ ] Update `orders-list.element.ts` to display store currency
- [ ] Show currency indicator for foreign currency orders
- [ ] Use `currencySymbol` from store settings for list totals

#### 6.5 Update Order Detail Component
- [ ] Update `order-detail.element.ts` to show both currencies
- [ ] Format: "£17.85 GBP — Paid $23.81 USD (rate: 0.749)"
- [ ] Add helper `renderCurrencyAmount()` for consistent formatting

#### 6.6 Update Order Edit UI
- [ ] Show invoice currency prominently when editing
- [ ] Input fields use invoice currency
- [ ] Show store currency equivalent where helpful
- [ ] Add currency indicator badge for multi-currency orders

---

### Phase 7: Testing & Seed Data

**Goal:** Ensure everything works end-to-end.

#### 7.1 Update Seed Data
- [ ] Add test invoices with different currencies (GBP, EUR, JPY)
- [ ] Include invoices with and without exchange rates
- [ ] Include invoices with refunds in foreign currency

#### 7.2 Manual Testing Checklist
- [ ] Create basket in store currency → invoice correct
- [ ] Create basket in foreign currency → invoice has currency fields
- [ ] Pay invoice → exchange rate captured from Stripe
- [ ] Edit paid foreign currency order → store amounts recalculate
- [ ] Refund foreign currency order → uses original rate
- [ ] Order list shows store currency
- [ ] Order detail shows both currencies

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
- [ ] Create `ExchangeRateCache.cs` implementation using `IMemoryCache`
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
| [InvoiceService.cs](../src/Merchello.Core/Accounting/Services/InvoiceService.cs) | Fix hardcoded GBP in GetInvoiceForEditAsync | 1 |
| [Invoice.cs](../src/Merchello.Core/Accounting/Models/Invoice.cs) | Add currency + store currency fields | 2 |
| [Payment.cs](../src/Merchello.Core/Accounting/Models/Payment.cs) | Add currency + exchange rate fields | 2 |
| [LineItem.cs](../src/Merchello.Core/Accounting/Models/LineItem.cs) | Add AmountInStoreCurrency field | 2 |
| [PaymentResult.cs](../src/Merchello.Core/Payments/Models/PaymentResult.cs) | Add ExchangeRate, SettlementCurrency, SettlementAmount | 2 |
| [InvoiceDbMapping.cs](../src/Merchello.Core/Accounting/Mapping/InvoiceDbMapping.cs) | Map new columns | 2 |
| [PaymentDbMapping.cs](../src/Merchello.Core/Accounting/Mapping/PaymentDbMapping.cs) | Map new columns | 2 |
| [LineItemDbMapping.cs](../src/Merchello.Core/Accounting/Mapping/LineItemDbMapping.cs) | Map AmountInStoreCurrency | 2 |
| [InvoiceService.cs](../src/Merchello.Core/Accounting/Services/InvoiceService.cs) | Copy currency from basket, UpdateStoreCurrencyAmountsAsync | 3-5 |
| [PaymentService.cs](../src/Merchello.Core/Payments/Services/PaymentService.cs) | Capture exchange rate, update invoice | 4 |
| [StripePaymentProvider.cs](../src/Merchello.PaymentProviders/Stripe/StripePaymentProvider.cs) | Return exchange rate from BalanceTransaction | 4 |
| `ExchangeRates/Models/*.cs` | **NEW** - All model records in separate files | 8 |
| `ExchangeRates/Providers/IExchangeRateProvider.cs` | **NEW** - Provider interface | 8 |
| `ExchangeRates/Providers/ExchangeRateProviderManager.cs` | **NEW** - Provider manager | 8 |
| `ExchangeRates/Providers/FrankfurterExchangeRateProvider.cs` | **NEW** - Frankfurter implementation | 8 |
| `ExchangeRates/Mapping/ExchangeRateProviderSettingDbMapping.cs` | **NEW** - DB mapping | 8 |
| `ExchangeRates/Services/IExchangeRateCache.cs` | **NEW** - Cache interface | 8 |
| `ExchangeRates/Services/ExchangeRateCache.cs` | **NEW** - Cache implementation | 8 |
| `ExchangeRates/Services/ExchangeRateRefreshJob.cs` | **NEW** - Background refresh | 8 |
| `ExchangeRates/Notifications/*.cs` | **NEW** - Notification classes | 8 |

---

## 12. Estimated Effort

| Phase | Description | Effort | Dependency |
|-------|-------------|--------|------------|
| Phase 1 | Foundation & Fixes | 0.5 day | None |
| Phase 2 | Data Model Changes | 0.5 day | Phase 1 |
| Phase 3 | Invoice Creation Flow | 0.5 day | Phase 2 |
| Phase 4 | Payment Flow | 1 day | Phase 3 |
| Phase 5 | Order Edits & Refunds | 1 day | Phase 4 |
| Phase 6 | Admin Display | 1 day | Phase 5 |
| Phase 7 | Testing & Seed Data | 0.5 day | Phase 6 |
| Phase 8 | Exchange Rate Provider (Frankfurter) | 1.5 days | Phase 1 (can parallel) |
| **Total MVP (Phases 1-8)** | | **6-7 days** | |
| Phase 9 | Frontend Currency Display | 2-3 days | Phase 8 |

**Note:** Phase 8 can be developed in parallel with Phases 2-7 since it only depends on Phase 1 (ICurrencyService).

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
- [x] ~~Add ICurrencyService for decimal places handling~~ (Done - see section 3.5)
- [x] ~~Document InvoiceForEditDto hardcoded GBP fix~~ (Done - see section 3.6)
- [x] ~~Restructure phases into manageable tasks~~ (Done - see section 10)
- [x] ~~Add Frankfurter as default exchange rate provider~~ (Done - see section 6.5, 6.6)
- [x] ~~Align with Developer Guidelines~~ (Done - feature folders, notifications, models in separate files)
- [x] ~~Align with TypeScript Guidelines~~ (Done - interface over type, file naming conventions)
- [ ] Begin Phase 1: Foundation & Fixes
  - [ ] Create ICurrencyService
  - [ ] Fix InvoiceForEditDto hardcoded currency
- [ ] Phase 8 can start in parallel after Phase 1 completes
- [ ] Continue through remaining phases sequentially


# Multi-Currency Architecture Plan for Merchello

## Goal

Enable customers to checkout in their local currency while maintaining all reporting, order lists, and exports in the store's default currency (e.g., USD).

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

## 2. Simplified Approach: Payment Provider Handles Conversion

For MVP, let the payment provider (Stripe) handle currency conversion:

```
Customer (UK) → Sees £15.00 → Pays £15.00 to Stripe → Stripe converts → You receive ~$20 USD
                                                              ↓
                                               Stripe tells us the exchange rate
```

**No exchange rate API needed initially** - Stripe provides the rate when payment settles.

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

### 3.3 Database Mapping Updates

| File | New Columns |
|------|-------------|
| [InvoiceDbMapping.cs](../src/Merchello.Core/Accounting/Mapping/InvoiceDbMapping.cs) | CurrencyCode, CurrencySymbol, SubTotalInStoreCurrency, TaxInStoreCurrency, TotalInStoreCurrency, ExchangeRate |
| [PaymentDbMapping.cs](../src/Merchello.Core/Accounting/Mapping/PaymentDbMapping.cs) | CurrencyCode, ExchangeRate, AmountInStoreCurrency, ExchangeRateSource |

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

## 5. Payment Provider Interface Update

Update [IPaymentProvider](../src/Merchello.Core/Payments/Providers/IPaymentProvider.cs) result models:

```csharp
public class PaymentResult
{
    // ... existing fields ...
    public decimal? ExchangeRate { get; set; }
    public decimal? AmountInSettlementCurrency { get; set; }
    public string? SettlementCurrency { get; set; }
}
```

Stripe and other providers that handle multi-currency will populate these fields.

---

## 6. Admin UI Considerations

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

## 7. Implementation Phases

### Phase 1: Data Model (MVP Foundation)

1. Add currency fields to Invoice model
2. Add currency/rate fields to Payment model
3. Update DB mappings
4. Run migration
5. Update `CreateOrderFromBasketAsync()` to copy basket currency

### Phase 2: Payment Flow

1. Update `PaymentService` to store currency info
2. Update Stripe provider to return exchange rate from webhooks/responses
3. Calculate and store `TotalInStoreCurrency` on invoice after payment

### Phase 3: Admin Display

1. Update order list API to return store currency totals
2. Update order detail to show both currencies
3. Update TypeScript DTOs

### Phase 4: Future Enhancements (Not MVP)

- Exchange rate provider system for estimates
- Multi-currency product pricing
- Currency selector in frontend

---

## 8. Key Files to Modify

| File | Changes |
|------|---------|
| [Invoice.cs](../src/Merchello.Core/Accounting/Models/Invoice.cs) | Add currency + store currency fields |
| [Payment.cs](../src/Merchello.Core/Accounting/Models/Payment.cs) | Add currency + exchange rate fields |
| [InvoiceDbMapping.cs](../src/Merchello.Core/Accounting/Mapping/InvoiceDbMapping.cs) | Map new columns |
| [PaymentDbMapping.cs](../src/Merchello.Core/Accounting/Mapping/PaymentDbMapping.cs) | Map new columns |
| [InvoiceService.cs](../src/Merchello.Core/Accounting/Services/InvoiceService.cs) | Copy currency, calculate store amounts |
| [PaymentService.cs](../src/Merchello.Core/Payments/Services/PaymentService.cs) | Capture exchange rate |
| [StripePaymentProvider.cs](../src/Merchello.PaymentProviders/Stripe/StripePaymentProvider.cs) | Return exchange rate info |

---

## 9. Estimated Effort

| Phase | Effort | Dependency |
|-------|--------|------------|
| Phase 1: Data Model | 1 day | None |
| Phase 2: Payment Flow | 2 days | Phase 1 |
| Phase 3: Admin Display | 1-2 days | Phase 2 |
| **Total MVP** | **4-5 days** | |

---

## 10. Summary

**Approach**: Let payment providers handle currency conversion. Store both the original customer currency amount AND the store currency equivalent for reporting.

**Why this works**:

- Minimal complexity - no exchange rate APIs needed initially
- Stripe/PayPal already handle multi-currency
- All reporting stays in store currency
- Matches Shopify's proven approach

**Data stored per invoice**:

- `Total` = £17.85 (what customer paid)
- `CurrencyCode` = "GBP"
- `TotalInStoreCurrency` = $23.81 (for reporting)
- `ExchangeRate` = 0.749 (from Stripe)


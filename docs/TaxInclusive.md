# Tax-Inclusive Display Pricing

## Overview

Add support for displaying prices including tax (VAT) on the storefront, following UK B2C requirements. Products remain stored NET (ex-tax) in the database for clean reporting/profit calculations. Tax is calculated and added for display purposes only.

**Key Principle:** This follows the same pattern as multi-currency - prices are stored in one form (NET, store currency) and converted for display (inc-tax, display currency).

---

## Background & Prerequisites

### Required Reading

Before implementing, review these documents:

1. **[MultiCurrencyCompleted.md](MultiCurrencyCompleted.md)** - Explains the Shopify-style currency architecture this feature builds upon. Critical for understanding why basket/invoice handling remains unchanged.

2. **[Architecture-Diagrams.md](Architecture-Diagrams.md)** - Core architecture principles. Key sections:
   - "Calculation Flow" - `LineItemService.CalculateFromLineItems()` is the single source of truth
   - "Currency" - `ICurrencyService.Round()` for proper rounding
   - "Tax" - `ITaxService.GetApplicableRateAsync()` for rate lookup

### Why Store Prices NET (Ex-Tax)?

1. **Clean reporting** - Profit margins and cost analysis need NET figures
2. **Multi-tax-rate support** - Products can have different tax groups (standard rate, reduced rate, zero-rated)
3. **Geographic flexibility** - Tax rates vary by customer location (UK 20%, EU varies, US 0% for UK stores)
4. **Shopify alignment** - Proven pattern used by millions of stores

If we stored prices inc-tax, we'd need to back-calculate NET for every report and handle the complexity of "which tax rate was included?"

---

## Architecture

### Calculation Order

```
DB Price (NET, Store Currency)
    → Apply Tax Rate (based on customer's country)
    → Convert to Display Currency
    → Display to Customer
```

**Example (same currency):**
```
Stored:   £83.33 GBP (NET)
Customer: UK, 20% VAT
Calc:     £83.33 × 1.20 = £100.00
Display:  £100.00 inc VAT
```

**Example (with currency conversion):**
```
Stored:   $100.00 USD (NET)
Customer: UK, 20% VAT, exchange rate 0.80 (USD→GBP)
Calc:     $100 × 1.20 (tax) × 0.80 (currency) = £96.00
Display:  £96.00 inc VAT
```

**Note:** Tax is applied BEFORE currency conversion. This ensures tax is calculated on the actual price, not the converted price.

### Tax Rate Resolution

Uses existing `TaxService.GetApplicableRateAsync()`:
1. Customer's country + state → TaxGroupRate match
2. Customer's country only → TaxGroupRate match
3. Fallback → TaxGroup.TaxPercentage

For anonymous visitors: use `MerchelloSettings.DefaultShippingCountry` (already exists).

**Important:** Countries with 0% tax configured (e.g., US for UK stores) naturally show ex-tax prices even when `DisplayPricesIncTax = true`.

---

## Implementation Plan

> **Architecture compliance:** All changes follow the patterns in [Architecture-Diagrams.md](Architecture-Diagrams.md):
> - Controllers remain thin (no tax calculation logic)
> - Services handle business logic (`ITaxService`, `ICurrencyService`)
> - Display calculations use extension methods (stateless, testable)
> - DTOs extended with optional display properties (backward compatible)

### Phase 1: Settings & Context

#### 1.1 Add Setting to MerchelloSettings

**File:** `src/Merchello.Core/Shared/Models/MerchelloSettings.cs`

```csharp
/// <summary>
/// When true, storefront prices are displayed including applicable tax (VAT/GST).
/// Tax is calculated based on the customer's shipping country using TaxGroup rates.
/// Products remain stored as NET prices in the database.
/// Default: false (prices displayed excluding tax)
/// </summary>
public bool DisplayPricesIncTax { get; set; } = false;
```

#### 1.2 Create StorefrontDisplayContext

**File:** `src/Merchello.Core/Storefront/Models/StorefrontDisplayContext.cs` (NEW)

```csharp
/// <summary>
/// Complete display context for storefront pricing.
/// Combines currency conversion and tax-inclusive display settings.
/// </summary>
public record StorefrontDisplayContext(
    // Currency (from existing StorefrontCurrencyContext)
    string CurrencyCode,
    string CurrencySymbol,
    int DecimalPlaces,
    decimal ExchangeRate,
    string StoreCurrencyCode,

    // Tax display
    bool DisplayPricesIncTax,
    string TaxCountryCode,
    string? TaxRegionCode);
```

#### 1.3 Extend StorefrontContextService

**File:** `src/Merchello.Core/Storefront/Services/StorefrontContextService.cs`

Add method:
```csharp
public async Task<StorefrontDisplayContext> GetDisplayContextAsync(CancellationToken ct = default)
{
    var currencyContext = await GetCurrencyContextAsync(ct);
    var shippingLocation = await GetShippingLocationAsync(ct);

    return new StorefrontDisplayContext(
        currencyContext.CurrencyCode,
        currencyContext.CurrencySymbol,
        currencyContext.DecimalPlaces,
        currencyContext.ExchangeRate,
        currencyContext.StoreCurrencyCode,
        _settings.DisplayPricesIncTax,
        shippingLocation.CountryCode,
        shippingLocation.RegionCode);
}
```

Update interface `IStorefrontContextService` with the new method.

---

### Phase 2: Display Price Record & Extensions

#### 2.1 Create ProductDisplayPrice Record

**File:** `src/Merchello.Core/Products/Models/ProductDisplayPrice.cs` (NEW)

```csharp
/// <summary>
/// Calculated display price for a product, ready for frontend rendering.
/// </summary>
public record ProductDisplayPrice(
    decimal Amount,              // Display price (inc or ex tax based on setting)
    decimal? SaleAmount,         // Sale price if applicable
    bool IncludesTax,            // Whether Amount includes tax
    decimal TaxRate,             // Tax rate percentage (e.g., 20 for 20%)
    decimal TaxAmount,           // Tax portion of the price
    string CurrencyCode,
    string CurrencySymbol,
    int DecimalPlaces);
```

#### 2.2 Create DisplayPriceExtensions

**File:** `src/Merchello.Core/Products/Extensions/DisplayPriceExtensions.cs` (NEW)

```csharp
public static class DisplayPriceExtensions
{
    /// <summary>
    /// Calculates the display price for a product variant.
    /// Applies tax (if DisplayPricesIncTax) then currency conversion.
    /// </summary>
    public static async Task<ProductDisplayPrice> GetDisplayPriceAsync(
        this Product product,
        StorefrontDisplayContext displayContext,
        ITaxService taxService,
        ICurrencyService currencyService,
        CancellationToken ct = default)
    {
        var netPrice = product.OnSale && product.PreviousPrice.HasValue
            ? product.Price
            : product.Price;
        var netSalePrice = product.OnSale ? product.Price : (decimal?)null;

        // Get applicable tax rate for customer's location
        decimal taxRate = 0m;
        if (displayContext.DisplayPricesIncTax && product.ProductRoot?.TaxGroupId != null)
        {
            taxRate = await taxService.GetApplicableRateAsync(
                product.ProductRoot.TaxGroupId,
                displayContext.TaxCountryCode,
                displayContext.TaxRegionCode,
                ct);
        }

        // Calculate tax-inclusive price (if applicable)
        var taxMultiplier = displayContext.DisplayPricesIncTax ? 1 + (taxRate / 100m) : 1m;
        var priceWithTax = netPrice * taxMultiplier;
        var salePriceWithTax = netSalePrice * taxMultiplier;

        // Convert to display currency
        var displayPrice = currencyService.Round(
            priceWithTax * displayContext.ExchangeRate,
            displayContext.CurrencyCode);
        var displaySalePrice = salePriceWithTax.HasValue
            ? currencyService.Round(salePriceWithTax.Value * displayContext.ExchangeRate, displayContext.CurrencyCode)
            : (decimal?)null;

        // Calculate tax amount in display currency
        var taxAmount = displayContext.DisplayPricesIncTax
            ? currencyService.Round((netPrice * (taxRate / 100m)) * displayContext.ExchangeRate, displayContext.CurrencyCode)
            : 0m;

        return new ProductDisplayPrice(
            displayPrice,
            displaySalePrice,
            displayContext.DisplayPricesIncTax && taxRate > 0,
            taxRate,
            taxAmount,
            displayContext.CurrencyCode,
            displayContext.CurrencySymbol,
            displayContext.DecimalPlaces);
    }
}
```

---

### Phase 3: Product DTOs & Service Updates

#### 3.1 Add Display Properties to ProductVariantDto

**File:** `src/Merchello.Core/Products/Dtos/ProductVariantDto.cs`

Add property:
```csharp
/// <summary>
/// Calculated display price in customer's currency, optionally including tax.
/// Null when fetched without display context (e.g., admin API).
/// </summary>
public ProductDisplayPrice? DisplayPrice { get; set; }
```

#### 3.2 Add Display Properties to ProductListItemDto

**File:** `src/Merchello.Core/Products/Dtos/ProductListItemDto.cs`

Add property:
```csharp
/// <summary>
/// Calculated display price in customer's currency, optionally including tax.
/// </summary>
public ProductDisplayPrice? DisplayPrice { get; set; }
```

#### 3.3 Update ProductService Methods

**File:** `src/Merchello.Core/Products/Services/ProductService.cs`

**Recommended approach:** Add optional `StorefrontDisplayContext` parameter to existing methods:

```csharp
public async Task<Product?> GetProduct(
    GetProductParameters parameters,
    StorefrontDisplayContext? displayContext = null,  // NEW optional parameter
    CancellationToken cancellationToken = default)
```

**Behaviour:**
- When `displayContext` is `null` (admin/API calls): `DisplayPrice` remains `null`, raw NET prices returned
- When `displayContext` is provided (storefront): Calculate and populate `DisplayPrice` using `DisplayPriceExtensions.GetDisplayPriceAsync()`

This keeps backward compatibility - existing admin code continues to work without changes.

---

### Phase 4: Checkout & Cart Integration

#### 4.1 Basket Display Amounts

The existing `DisplayCurrencyExtensions.GetDisplayAmounts()` handles currency conversion. Extend it to also apply tax when `DisplayPricesIncTax = true`:

**File:** `src/Merchello.Core/Checkout/Extensions/DisplayCurrencyExtensions.cs`

Add overload:
```csharp
public static DisplayAmounts GetDisplayAmounts(
    this Basket? basket,
    StorefrontDisplayContext displayContext,
    ICurrencyService currencyService)
{
    if (basket == null)
        return new DisplayAmounts(0, 0, 0, 0, 0);

    // Note: Basket totals already include tax (calculated by LineItemService)
    // We just need to convert to display currency
    return new DisplayAmounts(
        currencyService.Round(basket.Total * displayContext.ExchangeRate, displayContext.CurrencyCode),
        currencyService.Round(basket.SubTotal * displayContext.ExchangeRate, displayContext.CurrencyCode),
        currencyService.Round(basket.Shipping * displayContext.ExchangeRate, displayContext.CurrencyCode),
        currencyService.Round(basket.Tax * displayContext.ExchangeRate, displayContext.CurrencyCode),
        currencyService.Round(basket.Discount * displayContext.ExchangeRate, displayContext.CurrencyCode)
    );
}
```

**Important - Understanding the distinction:**

| Context | How Tax Works |
|---------|---------------|
| **Product display** (listing, detail page) | NEW: Apply tax rate for display if `DisplayPricesIncTax = true` |
| **Basket/Checkout** | UNCHANGED: `LineItemService.CalculateFromLineItems()` already calculates tax as a separate line. Line items store NET price + tax rate, tax is computed and shown separately |
| **Invoice** | UNCHANGED: Tax calculated and stored per MultiCurrencyCompleted.md |

The `DisplayPricesIncTax` setting only affects **product browsing** - showing "£100 inc VAT" instead of "£83.33 + VAT". Once in the basket, the existing tax calculation takes over.

#### 4.2 Line Item Display

Line items in the basket need to show prices consistently with product pages:

- If `DisplayPricesIncTax = true`: Show line item as `(price + tax) × quantity`
- If `DisplayPricesIncTax = false`: Show line item as `price × quantity`, tax shown separately

This may require updating `StorefrontBasketDto` to include display prices per line item.

---

### Phase 5: Frontend Updates

#### 5.1 Product Display (Razor/Blazor)

Update product templates to use `DisplayPrice`:

```html
@if (product.DisplayPrice != null)
{
    <span class="price">
        @product.DisplayPrice.CurrencySymbol@product.DisplayPrice.Amount.ToString($"N{product.DisplayPrice.DecimalPlaces}")
    </span>
    @if (product.DisplayPrice.IncludesTax)
    {
        <span class="tax-info">(inc. @product.DisplayPrice.TaxRate% VAT)</span>
    }
}
```

#### 5.2 JavaScript Store

Update Alpine.js checkout store to handle display prices consistently.

---

## Files to Modify

| File | Action | Phase |
|------|--------|-------|
| `Shared/Models/MerchelloSettings.cs` | ADD `DisplayPricesIncTax` property | 1 |
| `Storefront/Models/StorefrontDisplayContext.cs` | CREATE new record | 1 |
| `Storefront/Services/StorefrontContextService.cs` | ADD `GetDisplayContextAsync()` | 1 |
| `Storefront/Services/Interfaces/IStorefrontContextService.cs` | ADD interface method | 1 |
| `Products/Models/ProductDisplayPrice.cs` | CREATE new record | 2 |
| `Products/Extensions/DisplayPriceExtensions.cs` | CREATE extension methods | 2 |
| `Products/Dtos/ProductVariantDto.cs` | ADD `DisplayPrice` property | 3 |
| `Products/Dtos/ProductListItemDto.cs` | ADD `DisplayPrice` property | 3 |
| `Products/Services/ProductService.cs` | UPDATE to calculate display prices | 3 |
| `Checkout/Extensions/DisplayCurrencyExtensions.cs` | ADD overload for display context | 4 |
| Product view templates | UPDATE to use DisplayPrice | 5 |

---

## Integration with Multi-Currency

> **See:** [MultiCurrencyCompleted.md](MultiCurrencyCompleted.md) for full currency architecture details.

This feature builds on the existing multi-currency architecture:

| Aspect | Multi-Currency | Tax-Inclusive Display |
|--------|----------------|----------------------|
| Storage | Prices in store currency | Prices NET (ex-tax) |
| Conversion point | On-the-fly display | On-the-fly display |
| Rate source | `IExchangeRateCache` | `ITaxService.GetApplicableRateAsync()` |
| Locked at | Invoice creation | Invoice creation (tax calculated) |

**Combined flow:**
```
Product (NET, USD)
    → Apply tax rate (20% for UK)        ← NEW (this feature)
    → Convert currency (×0.80 for GBP)   ← EXISTING (multi-currency)
    → Display: £96.00 inc VAT
```

**What changes:**
- Product display on listings and detail pages

**What does NOT change:**
- Basket storage (stays NET in store currency)
- `LineItemService.CalculateFromLineItems()` (already handles tax)
- Invoice creation (rate locking per MultiCurrencyCompleted.md)
- Payment amounts (use invoice values)

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Product with 0% tax | Display same as ex-tax |
| Customer in 0% tax country | Display same as ex-tax (naturally) |
| Anonymous visitor | Use `DefaultShippingCountry` for tax rate |
| Customer changes country | Display prices update (like currency does) |
| Price filtering/sorting | Uses NET prices (database values) |
| API consumers | `DisplayPrice` is null when no context provided |
| Cached pages | May show stale prices if rate changes |

---

## Verification Steps

### 1. Setting Toggle
| Setting | Product with £83.33 NET stored | Expected Display |
|---------|-------------------------------|------------------|
| `DisplayPricesIncTax = false` | £83.33 | £83.33 |
| `DisplayPricesIncTax = true` | £83.33 | £100.00 (inc 20% VAT) |

### 2. Tax Rate by Country
With `DisplayPricesIncTax = true` and product stored as $100 NET (USD):

| Customer Location | Tax Rate | Exchange Rate | Expected Display |
|-------------------|----------|---------------|------------------|
| UK | 20% | 0.80 | £96.00 inc VAT ($100 × 1.20 × 0.80) |
| Germany | 19% | 0.92 | €109.48 inc VAT ($100 × 1.19 × 0.92) |
| US (no VAT configured) | 0% | 1.00 | $100.00 ($100 × 1.00 × 1.00) |

### 3. Checkout Consistency
- Product page shows: £100.00 inc VAT
- Add to basket → line item shows: £100.00 (or £83.33 + £16.67 VAT depending on display preference)
- Basket total matches product page price × quantity
- Payment amount matches basket total

### 4. Invoice Correctness
- Invoice line items show NET amounts
- Tax shown as separate line(s)
- `TotalInStoreCurrency` = original NET × quantity (for reporting)
- `Total` = converted amount in customer currency (what they paid)

---

## Future Considerations

- **B2B/Trade pricing:** Customer flag to override and show ex-tax
- **Per-product tax labels:** "inc VAT" vs "inc GST" based on tax group
- **Tax-inclusive entry:** Option to enter prices inc-tax in admin (back-calculate NET)

---

## Outstanding: Price Filter Slider

**Status:** Needs implementation

The storefront price filter slider (`GetPriceRangeForCollection`) currently returns raw NET store currency values. When `DisplayPricesIncTax = true`, the slider bounds and values should reflect tax-inclusive prices in the display currency.

**Challenge:** Products in a collection may have different tax groups with different rates. The slider shows a single min/max range.

**Approach:** Use the **most common tax rate** in the collection for the price range calculation.

**Implementation needed:**
1. Update `GetPriceRangeForCollection` to accept `StorefrontDisplayContext`
2. Query the most common `TaxGroupId` among products in the collection
3. Get the applicable tax rate for that group (based on customer's country)
4. Apply: `price × taxMultiplier × exchangeRate` to min/max bounds
5. When filtering, reverse the conversion on the submitted values before querying the database

**Note:** Individual product prices will use their actual tax rate, so there may be slight discrepancies between the slider bounds and the cheapest/most expensive displayed prices if the collection has mixed tax groups. This is acceptable as it's an edge case.

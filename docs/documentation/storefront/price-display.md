# Price Display and Tax-Inclusive Pricing

Getting prices right on your storefront means handling three concerns at once: currency conversion, tax-inclusive display, and consistent formatting. This guide explains how Merchello's display context ties these together.

## The Display Pipeline

When you display a price to a customer, it goes through up to three transformations:

```
Net Price (store currency)
    --> Apply tax (if DisplayPricesIncTax = true)
    --> Convert currency (if customer currency differs from store currency)
    --> Format for display
```

## Setting Up Tax-Inclusive Display

The `DisplayPricesIncTax` setting controls whether your storefront shows prices including tax. When enabled, every price shown to the customer includes the applicable tax rate for their location.

This is configured in your store settings and is automatically included in the `StorefrontDisplayContext`.

## How the .Site Project Does It

Here is the pattern from the example product page ([Views/Products/Default.cshtml:23-79](../../../src/Merchello.Site/Views/Products/Default.cshtml#L23)):

```csharp
// 1. Get the display context (currency, tax settings, exchange rate)
var displayContext = await StorefrontContext.GetDisplayContextAsync();

// 2. Look up the tax rate for this product's tax group at the customer's location
decimal taxRate = 0m;
if (displayContext.DisplayPricesIncTax && productRoot.TaxGroupId is Guid taxGroupId)
{
    taxRate = await TaxService.GetApplicableRateAsync(
        taxGroupId,
        displayContext.TaxCountryCode,
        displayContext.TaxRegionCode);
}

// 3. Calculate the tax multiplier
var taxMultiplier = displayContext.DisplayPricesIncTax ? 1 + (taxRate / 100m) : 1m;

// 4. Helper function: apply tax, convert currency, round
decimal CalculateDisplayPrice(decimal netPrice)
{
    var priceWithTax = netPrice * taxMultiplier;
    return CurrencyService.Round(
        priceWithTax * displayContext.ExchangeRate,
        displayContext.CurrencyCode);
}

// 5. Use it
var displayPrice = CalculateDisplayPrice(product.Price);
var formattedPrice = $"{displayContext.CurrencySymbol}{displayPrice.ToString($"N{displayContext.DecimalPlaces}")}";
```

### Step by Step

1. **Get the display context** -- this tells you the customer's currency, exchange rate, whether to include tax, and their country/region for tax lookup.

2. **Look up the tax rate** -- only if `DisplayPricesIncTax` is true. The tax rate comes from `TaxService.GetApplicableRateAsync()` using the product's `TaxGroupId` and the customer's location from the display context.

3. **Calculate the multiplier** -- if tax-inclusive, multiply by `1 + (rate / 100)`. Otherwise, multiplier is `1` (no-op).

4. **Convert currency** -- multiply by the exchange rate and round to the currency's decimal places.

5. **Format** -- use the currency symbol and decimal places from the display context.

## Tax-Inclusive vs Net Display

| Setting | Price Shown | When to Use |
|---------|-------------|-------------|
| `DisplayPricesIncTax = false` | Net price only | B2B stores, USA-style stores |
| `DisplayPricesIncTax = true` | Price including VAT/tax | B2C stores in EU, UK, Australia |

When tax-inclusive display is on, you should indicate it to customers:

```razor
@if (includesTax)
{
    <span class="text-sm text-gray-500">inc. VAT</span>
}
```

## Multi-Currency Display

Prices in Merchello are always stored in your store's base currency. Display currency conversion happens on-the-fly using the exchange rate from the display context.

```
Store currency: GBP
Customer currency: USD
Exchange rate: 1.25 (1 GBP = 1.25 USD)

Product price: 20.00 GBP
Display price: 20.00 * 1.25 = $25.00 USD
```

> **Warning:** Never charge a customer based on display amounts. Payment always uses the invoice conversion path (divide by rate, not multiply). Display uses multiply; checkout uses divide.

## Variant Pricing

When displaying variant prices on a product page, you typically need to pre-calculate display prices for all variants so JavaScript can update the price when the customer selects different options:

```csharp
// Pre-calculate display prices for all variants
var variantData = viewModel.AllVariants.Select(variant => new
{
    variant.Id,
    DisplayPrice = CalculateDisplayPrice(variant.Price),
    DisplayPreviousPrice = variant.PreviousPrice.HasValue
        ? CalculateDisplayPrice(variant.PreviousPrice.Value)
        : (decimal?)null
});
```

Then serialize this data for JavaScript to use when the customer changes option selections.

## Formatting Currencies

Always use consistent formatting:

```csharp
// Get format string from display context
var priceFormat = $"N{displayContext.DecimalPlaces}";

// Format: "$25.00" or "25,00 EUR"
var formatted = $"{displayContext.CurrencySymbol}{price.ToString(priceFormat)}";
```

In JavaScript, use the shared formatting utilities:

```typescript
import { formatCurrency } from "@shared/utils/formatting.js";

// Never use .toFixed() -- always use the shared formatter
const formatted = formatCurrency(amount, currencySymbol, decimalPlaces);
```

> **Warning:** Never use JavaScript's `.toFixed()` for currency formatting. It has floating-point rounding issues. Always use Merchello's `formatCurrency` utility.

## Availability and Stock Display

The display context also includes `ShowStockLevels` from your store settings. When enabled, the product availability response includes the actual stock count:

```csharp
var availability = await StorefrontContext.GetProductAvailabilityAsync(product, 1, ct);

if (availability.ShowStockLevels && availability.AvailableStock > 0)
{
    // Show "12 in stock" or "Only 3 left"
}
else
{
    // Show "In Stock" or "Out of Stock"
}
```

## Key Points

- Always use `StorefrontDisplayContext` for price calculations -- it has everything you need.
- Tax rate lookup uses the product's `TaxGroupId` and the customer's location.
- Display amounts are for visual purposes only -- never use them for payment calculations.
- Currency conversion for display: multiply by exchange rate. For payment: divide.
- Use `CurrencyService.Round()` for correct rounding per currency (e.g. JPY has 0 decimal places).
- The `.Site` project's `Default.cshtml` is the reference implementation for price display.

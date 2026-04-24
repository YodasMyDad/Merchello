# Storefront Context and Display

The [`IStorefrontContextService`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Storefront/Services/Interfaces/IStorefrontContextService.cs) is the central service for everything your storefront needs to know about the current customer's context -- their shipping location, preferred currency, exchange rates, tax settings, and product availability. It reads from cookies, store settings, and fallback defaults to build a consistent context for every page render.

> **Invariant:** `GetDisplayContextAsync()` is the single source of truth for storefront display. Basket amounts are always stored in store currency; display currency is applied on-the-fly using multiply (`amount * ExchangeRate`). Never charge a customer from display amounts -- checkout and payment use the invoice conversion path (divide). See CLAUDE.md for the full multi-currency rule.

## Why You Need This

When a customer visits your store, you need to answer questions like:

- What country are they in? (for shipping options and tax)
- What currency should prices be displayed in?
- What is the exchange rate from your store currency to their display currency?
- Should prices include tax?
- Is a product available to ship to their location?

`IStorefrontContextService` answers all of these in a consistent, cookie-backed way.

## Getting the Service

Inject `IStorefrontContextService` into your controllers or views:

```csharp
public class ProductController(
    IStorefrontContextService storefrontContext)
{
    // ...
}
```

In Razor views, use `@inject`:

```razor
@inject Merchello.Core.Storefront.Services.Interfaces.IStorefrontContextService StorefrontContext
```

## Shipping Location

The customer's shipping location determines which warehouses can fulfil their order, what shipping options are available, and what tax rates apply.

### Get Current Location

```csharp
var location = await storefrontContext.GetShippingLocationAsync(ct);
// location.CountryCode  -- e.g. "GB"
// location.CountryName  -- e.g. "United Kingdom"
// location.RegionCode   -- e.g. "CA" (optional, for countries with states/provinces)
```

The location is resolved from (in priority order):
1. The shipping country cookie
2. Store default settings
3. Fallback to the first available shipping country

### Set Shipping Country

```csharp
storefrontContext.SetShippingCountry("US", "CA");  // California, USA
```

This writes a cookie and also automatically updates the customer's currency based on country-to-currency mapping. The currency change happens immediately.

## Currency

### Get Current Currency

```csharp
var currency = await storefrontContext.GetCurrencyAsync(ct);
// currency.CurrencyCode    -- e.g. "USD"
// currency.CurrencySymbol  -- e.g. "$"
// currency.DecimalPlaces   -- e.g. 2
```

### Override Currency

If you want to let customers pick their own currency (independent of country):

```csharp
storefrontContext.SetCurrency("EUR");
```

### Exchange Rates

Get the exchange rate from store currency to customer currency:

```csharp
decimal rate = await storefrontContext.GetExchangeRateAsync(ct);
// Returns 1.0 if same currency or rate unavailable
```

Convert an amount:

```csharp
decimal displayPrice = await storefrontContext.ConvertToCustomerCurrencyAsync(29.99m, ct);
```

### Full Currency Context

For when you need everything at once:

```csharp
var ctx = await storefrontContext.GetCurrencyContextAsync(ct);
// ctx.CurrencyCode     -- customer's currency code
// ctx.CurrencySymbol   -- customer's currency symbol
// ctx.ExchangeRate     -- store-to-customer rate
// ctx.DecimalPlaces    -- decimal places for this currency
```

## Display Context

The `StorefrontDisplayContext` is the most comprehensive context object. It combines currency, tax, and display settings into a single record. This is what you use for rendering product prices:

```csharp
var displayContext = await storefrontContext.GetDisplayContextAsync(ct);
```

The display context includes:

| Property | Type | Description |
|----------|------|-------------|
| `CurrencyCode` | `string` | Customer's selected currency (e.g. "USD") |
| `CurrencySymbol` | `string` | Currency symbol (e.g. "$") |
| `DecimalPlaces` | `int` | Decimal places for formatting |
| `ExchangeRate` | `decimal` | Store-to-customer exchange rate |
| `StoreCurrencyCode` | `string` | Store's base currency (e.g. "GBP") |
| `DisplayPricesIncTax` | `bool` | Whether to show prices including tax |
| `TaxCountryCode` | `string` | Country code for tax rate lookup |
| `TaxRegionCode` | `string?` | Region code for tax rate lookup |
| `IsShippingTaxable` | `bool` | Whether shipping is taxable |
| `ShippingTaxRate` | `decimal?` | Shipping tax rate percentage |
| `ShippingTaxMode` | `ShippingTaxMode` | How shipping tax is calculated |

## Product Availability

### Single Product

Check if a product is available at the customer's current location:

```csharp
var availability = await storefrontContext.GetProductAvailabilityAsync(product, quantity: 1, ct);

// availability.CanShipToLocation  -- can any warehouse ship here?
// availability.HasStock           -- is there stock in reachable warehouses?
// availability.AvailableStock     -- total available units
// availability.StatusMessage      -- "In Stock", "Out of Stock", etc.
// availability.ShowStockLevels    -- should we show the number?
```

### For a Specific Location

Check availability for a specific country/region (not the cookie-based current location):

```csharp
var availability = await storefrontContext.GetProductAvailabilityForLocationAsync(
    new ProductAvailabilityParameters
    {
        Product = product,
        CountryCode = "DE",
        RegionCode = null,
        Quantity = 2
    }, ct);
```

### Can Ship To Customer?

A simple boolean check:

```csharp
bool canShip = await storefrontContext.CanShipToCustomerAsync(product, ct);
```

### Basket Availability

Check availability for all items in the basket at once:

```csharp
var availability = await storefrontContext.GetBasketAvailabilityAsync(
    countryCode: "GB",
    regionCode: null,
    ct);

// availability contains per-item availability info
```

If you already have the basket loaded, pass the line items directly to avoid a duplicate database query:

```csharp
var availability = await storefrontContext.GetBasketAvailabilityAsync(
    basket.LineItems,
    countryCode: "GB",
    regionCode: null,
    ct);
```

## Storefront REST API

The [`StorefrontApiController`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello/Controllers/StorefrontApiController.cs) exposes these operations as REST endpoints at `/api/merchello/storefront`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/context` | Bootstrap endpoint: location, currency, and basket summary in one call |
| `GET` | `/shipping/countries` | Available shipping countries with current selection |
| `GET` | `/shipping/country` | Current shipping country preference |
| `POST` | `/shipping/country` | Set shipping country (also updates currency) |
| `GET` | `/shipping/countries/{code}/regions` | Regions for a country |
| `GET` | `/currency` | Current storefront currency |
| `POST` | `/currency` | Override storefront currency |
| `GET` | `/products/{id}/availability` | Product availability for a location |
| `GET` | `/basket/availability` | Basket availability for a location |

### Bootstrap Endpoint

The `GET /context` endpoint is especially useful for headless or JavaScript-heavy storefronts. It returns the customer's location, currency, and basket summary in a single API call:

```javascript
const response = await fetch('/api/merchello/storefront/context');
const context = await response.json();
// context.location, context.currency, context.basket
```

## Cookies

The storefront context uses the following cookies to remember customer preferences:

- **Shipping country** -- persists the selected country code and optional region code.
- **Currency** -- persists the selected currency code.
- **Basket ID** -- links the anonymous session to a basket.

These cookies are set automatically when you call `SetShippingCountry()` or `SetCurrency()`.

## Key Points

- `GetDisplayContextAsync()` is the main method for product price rendering -- it has everything you need.
- Changing the shipping country automatically updates the currency based on country-to-currency mapping.
- Exchange rates use multiply for display (`amount * rate`) and divide for checkout/payment (`amount / rate`).
- All amounts in the basket are stored in **store currency**. Display currency amounts are calculated on-the-fly.
- Availability is location-aware: it only counts stock from warehouses that can ship to the customer's location.

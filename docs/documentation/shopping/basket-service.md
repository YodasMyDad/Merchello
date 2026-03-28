# Basket / Shopping Cart

The basket (shopping cart) is at the heart of the shopping experience. Merchello provides `ICheckoutService` as the main service for basket operations -- adding items, updating quantities, removing items, and calculating totals.

## Core Concepts

### Basket Storage

- All amounts in the basket are stored in the **store currency** (your base currency).
- Display currency conversions happen on-the-fly and never modify stored amounts.
- The basket is identified by a cookie (`BasketId`). Anonymous and logged-in users both get baskets.
- Each basket has a `Currency` property that tracks the customer's selected display currency.

### Line Items

A basket contains line items. Each line item represents a product (variant) with a quantity, price, and optional add-on adjustments. Line items can also represent discounts (negative amounts).

## Getting the Basket

```csharp
// In a controller or service
var basket = await checkoutService.GetBasket(new GetBasketParameters(), cancellationToken);

if (basket == null || basket.LineItems.Count == 0)
{
    // Empty basket
}
```

The `GetBasketParameters` uses the current HTTP context to identify the basket via cookie. If no basket exists, `null` is returned.

## Adding Items

### Simple Add

```csharp
// Create a line item from a product
var lineItem = checkoutService.CreateLineItem(product, quantity: 2);

// Add to basket
await checkoutService.AddToBasketAsync(basket, lineItem, countryCode, cancellationToken);
```

### Add with Automatic Basket Retrieval

If you do not have the basket loaded yet:

```csharp
await checkoutService.AddToBasket(new AddToBasketParameters
{
    ProductId = productId,
    Quantity = 1
}, cancellationToken);
```

### Add with Add-Ons

The recommended approach for storefront use. Handles product validation, availability checking, and add-on line item creation:

```csharp
var result = await checkoutService.AddProductWithAddonsAsync(
    new AddProductWithAddonsParameters
    {
        ProductId = variantId,
        Quantity = 1,
        Addons = [
            new AddonSelectionDto { OptionId = giftWrapOptionId, ValueId = yesValueId }
        ]
    },
    cancellationToken);

if (result.Success)
{
    var updatedBasket = result.Basket;
    var addedLineItem = result.ProductLineItem;
}
else
{
    var errorMessage = result.ErrorMessage;
}
```

This is the method used by the `StorefrontApiController.AddToBasket` endpoint. It:
- Validates the product exists and is available for purchase
- Checks stock availability
- Creates the main product line item
- Creates separate line items for any selected add-ons with price adjustments
- Recalculates basket totals

## Updating Quantities

```csharp
await checkoutService.UpdateLineItemQuantity(
    lineItemId,
    newQuantity: 3,
    countryCode: null,  // optional, for recalculation
    cancellationToken);
```

Setting quantity to `0` does not remove the item -- use `RemoveLineItem` for that.

## Removing Items

```csharp
await checkoutService.RemoveLineItem(lineItemId, countryCode: null, cancellationToken);
```

## Clearing the Basket

```csharp
await checkoutService.DeleteBasket(basketId, cancellationToken);
```

This permanently deletes the basket and all its line items.

## Creating a Basket

Baskets are typically created automatically when the first item is added. If you need to create one explicitly:

```csharp
var basket = checkoutService.CreateBasket(
    currency: "USD",          // optional, defaults to store currency
    currencySymbol: "$",      // optional
    customerId: customerGuid  // optional, for logged-in users
);
```

## Basket Calculation

After modifying a basket, totals are recalculated. The `CalculateBasketAsync` method handles:
- Line item subtotals
- Tax calculation
- Discount application
- Shipping estimation (if applicable)

```csharp
await checkoutService.CalculateBasketAsync(
    new CalculateBasketParameters
    {
        Basket = basket,
        CountryCode = "GB"
    },
    cancellationToken);
```

> **Note:** `CalculateBasketAsync` is the single source of truth for basket totals. Never calculate totals manually.

## Currency Conversion

When a customer changes their display currency, basket amounts need to be converted:

```csharp
var result = await checkoutService.ConvertBasketCurrencyAsync(
    new ConvertBasketCurrencyParameters
    {
        NewCurrencyCode = "EUR"
    },
    cancellationToken);

if (!result.Success)
{
    // Exchange rate unavailable or operation cancelled
}
```

This fires `BasketCurrencyChangingNotification` (cancellable) before conversion and `BasketCurrencyChangedNotification` after.

For silent sync (no notifications -- used internally before payment):

```csharp
var basket = await checkoutService.EnsureBasketCurrencyAsync(
    new EnsureBasketCurrencyParameters
    {
        Basket = basket,
        CurrencyCode = "USD",
        CurrencySymbol = "$"
    },
    cancellationToken);
```

## MVC Example: The .Site Basket Page

The `.Site` project's `BasketController` shows how to render a basket page with availability data:

```csharp
public async Task<IActionResult> Basket(
    Umbraco.Cms.Web.Common.PublishedModels.Basket model,
    CancellationToken ct)
{
    var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);
    var displayContext = await storefrontContext.GetDisplayContextAsync(ct);

    if (basket == null || basket.LineItems.Count == 0)
    {
        ViewBag.BasketData = storefrontDtoMapper.MapBasket(null, displayContext, settings.CurrencySymbol);
    }
    else
    {
        // Check availability for all items at once
        var availability = await storefrontContext.GetBasketAvailabilityAsync(
            basket.LineItems, ct: ct);

        ViewBag.BasketData = storefrontDtoMapper.MapBasket(
            basket, displayContext, settings.CurrencySymbol, availability);
    }

    return CurrentTemplate(model);
}
```

## Digital Products in Basket

When a basket contains digital products, you can check for them before proceeding to checkout:

```csharp
bool hasDigital = await checkoutService.BasketHasDigitalProductsAsync(
    new BasketHasDigitalProductsParameters(),
    cancellationToken);

if (hasDigital)
{
    // Enforce account creation -- digital products require login
}
```

## Key Points

- Basket amounts are always stored in **store currency**. Display currency is applied on-the-fly.
- Use `AddProductWithAddonsAsync` for storefront add-to-cart -- it handles validation, availability, and add-ons.
- `CalculateBasketAsync` is the single source of truth for totals. Never duplicate the math.
- `ConvertBasketCurrencyAsync` fires notifications and can be cancelled. `EnsureBasketCurrencyAsync` is silent.
- The basket is cookie-based. Anonymous users get baskets, and baskets can be associated with customers.
- Baskets support both product line items and discount line items (negative amounts).

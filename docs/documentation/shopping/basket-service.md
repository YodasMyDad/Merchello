# Basket / Shopping Cart

The basket (shopping cart) is at the heart of the shopping experience. Merchello provides `ICheckoutService` as the main service for basket operations -- adding items, updating quantities, removing items, and calculating totals.

## Core Concepts

### Basket Storage

- All amounts are stored in the **store currency** (your base currency). Display currency conversions happen on-the-fly and never modify stored amounts.
- The basket is identified by a cookie (`BasketId`). Both anonymous and logged-in users get baskets.
- Each basket has a `Currency` property that tracks the customer's selected display currency.

### Line Items

A basket contains line items. Each line item represents a product variant with a quantity, price, and optional add-on adjustments. Discount line items (negative amounts) can also appear.

## Getting the Basket

```csharp
var basket = await checkoutService.GetBasket(new GetBasketParameters(), cancellationToken);

if (basket == null || basket.LineItems.Count == 0)
{
    // Empty basket
}
```

`GetBasketParameters` uses the current HTTP context to identify the basket via cookie. Returns `null` if no basket exists.

## Adding Items

### Add with Add-Ons (Recommended)

This is the recommended approach for storefront use. It handles product validation, stock checking, and add-on line item creation:

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

This method:
- Validates the product exists and is available for purchase
- Checks stock availability
- Creates the main product line item
- Creates separate line items for any selected add-ons with price adjustments
- Recalculates basket totals

### Simple Add

If you already have the basket loaded and a line item ready:

```csharp
var lineItem = checkoutService.CreateLineItem(product, quantity: 2);
await checkoutService.AddToBasketAsync(basket, lineItem, countryCode, cancellationToken);
```

## Updating Quantities

```csharp
await checkoutService.UpdateLineItemQuantity(
    lineItemId,
    newQuantity: 3,
    countryCode: null,
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

Permanently deletes the basket and all its line items.

## Currency Conversion

When a customer changes their display currency:

```csharp
var result = await checkoutService.ConvertBasketCurrencyAsync(
    new ConvertBasketCurrencyParameters
    {
        NewCurrencyCode = "EUR"
    },
    cancellationToken);

if (!result.Success)
{
    // Exchange rate unavailable or conversion cancelled
}
```

This fires `BasketCurrencyChangingNotification` (cancellable) before conversion and `BasketCurrencyChangedNotification` after.

## Digital Products in Basket

Check whether the basket contains digital products before proceeding to checkout:

```csharp
bool hasDigital = await checkoutService.BasketHasDigitalProductsAsync(
    new BasketHasDigitalProductsParameters(),
    cancellationToken);

if (hasDigital)
{
    // Enforce account creation -- digital products require login
}
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

Key points from this example:
- Use `GetDisplayContextAsync` to get the customer's currency and exchange rate context.
- Use `GetBasketAvailabilityAsync` to check stock and shipping availability for all items in one call.
- Use `storefrontDtoMapper.MapBasket` to convert the basket into a frontend-ready DTO with formatted display amounts.

## Key Points

- Basket amounts are always stored in **store currency**. Display currency is applied on-the-fly.
- Use `AddProductWithAddonsAsync` for storefront add-to-cart -- it handles validation, availability, and add-ons.
- Never calculate totals manually -- the checkout service handles this automatically when items are added, updated, or removed.
- The basket is cookie-based. Anonymous users get baskets, and baskets can be associated with customers.
- Baskets support both product line items and discount line items (negative amounts).

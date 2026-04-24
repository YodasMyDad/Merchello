# Checkout Discounts

Merchello supports three types of discounts during checkout: manual discount codes, automatic discounts, and Google auto-discounts. All discount logic is handled by [`ICheckoutDiscountService`](../../../src/Merchello.Core/Checkout/Services/Interfaces/ICheckoutDiscountService.cs).

**What it is:** The checkout-side façade over the discount engine. It knows how to apply, remove, and refresh discounts against a basket while keeping totals in sync.

**Why a separate service:** The discount domain itself (rules, conditions, usage tracking) lives in [`Discounts`](../discounts/discounts-overview.md). `ICheckoutDiscountService` is the thin layer that integrates those rules with an in-flight basket — validation, basket-line representation, and automatic refresh on basket changes.

> **Invariant:** Discount math is not done in controllers, views, or JS. The basket's `Discount` total is the sum of the discount line items on the basket, produced inside `CheckoutService.CalculateBasketAsync()`.

## Discount Types

### Discount Codes

Discount codes are entered by the customer during checkout. They are validated, applied to the basket, and recalculated on every basket change.

### Automatic Discounts

Automatic discounts apply themselves based on basket conditions (e.g. "10% off orders over $100"). They are evaluated and refreshed after every basket-affecting change -- adding items, changing quantities, saving addresses, or selecting shipping.

### Google Auto-Discounts

Google auto-discounts are applied automatically when a customer arrives via a Google Shopping promotion. The discount is linked to a specific product and applied when that product is added to the basket.

## Applying a Discount Code

### Via API

**`POST /api/merchello/checkout/discount/apply`**

```json
{
    "code": "SAVE10"
}
```

**Response (success):**

```json
{
    "success": true,
    "message": "Discount applied successfully.",
    "basket": { ... },
    "discountDelta": 5.00
}
```

The `discountDelta` shows the change in total discount (in display currency), useful for animations or notifications.

**Response (failure):**

```json
{
    "success": false,
    "message": "This discount code has expired."
}
```

### Via Service

```csharp
var result = await checkoutDiscountService.ApplyDiscountCodeAsync(
    basket,
    "SAVE10",
    countryCode: basket.ShippingAddress?.CountryCode,
    cancellationToken);

if (result.Success)
{
    var updatedBasket = result.ResultObject;
    // Basket now includes the discount as a line item
}
else
{
    var errorMessage = result.Messages
        .First(m => m.ResultMessageType == ResultMessageType.Error)
        .Message;
    // e.g. "This discount code has expired"
    // e.g. "Minimum order value not met"
    // e.g. "This code has already been used"
}
```

## Removing a Discount

### Promotional Discount (by Discount ID)

```csharp
var result = await checkoutDiscountService.RemovePromotionalDiscountAsync(
    basket,
    discountId,
    countryCode: null,
    cancellationToken);
```

### Discount Line Item (by Line Item ID)

```csharp
await checkoutDiscountService.RemoveDiscountFromBasketAsync(
    basket,
    discountLineItemId,
    countryCode: null,
    cancellationToken);
```

## Automatic Discount Refresh

Automatic discounts are refreshed after every basket-affecting change. You do not need to call this manually -- the checkout service methods (`SaveAddressesAsync`, `SaveShippingSelectionsAsync`, etc.) call it internally.

If you need to refresh manually:

```csharp
// Full promotional refresh (both code and automatic discounts)
var result = await checkoutDiscountService.RefreshPromotionalDiscountsAsync(
    basket,
    countryCode: null,
    cancellationToken);

// result may contain warnings if a previously-applied discount is no longer valid
// e.g. customer removed items and no longer meets the minimum order threshold
```

Or the simpler automatic-only refresh:

```csharp
var updatedBasket = await checkoutDiscountService.RefreshAutomaticDiscountsAsync(
    basket,
    countryCode: null,
    cancellationToken);
```

## Checking Applicable Automatic Discounts

To see which automatic discounts would apply to a basket (without actually applying them):

```csharp
var discounts = await checkoutDiscountService.GetApplicableAutomaticDiscountsAsync(
    basket,
    cancellationToken);

foreach (var discount in discounts)
{
    // discount.Name, discount.Amount, discount.Type, etc.
}
```

## Google Auto-Discounts

When a customer clicks a Google Shopping promotion and adds the promoted product to their basket, the Google auto-discount is applied automatically:

```csharp
var result = await checkoutDiscountService.ApplyGoogleAutoDiscountAsync(
    new ApplyGoogleAutoDiscountParameters
    {
        Basket = basket,
        LinkedSku = "TSHIRT-RED-L",
        DiscountPercentage = 15,
        DiscountCode = "GOOGLE15",
        OfferId = "product-guid"
    },
    cancellationToken);
```

This is handled automatically by the `StorefrontApiController.AddToBasket` endpoint when a Google auto-discount cookie is present. You typically do not need to call this directly.

Key behaviours:
- If a Google auto-discount already exists for the same product SKU, it is replaced (not duplicated).
- The discount is linked to a specific product -- it only applies when that product is in the basket.
- The discount information comes from middleware that reads the Google promotion cookie.

## Adding a Discount as a Line Item

For custom discount logic, you can add a discount directly as a basket line item:

```csharp
await checkoutDiscountService.AddDiscountToBasketAsync(
    new AddDiscountToBasketParameters
    {
        // Parameters for the discount line item
    },
    cancellationToken);
```

## How Discounts Are Stored

Discounts appear as line items in the basket with negative amounts. The basket's `Discount` total is the sum of all discount line items. This keeps the discount logic in the calculation pipeline rather than as a separate field.

## Discount Lifecycle During Checkout

Here is what happens to discounts at each checkout stage:

1. **Add to basket** -- Google auto-discounts are applied if a promotion cookie exists. Automatic discounts are evaluated.
2. **Save addresses** -- automatic discounts are refreshed (some may be location-dependent).
3. **Save shipping** -- automatic discounts are refreshed (some may be shipping-dependent).
4. **Apply discount code** -- code is validated and applied. Automatic discounts are also refreshed.
5. **Payment** -- all discounts are included in the invoice as discount line items.

At each stage, if a previously-valid discount becomes invalid (e.g. customer removed items below the minimum threshold), it is automatically removed and a warning message is included in the response.

## Key Points

- Discount codes are validated and applied via `ApplyDiscountCodeAsync`.
- Automatic discounts are refreshed after every basket change -- you do not need to trigger this manually.
- Google auto-discounts are applied via middleware when a Google promotion cookie is present.
- Discounts are stored as line items with negative amounts in the basket.
- When a discount becomes invalid due to basket changes, it is automatically removed with a warning.
- The `discountDelta` in the apply response shows the change in discount amount (useful for UI feedback).

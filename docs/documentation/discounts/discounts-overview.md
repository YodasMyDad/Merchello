# Discounts

Merchello supports percentage discounts, fixed amount off, buy-one-get-one, and free shipping promotions. Discounts can be triggered by codes the customer enters or applied automatically when basket conditions are met. All discount rules are configured in the Umbraco backoffice.

## Discount Types

| Type | Description |
| ------ | ------------- |
| **Amount off products** | Discount on specific products, collections, or product types |
| **Amount off order** | Discount on the entire order total |
| **Buy X Get Y** | Buy qualifying items, get other items free or discounted |
| **Free shipping** | Free or discounted shipping |

Each discount is either **code-based** (customer enters a code) or **automatic** (applied when conditions are met).

## Applying a Discount Code

Use the checkout API to apply a discount code to the current basket:

```http
POST /api/merchello/checkout/discount/apply
Content-Type: application/json

{
    "code": "SAVE10"
}
```

**Success response:**

```json
{
    "success": true,
    "message": "Discount applied successfully.",
    "basket": { ... },
    "discountDelta": 5.00
}
```

The `discountDelta` shows how much the discount total changed (in display currency), useful for showing a toast or animation.

**Failure response:**

```json
{
    "success": false,
    "message": "This discount code has expired."
}
```

Common failure reasons include expired codes, minimum order value not met, and per-customer usage limits exceeded.

### Removing a Discount

```http
DELETE /api/merchello/checkout/discount/{discountId}
```

Returns the same response shape with the updated basket and `discountDelta`.

### JavaScript Example (Checkout Runtime)

The checkout runtime JS (`/App_Plugins/Merchello/js/checkout/services/api.js`) exposes these methods:

```js
// Apply a code
const result = await api.applyDiscount("SAVE10");
if (result.success) {
    // result.basket contains updated totals
    // result.discountDelta shows the change in discount amount
}

// Remove a discount
await api.removeDiscount(discountId);
```

## How Automatic Discounts Work

Automatic discounts require no customer action. The checkout service evaluates all active automatic discounts after every basket-affecting change:

- Adding or removing items
- Changing quantities
- Saving addresses (some discounts are location-dependent)
- Selecting shipping options

If a customer adds a fourth item and triggers a "Buy 3 Get 1 Free" promotion, the discount appears automatically. If they remove an item and no longer qualify, the discount is removed and a warning is included in the response.

You do not need to call any API to trigger automatic discount evaluation -- it happens internally whenever basket state changes.

## How Discounts Appear in the Basket

Discounts are stored as line items with **negative amounts**. The basket DTO includes several discount-related fields:

```json
{
    "subTotal": 120.00,
    "discount": 12.00,
    "tax": 21.60,
    "shipping": 5.99,
    "total": 135.59,
    "formattedDiscount": "$12.00",
    "formattedDisplayDiscount": "12.00",
    "appliedDiscounts": [
        {
            "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
            "name": "Summer Sale",
            "code": null,
            "amount": 12.00,
            "formattedAmount": "$12.00",
            "isAutomatic": true
        }
    ]
}
```

Key fields for storefront display:

| Field | Description |
| ------- | ------------- |
| `discount` / `formattedDiscount` | Total discount in store currency |
| `displayDiscount` / `formattedDisplayDiscount` | Total discount in display currency (for multi-currency stores) |
| `taxInclusiveDisplayDiscount` / `formattedTaxInclusiveDisplayDiscount` | Tax-inclusive discount (when displaying prices inc. tax) |
| `appliedDiscounts` | Array of individual discounts with name, code, amount, and whether automatic |

### Displaying "You Saved" on the Storefront

Use the `appliedDiscounts` array or the aggregate `formattedDisplayDiscount` field:

```html
<!-- Show total savings -->
<template x-if="formattedDisplayDiscount && discount > 0">
    <div class="text-success">
        You saved <span x-text="formattedDisplayDiscount"></span>
    </div>
</template>

<!-- List individual discounts -->
<template x-for="d in appliedDiscounts" :key="d.id">
    <div class="d-flex justify-content-between">
        <span x-text="d.code ? d.name + ' (' + d.code + ')' : d.name"></span>
        <span class="text-success" x-text="'-' + d.formattedAmount"></span>
    </div>
</template>
```

Code-based discounts have a `code` value (e.g., "SAVE10"); automatic discounts have `code: null` and `isAutomatic: true`.

## Discount Lifecycle During Checkout

1. **Add to basket** -- Automatic discounts are evaluated. Google auto-discounts are applied if the customer arrived via a Google Shopping promotion.
2. **Save addresses** -- Automatic discounts are refreshed (some may be location-dependent).
3. **Save shipping** -- Automatic discounts are refreshed (some may be shipping-dependent, e.g., free shipping).
4. **Apply discount code** -- Code is validated and applied. Automatic discounts are also refreshed.
5. **Payment** -- All discounts are included in the invoice as discount line items.

At each stage, if a previously valid discount becomes invalid (e.g., customer removed items below the minimum threshold), it is automatically removed and a warning message is included in the response.

## Order Confirmation

The order confirmation DTO includes the same discount fields so you can display savings on the confirmation page:

- `formattedDisplayDiscount` -- the total discount
- `formattedTaxInclusiveDisplayDiscount` -- the tax-inclusive discount (when relevant)

## Multi-Currency Stores

In multi-currency stores, use the `display*` variants of discount fields. The `discount` and `formattedDiscount` fields are in the store's base currency; the `displayDiscount` and `formattedDisplayDiscount` fields reflect the customer's selected display currency.

## Backoffice Configuration

Discount rules are created and managed in the Umbraco backoffice. Configuration includes targeting rules (which products), eligibility rules (which customers), minimum requirements, usage limits, scheduling, combination rules, and priority ordering. See the backoffice for full configuration options.

## Related Topics

- [Checkout Discounts](../checkout/checkout-discounts.md) -- detailed service-level API for discount operations
- [Checkout Overview](../checkout/)

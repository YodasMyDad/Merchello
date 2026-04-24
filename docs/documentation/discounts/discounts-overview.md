# Discounts

Merchello supports percentage discounts, fixed amount off, buy-X-get-Y (BOGO-style) promotions, and free shipping. Discounts can be triggered by codes the customer enters, or applied automatically when basket conditions are met. All discount rules are configured in the Merchello backoffice.

This page covers the storefront surface: the API, how discounts appear in the basket, and how they interact with [customer segments](../customers/customer-segments.md) and [multi-currency](../multi-currency/multi-currency-overview.md). For the checkout-service integration layer, see [Checkout Discounts](../checkout/checkout-discounts.md).

## Discount Categories

Four `DiscountCategory` values ([`DiscountCategory.cs`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Discounts/Models/DiscountCategory.cs)):

| Category | Description | Notes |
| -------- | ----------- | ----- |
| `AmountOffProducts` | Discount on specific products, collections, or product types | Targeted via `DiscountTargetRule` (SKUs, collections, product types, tags) |
| `AmountOffOrder` | Discount on the entire order subtotal | Applied at order level; honors `RequirementType` / `RequirementValue` |
| `BuyXGetY` | Buy qualifying items, get other items free or discounted | Uses `DiscountBuyXGetYConfig` and [`IBuyXGetYCalculator`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Discounts/Services/Interfaces/IBuyXGetYCalculator.cs); respects `PerOrderUsageLimit` |
| `FreeShipping` | Free or discounted shipping | Uses `DiscountFreeShippingConfig`; free-shipping allow-lists validate against all selected shipping groups (`DiscountContext.SelectedShippingOptionIds`) |

Each discount has a **method** that controls how it activates ([`DiscountMethod.cs`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Discounts/Models/DiscountMethod.cs)):

- `Code` -- customer enters a code at checkout
- `Automatic` -- applied whenever conditions are met, no code needed

And a **value type** ([`DiscountValueType.cs`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Accounting/Models/DiscountValueType.cs)):

- `FixedAmount` -- e.g. £5 off
- `Percentage` -- e.g. 10% off
- `Free` -- 100% off, used by BuyXGetY

> **Tax-aware math.** Set `ApplyAfterTax = true` on the discount to calculate the discount against the tax-inclusive total, then reverse-calculate the pre-tax discount. This is the behavior customers usually expect when prices are displayed inc. tax (e.g. "10% off £120 = £12 saved"). Default is `false`.

## Applying a Discount Code

Use the checkout API to apply a discount code to the current basket ([`CheckoutApiController.cs:383`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello/Controllers/CheckoutApiController.cs#L383)):

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

Returns the same response shape with the updated basket and `discountDelta`. See [`CheckoutApiController.cs:719`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello/Controllers/CheckoutApiController.cs#L719).

### JavaScript Example (Checkout Runtime)

The checkout runtime JS at `/App_Plugins/Merchello/js/checkout/services/api.js` exposes these methods (source of truth: [`Client/public/js/checkout/services/api.js`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello/Client/public/js/checkout/services/api.js)):

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

## How Each Discount Category Applies

Each category has distinct application rules once a discount passes eligibility / target matching:

- **`AmountOffProducts`** (fixed or percentage) -- applied line by line to matching products. `DiscountTargetRule`s decide which line items are eligible (by product type, collection, product filter, SKU, supplier, warehouse). Respects `MinimumPurchaseAmount` / `MinimumQuantity` via `RequirementType`.
- **`AmountOffOrder`** -- applied once to the order subtotal after product-level discounts. `CanCombineWithProductDiscounts` must be `true` to stack.
- **`BuyXGetY`** -- calculated by `IBuyXGetYCalculator`. Trigger (`BuyXTriggerType`) and reward SKUs come from `DiscountBuyXGetYConfig`. Selection method (`BuyXGetYSelectionMethod`) picks which reward lines receive the discount when multiple candidates qualify. `PerOrderUsageLimit` caps the number of times the trigger can repeat in one order.
- **`FreeShipping`** -- applied to the shipping line after shipping quotes resolve. Country scope comes from `FreeShippingCountryScope`. If the customer has multiple shipping groups (e.g. per-warehouse), the discount validates every `DiscountContext.SelectedShippingOptionIds` entry -- a partial match does not apply.

## How Automatic Discounts Work

Automatic discounts require no customer action. The checkout service evaluates all active automatic discounts after every basket-affecting change:

- Adding or removing items
- Changing quantities
- Saving addresses (some discounts are location-dependent)
- Selecting shipping options

If a customer adds a fourth item and triggers a "Buy 3 Get 1 Free" promotion, the discount appears automatically. If they remove an item and no longer qualify, the discount is removed and a warning is included in the response.

You do not need to call any API to trigger automatic discount evaluation -- it happens internally whenever basket state changes. See [`ICheckoutDiscountService`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Discounts/Services/Interfaces/IDiscountEngine.cs) and [Checkout Discounts](../checkout/checkout-discounts.md) for the service-level contract.

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

Code-based discounts have a `code` value (e.g. `"SAVE10"`); automatic discounts have `code: null` and `isAutomatic: true`.

## Discount Lifecycle During Checkout

1. **Add to basket** -- Automatic discounts are evaluated. Google auto-discounts are applied if the customer arrived via a Google Shopping promotion.
2. **Save addresses** -- Automatic discounts are refreshed (some may be location-dependent).
3. **Save shipping** -- Automatic discounts are refreshed (some may be shipping-dependent, e.g. free shipping).
4. **Apply discount code** -- Code is validated and applied. Automatic discounts are refreshed at the same time.
5. **Payment** -- All discounts are frozen onto the invoice as discount line items, and usage counts are recorded via `IDiscountService.TryRecordUsageAsync()`.

At each stage, if a previously valid discount becomes invalid (e.g. the customer removed items below a `MinimumPurchaseAmount`), it is automatically removed and a warning message is included in the response.

## Segment Targeting

A discount's `EligibilityType` ([`DiscountEligibilityType.cs`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Discounts/Models/DiscountEligibilityType.cs)) decides who qualifies:

- `AllCustomers` -- no restriction
- `CustomerSegments` -- only members of one or more [customer segments](../customers/customer-segments.md) (manual or automated)
- `SpecificCustomers` -- an explicit customer allow-list

Segment membership is resolved at discount-evaluation time via `ICustomerSegmentService.IsCustomerInSegmentAsync(...)`, which transparently handles both manual and automated segments. No storefront code is required -- the discount engine queries segment membership internally.

## Order Confirmation

The order confirmation DTO includes the same discount fields so you can display savings on the confirmation page:

- `formattedDisplayDiscount` -- the total discount (in display currency)
- `formattedTaxInclusiveDisplayDiscount` -- the tax-inclusive discount (when `ApplyAfterTax = true` or prices are shown inc. tax)

## Multi-Currency Stores

> **Currency invariants.** See [Multi-Currency Overview](../multi-currency/multi-currency-overview.md). Basket amounts -- including discount totals -- are stored in **store currency** and NEVER change when the display currency changes. Display values are calculated on the fly (`amount * rate`). At invoice creation, the rate is locked onto the invoice and the discount is frozen in the presentment currency with a parallel `DiscountInStoreCurrency` for reporting.

Field selection when rendering on the storefront:

| Use case | Field |
| -------- | ----- |
| Display in customer's currency (tax-exclusive) | `formattedDisplayDiscount` |
| Display in customer's currency (tax-inclusive) | `formattedTaxInclusiveDisplayDiscount` |
| Store-currency value for reporting | `discount` / `formattedDiscount` |

Never hand-convert between these by multiplying/dividing yourself -- `amount * rate` for display and `amount / rate` for invoice creation are the only sanctioned directions, and Merchello does them for you.

## Backoffice Configuration

Discount rules are created and managed in the Merchello backoffice. Configuration includes targeting rules (which products), eligibility rules (which customers), minimum requirements, usage limits, scheduling, combination rules, and priority ordering (lower `Priority` = applied first). See the backoffice for full configuration options.

## Related Topics

- [Checkout Discounts](../checkout/checkout-discounts.md) -- service-level integration (`ICheckoutDiscountService`)
- [Customer Segments](../customers/customer-segments.md) -- how segments gate discount eligibility
- [Multi-Currency Overview](../multi-currency/multi-currency-overview.md) -- currency invariants that affect discount math
- [Architecture-Diagrams Section 2.9](https://github.com/YodasMyDad/Merchello/blob/main/docs/Architecture-Diagrams.md) -- discount service map and calculator notes

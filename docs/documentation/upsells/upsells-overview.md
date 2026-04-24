# Upsells and Post-Purchase Offers

Merchello's upsell system recommends additional products to customers based on what is in their basket, the products they are viewing, and where they are in the purchase journey. Upsell rules are configured in the Merchello backoffice; this page covers the storefront API and display integration.

> **Upsells are separate from the cart/checkout flow.** The upsell engine ([`IUpsellEngine`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Upsells/Services/Interfaces/IUpsellEngine.cs)) only produces suggestions and records analytics events. It does not add anything to the basket, modify pricing, or change the checkout state. The one exception is **post-purchase** upsells, which run **after** successful payment against a saved payment method and apply as an **invoice edit** on the already-paid invoice via [`IPostPurchaseUpsellService`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Upsells/Services/Interfaces/IPostPurchaseUpsellService.cs) -- they still do not touch the original cart/checkout flow.

## Display Locations

Upsells can appear in multiple places during the shopping experience:

| Location | When it shows |
| ---------- | --------------- |
| **Product page** | While browsing a product, before adding to basket |
| **Basket** | On the basket/cart page, alongside current items |
| **Checkout** | During the checkout flow (inline, interstitial, or order bump) |
| **Post-purchase** | After payment, before the confirmation page (one-click add via saved payment) |
| **Email** | In transactional emails (order confirmation, etc.) |

## Fetching Upsell Suggestions

Endpoints live on [`StorefrontUpsellController.cs`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello/Controllers/StorefrontUpsellController.cs).

### Product Page

Fetch upsell suggestions for a specific product:

```http
GET /api/merchello/storefront/upsells/product/{productId}?countryCode=GB&regionCode=ENG
```

Returns an array of `UpsellSuggestionDto`, each containing a heading, optional message, and a list of recommended products with full pricing details already resolved in the caller's display currency.

### Basket Page

Fetch upsell suggestions based on the current basket contents:

```http
GET /api/merchello/storefront/upsells?location=Basket&countryCode=GB&regionCode=ENG
```

The `location` parameter is a [`UpsellDisplayLocation`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Upsells/Models/UpsellDisplayLocation.cs) flags enum: `Checkout` (1), `Basket` (2), `ProductPage` (4), `Email` (8), `Confirmation` (16). Because it is `[Flags]`, a single rule can target multiple locations.

Country and region codes are optional. If omitted, the API falls back to the basket shipping address, then to the storefront display context (`IStorefrontContextService.GetDisplayContextAsync()`).

### Response Shape

```json
[
    {
        "upsellRuleId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "heading": "Complete the look",
        "message": "Customers who bought this also loved these items",
        "checkoutMode": "Inline",
        "defaultChecked": false,
        "displayStyles": null,
        "products": [
            {
                "productId": "...",
                "productRootId": "...",
                "name": "Leather Belt",
                "sku": "BELT-BRN-M",
                "price": 29.99,
                "formattedPrice": "$29.99",
                "priceIncludesTax": false,
                "taxRate": 0.20,
                "taxAmount": 6.00,
                "formattedTaxAmount": "$6.00",
                "onSale": false,
                "previousPrice": null,
                "formattedPreviousPrice": null,
                "url": "/products/leather-belt/",
                "imageUrl": "/media/products/belt.jpg",
                "productTypeName": "Accessories",
                "availableForPurchase": true,
                "hasVariants": true,
                "variants": [
                    {
                        "productId": "...",
                        "name": "Medium",
                        "sku": "BELT-BRN-M",
                        "price": 29.99,
                        "formattedPrice": "$29.99",
                        "availableForPurchase": true
                    }
                ]
            }
        ]
    }
]
```

## Displaying Upsells in Views

The starter site includes a Razor partial for product page upsells at `src/Merchello.Site/Views/Products/Partials/_ProductUpsells.cshtml`. It uses Alpine.js to render suggestions fetched from the API:

```html
<template x-if="upsellSuggestions.length > 0">
    <div>
        <template x-for="suggestion in upsellSuggestions" :key="suggestion.upsellRuleId">
            <section class="product-upsells mt-5 pt-4 border-top">
                <h2 class="h4 mb-3" x-text="suggestion.heading"></h2>
                <template x-if="suggestion.message">
                    <p class="text-muted mb-3" x-text="suggestion.message"></p>
                </template>
                <div class="row g-3">
                    <template x-for="product in suggestion.products" :key="product.productId">
                        <div class="col-6 col-md-3">
                            <a :href="product.url || '#'" class="card text-decoration-none h-100"
                               @click="trackProductUpsellClick(suggestion.upsellRuleId, product.productId)">
                                <template x-if="product.imageUrl">
                                    <img :src="product.imageUrl" :alt="product.name"
                                         class="card-img-top" style="height: 180px; object-fit: contain;">
                                </template>
                                <div class="card-body text-center">
                                    <h6 class="card-title" x-text="product.name"></h6>
                                    <div class="text-primary fw-bold" x-text="product.formattedPrice"></div>
                                    <template x-if="product.onSale && product.formattedPreviousPrice">
                                        <div class="text-muted text-decoration-line-through small"
                                             x-text="product.formattedPreviousPrice"></div>
                                    </template>
                                </div>
                            </a>
                        </div>
                    </template>
                </div>
            </section>
        </template>
    </div>
</template>
```

### JavaScript Integration

The starter site's product page and basket page both fetch upsells using `MerchelloApi`:

```js
// Product page -- fetch suggestions for the current product
const result = await api.upsells.getProductSuggestions(productId);
if (result.success) {
    this.upsellSuggestions = result.data || [];
}

// Basket page -- fetch suggestions for the basket at the Basket location
const result = await api.upsells.getSuggestions("Basket", {
    countryCode,
    regionCode
});
if (result.success) {
    this.upsellSuggestions = result.data || [];
}
```

Upsells are re-fetched on the basket page when the country or region changes, since suggestions may vary by location.

## Checkout Modes

When upsells target the checkout, the `checkoutMode` field ([`CheckoutUpsellMode.cs`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Upsells/Models/CheckoutUpsellMode.cs)) indicates how to render them:

| Mode | Behavior |
| ---- | -------- |
| `Inline` | Collapsible section at the top of the checkout page |
| `Interstitial` | Replaces checkout content until dismissed |
| `OrderBump` | Checkbox integrated into the checkout form. When `defaultChecked` is `true`, the item is pre-selected (opt-out model) |
| `PostPurchase` | Shown after payment, before confirmation. Uses saved payment methods for one-click purchase (requires vaulted payments) |

## Post-Purchase Upsells

Post-purchase upsells appear **after** successful payment but before the order confirmation page. They are a separate concern from cart/checkout discounts and from the basket-building flow -- the order is already paid, and the customer simply opts in to add an additional item at the vaulted card's one-click cost.

Key constraints:

- Requires a **saved payment method** (vaulted card). Providers that do not support vaulting cannot participate.
- Authenticated via the confirmation token cookie set during checkout success.
- Adding an item records a **new** payment (same `Invoice`, additional `Payment` with an `IdempotencyKey`) and then applies an invoice edit; if recording the payment fails, the upsell fails closed so the customer is never charged without the invoice being updated.
- Any fulfilment hold placed on the original order is released either when the upsell is added or when the customer skips.

### API Endpoints

All four endpoints are routed under `/api/merchello/checkout/post-purchase` ([`PostPurchaseUpsellController.cs`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello/Controllers/PostPurchaseUpsellController.cs)):

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/api/merchello/checkout/post-purchase/{invoiceId}` | Get available upsell suggestions |
| POST | `/api/merchello/checkout/post-purchase/{invoiceId}/preview` | Preview price, tax, and shipping for an item |
| POST | `/api/merchello/checkout/post-purchase/{invoiceId}/add` | Add item and charge saved payment method |
| POST | `/api/merchello/checkout/post-purchase/{invoiceId}/skip` | Skip upsells and release fulfilment hold |

### Flow

1. After successful payment, the checkout redirects to the confirmation page.
2. If post-purchase upsells are available, they display before the confirmation content.
3. The customer can preview the exact cost (including tax and shipping) of adding an item.
4. Adding an item charges their saved payment method and adds the item to the existing order.
5. Skipping releases any fulfilment hold and shows the confirmation.

### Preview Request

```http
POST /api/merchello/checkout/post-purchase/{invoiceId}/preview
Content-Type: application/json

{
    "productId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "quantity": 1,
    "addons": []
}
```

### Add to Order Request

```http
POST /api/merchello/checkout/post-purchase/{invoiceId}/add
Content-Type: application/json

{
    "productId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "quantity": 1,
    "upsellRuleId": "...",
    "savedPaymentMethodId": "...",
    "idempotencyKey": "unique-key-per-attempt",
    "addons": []
}
```

The `idempotencyKey` prevents duplicate charges if the request is retried.

## Tracking Impressions and Clicks

Record upsell analytics events by posting to the events endpoint:

```http
POST /api/merchello/storefront/upsells/events
Content-Type: application/json

{
    "events": [
        {
            "upsellRuleId": "...",
            "eventType": "Impression",
            "productId": "...",
            "displayLocation": 4
        }
    ]
}
```

Event types are `Impression`, `Click`, and `Conversion` ([`UpsellEventType.cs`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Upsells/Models/UpsellEventType.cs)). The display location numeric values match the `UpsellDisplayLocation` flags enum (`Checkout` = 1, `Basket` = 2, `ProductPage` = 4, `Email` = 8, `Confirmation` = 16).

> **Impressions are recorded for you.** `GET /api/merchello/storefront/upsells` automatically captures an impression record for every suggestion it returns with products. You typically only need to `POST` click events manually.

The starter site tracks events like this (source of truth: [`merchello-api.js`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Site/wwwroot/scripts/merchello-api.js)):

```js
// Record a click when a customer interacts with an upsell product
api.upsells.recordEvents([{
    upsellRuleId,
    eventType: "Click",
    productId,
    displayLocation: 4  // ProductPage
}]);
```

## Backoffice Configuration

Upsell rules are created and managed in the Merchello backoffice. Configuration includes trigger rules (when to show), recommendation rules (what to suggest), eligibility rules (who sees it), display settings, scheduling, and priority ordering.

## Related Topics

- [Checkout Overview](../checkout/)
- [Payments: Saved Payment Methods](../payments/saved-payment-methods.md) -- required for post-purchase upsells
- [Email System](../email/email-overview.md) -- rendering upsells in transactional email
- [Architecture-Diagrams Section 2.15](https://github.com/YodasMyDad/Merchello/blob/main/docs/Architecture-Diagrams.md) -- upsell service map

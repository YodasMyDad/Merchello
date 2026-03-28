# Storefront API Reference

The Storefront API is the public-facing API that your storefront (whether server-rendered or headless) uses to interact with Merchello. It handles baskets, shipping/location preferences, currency selection, product availability, upsells, and saved payment methods.

**Base URL:** `/api/merchello/storefront`

All endpoints are anonymous by default unless noted otherwise. Responses are JSON.

---

## Storefront Context

### GET `/context`

Bootstrap endpoint that returns the current location, currency, and basket summary in a single call. This is perfect for initializing a headless storefront on page load.

**Response:**

```json
{
  "location": {
    "countryCode": "GB",
    "countryName": "United Kingdom",
    "regionCode": null
  },
  "currency": {
    "currencyCode": "GBP",
    "currencySymbol": "\u00a3",
    "decimalPlaces": 2
  },
  "basket": {
    "itemCount": 3,
    "formattedTotal": "\u00a389.97"
  }
}
```

> **Tip:** Use this endpoint instead of calling `/shipping/country`, `/currency`, and `/basket/count` separately. It saves you two extra HTTP round trips.

---

## Basket Endpoints

### POST `/basket/add`

Add a product (with optional add-ons) to the basket.

**Request body:**

```json
{
  "productId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "quantity": 2,
  "addons": [
    {
      "optionId": "...",
      "choiceId": "..."
    }
  ]
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Added to basket",
  "basket": { /* full basket object */ }
}
```

**Response (400):** Returned when the product is not found, out of stock, or add-on configuration is invalid.

> **Note:** If a Google Auto Discount cookie is active and matches the product, the discount is automatically applied when the item is added.

---

### GET `/basket`

Get the full basket with all line items and calculated totals.

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `includeAvailability` | bool | `false` | Check stock availability for each line item |
| `countryCode` | string | null | Country code for availability check |
| `regionCode` | string | null | Region code for availability check |

**Response (200):**

```json
{
  "id": "...",
  "lineItems": [ /* ... */ ],
  "subTotal": 89.97,
  "tax": 18.00,
  "shipping": 5.99,
  "discount": 0,
  "total": 113.96,
  "currencySymbol": "\u00a3",
  "itemCount": 3,
  "availability": [ /* only if includeAvailability=true */ ]
}
```

---

### GET `/basket/count`

Lightweight endpoint that returns just the item count and formatted total. Use this to update a basket badge/icon without fetching the full basket.

**Response (200):**

```json
{
  "itemCount": 3,
  "formattedTotal": "\u00a389.97"
}
```

---

### POST `/basket/update`

Update the quantity of a line item in the basket.

**Request body:**

```json
{
  "lineItemId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "quantity": 3
}
```

**Response (200):** Returns the updated basket (same shape as `GET /basket`).

---

### DELETE `/basket/{lineItemId}`

Remove a specific line item from the basket.

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `lineItemId` | Guid | The line item to remove |

**Response (200):** Returns the updated basket.

---

### POST `/basket/clear`

Remove all items from the basket. This deletes the entire basket.

**Response (200):**

```json
{
  "success": true,
  "message": "Basket cleared",
  "basket": null
}
```

---

### GET `/basket/availability`

Check stock availability for all items currently in the basket.

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `countryCode` | string | Country to check availability for |
| `regionCode` | string | Region to check availability for |

**Response (200):** Returns availability status per line item, including whether each item can ship to the specified location.

---

### GET `/basket/estimated-shipping`

Get an estimated shipping cost for the basket. Automatically selects the cheapest shipping option per warehouse group.

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `countryCode` | string | Destination country (uses storefront location if omitted) |
| `regionCode` | string | Destination region |

**Response (200):**

```json
{
  "success": true,
  "estimatedShippingTotal": 5.99,
  "formattedEstimatedShippingTotal": "\u00a35.99",
  "basket": { /* ... */ }
}
```

If shipping cannot be estimated (empty basket, no location), the response includes `success: false` with an error message.

> **Tip:** Display this on the basket page to give customers a shipping estimate before they enter checkout.

---

## Shipping and Location Endpoints

### GET `/shipping/countries`

Get the list of countries you ship to, plus the customer's current country selection and currency.

**Response (200):**

```json
{
  "countries": [
    { "code": "GB", "name": "United Kingdom" },
    { "code": "US", "name": "United States" }
  ],
  "currentCountry": { "code": "GB", "name": "United Kingdom" },
  "currency": { "currencyCode": "GBP", "currencySymbol": "\u00a3" }
}
```

> **Note:** The country list is derived from your warehouse service regions. Only countries with active shipping configuration appear here.

---

### GET `/shipping/country`

Get just the customer's current shipping country preference.

**Response (200):**

```json
{
  "code": "GB",
  "name": "United Kingdom"
}
```

---

### POST `/shipping/country`

Set the customer's shipping country. This also automatically updates the currency based on your country-to-currency mapping and converts any existing basket amounts.

**Request body:**

```json
{
  "countryCode": "US",
  "regionCode": "CA"
}
```

**Response (200):** Returns the selected country and new currency.

**Response (400):** Returned if the country code is invalid or currency conversion fails.

> **Warning:** Changing the country triggers a basket currency conversion. If the basket has items, all amounts are recalculated at the current exchange rate.

---

### GET `/shipping/countries/{countryCode}/regions`

Get available regions (states/provinces) for a specific country.

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `countryCode` | string | ISO country code (e.g., `US`, `CA`) |

**Response (200):**

```json
{
  "countryCode": "US",
  "regions": [
    { "regionCode": "CA", "name": "California" },
    { "regionCode": "NY", "name": "New York" }
  ]
}
```

---

## Currency Endpoints

### GET `/currency`

Get the current storefront currency.

**Response (200):**

```json
{
  "currencyCode": "GBP",
  "currencySymbol": "\u00a3",
  "decimalPlaces": 2
}
```

---

### POST `/currency`

Override the storefront currency. If the basket has items, all amounts are converted to the new currency.

**Request body:**

```json
{
  "currencyCode": "EUR"
}
```

**Response (200):** Returns the new currency details.

**Response (400):** Returned if the currency code is invalid or conversion fails.

---

## Product Availability

### GET `/products/{productId}/availability`

Check whether a specific product is available for purchase, optionally at a specific location.

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `productId` | Guid | The product variant ID |

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `countryCode` | string | null | Check availability for this country |
| `regionCode` | string | null | Check availability for this region |
| `quantity` | int | 1 | Quantity to check |

**Response (200):** Returns availability information including stock status and shipping eligibility.

**Response (404):** Product not found.

---

## Upsell Endpoints

**Base URL:** `/api/merchello/storefront/upsells`

### GET `/`

Get upsell suggestions for the current basket at a specific display location.

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `location` | enum | Display location: `ProductPage`, `Basket`, `Checkout`, etc. |
| `countryCode` | string | For tax/availability calculations |
| `regionCode` | string | For tax/availability calculations |

**Response (200):**

```json
[
  {
    "upsellRuleId": "...",
    "heading": "You might also like",
    "message": "Customers who bought this also bought...",
    "checkoutMode": "AddToBasket",
    "defaultChecked": false,
    "products": [
      {
        "productId": "...",
        "name": "Widget Pro",
        "sku": "WIDGET-PRO",
        "price": 29.99,
        "formattedPrice": "\u00a329.99",
        "imageUrl": "/media/widget-pro.jpg",
        "availableForPurchase": true,
        "hasVariants": false
      }
    ]
  }
]
```

> **Note:** Impressions are automatically recorded when suggestions are returned. You don't need to track impressions manually unless you want finer-grained analytics.

---

### GET `/product/{productId}`

Get upsell suggestions for a specific product page.

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `productId` | Guid | The product to get suggestions for |

**Query parameters:** Same as the basket upsells endpoint (`countryCode`, `regionCode`).

**Response (200):** Same format as the basket upsells endpoint.

---

### POST `/events`

Record upsell analytics events (impressions, clicks) in batch.

**Request body:**

```json
{
  "events": [
    {
      "upsellRuleId": "...",
      "displayLocation": "ProductPage",
      "productId": "...",
      "eventType": "Click"
    }
  ]
}
```

**Response (204):** No content.

---

## Saved Payment Methods

**Base URL:** `/api/merchello/storefront/payment-methods`

> **Note:** All saved payment method endpoints require authentication. Customers can only access their own payment methods.

### GET `/`

Get all saved payment methods for the current customer.

**Response (200):**

```json
[
  {
    "id": "...",
    "providerAlias": "stripe",
    "methodType": "Card",
    "cardBrand": "Visa",
    "last4": "4242",
    "expiryFormatted": "12/25",
    "isExpired": false,
    "displayLabel": "Visa ending in 4242",
    "isDefault": true,
    "iconHtml": "<svg>...</svg>"
  }
]
```

**Response (401):** Customer not authenticated.

---

### POST `/setup`

Create a vault setup session to add a new payment method. This initiates the process with the payment provider (e.g., creates a Stripe SetupIntent).

**Request body:**

```json
{
  "providerAlias": "stripe",
  "methodAlias": "card",
  "returnUrl": "https://example.com/account/payment-methods",
  "cancelUrl": "https://example.com/account/payment-methods"
}
```

**Response (200):**

```json
{
  "success": true,
  "setupSessionId": "...",
  "clientSecret": "seti_..._secret_...",
  "redirectUrl": null,
  "sdkConfig": { /* provider-specific SDK configuration */ }
}
```

---

### POST `/confirm`

Confirm a vault setup and save the payment method after the customer completes the provider-side flow.

**Request body:**

```json
{
  "providerAlias": "stripe",
  "setupSessionId": "...",
  "paymentMethodToken": "pm_...",
  "providerCustomerId": "cus_...",
  "setAsDefault": true
}
```

**Response (200):** Returns the newly saved payment method.

---

### POST `/{id}/set-default`

Set a saved payment method as the default.

**Response (200):** `{ "success": true, "message": "Default payment method updated." }`

**Response (404):** Payment method not found or belongs to another customer.

---

### DELETE `/{id}`

Delete a saved payment method.

**Response (200):** `{ "success": true, "message": "Payment method deleted." }`

**Response (404):** Payment method not found or belongs to another customer.

---

### GET `/providers`

Get available vault-enabled payment providers. Only providers that support vaulted payments and have vaulting enabled are returned.

**Response (200):**

```json
[
  {
    "alias": "stripe",
    "displayName": "Stripe",
    "iconHtml": "<svg>...</svg>",
    "requiresProviderCustomerId": false
  }
]
```

# Checkout API Reference

The Checkout API handles the entire checkout flow, from basket retrieval through address entry, shipping selection, discount codes, and payment processing. It also covers account management during checkout (sign-in, registration, password reset) and abandoned checkout recovery.

**Base URL:** `/api/merchello/checkout`

All endpoints are anonymous (no authentication required) unless noted. Responses are JSON.

---

## Basket

### GET `/basket`

Get the current basket with formatted totals and currency context for the checkout page.

**Response (200):**

```json
{
  "isEmpty": false,
  "lineItems": [ /* ... */ ],
  "subTotal": 89.97,
  "tax": 18.00,
  "shipping": 5.99,
  "discount": 0,
  "total": 113.96,
  "currencySymbol": "\u00a3",
  "displayCurrencyCode": "GBP",
  "displayCurrencySymbol": "\u00a3",
  "exchangeRate": 1.0
}
```

When the basket is empty, `isEmpty` is `true` and only currency fields are returned.

---

## Countries and Regions

### GET `/shipping/countries`

Get countries available for shipping. This list is filtered by your warehouse service region configuration -- only countries you actually ship to appear here.

**Response (200):**

```json
[
  { "code": "GB", "name": "United Kingdom" },
  { "code": "US", "name": "United States" }
]
```

---

### GET `/shipping/regions/{countryCode}`

Get regions (states/provinces) available for shipping within a country.

**Response (200):**

```json
[
  { "regionCode": "CA", "name": "California" },
  { "regionCode": "NY", "name": "New York" }
]
```

---

### GET `/billing/countries`

Get all countries for the billing address dropdown. Unlike shipping countries, this is not restricted by warehouse configuration.

---

### GET `/billing/regions/{countryCode}`

Get all regions for a billing country.

---

## Addresses

### POST `/addresses`

Save billing and shipping addresses. This is typically the first step of checkout after the basket.

**Request body:**

```json
{
  "email": "customer@example.com",
  "billingAddress": {
    "firstName": "Jane",
    "lastName": "Doe",
    "addressOne": "123 High Street",
    "townCity": "London",
    "countyState": "Greater London",
    "postalCode": "EC1A 1BB",
    "countryCode": "GB"
  },
  "shippingAddress": {
    "firstName": "Jane",
    "lastName": "Doe",
    "addressOne": "123 High Street",
    "townCity": "London",
    "countyState": "Greater London",
    "postalCode": "EC1A 1BB",
    "countryCode": "GB"
  },
  "shippingSameAsBilling": true,
  "acceptsMarketing": false,
  "password": null
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Addresses saved successfully.",
  "basket": { /* updated basket with recalculated totals */ }
}
```

**Response (400):** Validation errors or no basket found.

> **Note:** When `shippingSameAsBilling` is `true`, the billing address is copied to shipping. The `password` field is used when the customer opts to create an account during checkout.

---

## Address Lookup

Merchello supports address autocomplete providers (e.g., Loqate, Google Places). These endpoints power the typeahead address fields in checkout.

### GET `/address-lookup/config`

Get the client-side configuration for the active address lookup provider. This tells the frontend which provider SDK to load and how to configure it.

---

### POST `/address-lookup/suggestions`

Search for address suggestions as the customer types.

**Request body:**

```json
{
  "query": "123 High",
  "countryCode": "GB",
  "limit": 5,
  "sessionId": "abc-123"
}
```

**Response (200):**

```json
{
  "success": true,
  "suggestions": [
    {
      "id": "provider-address-id",
      "label": "123 High Street, London",
      "description": "EC1A 1BB"
    }
  ]
}
```

Rate limited to 30 requests per minute per IP.

---

### POST `/address-lookup/resolve`

Resolve a suggestion into a full structured address.

**Request body:**

```json
{
  "id": "provider-address-id",
  "countryCode": "GB",
  "sessionId": "abc-123"
}
```

**Response (200):**

```json
{
  "success": true,
  "address": {
    "addressOne": "123 High Street",
    "addressTwo": "",
    "townCity": "London",
    "countyState": "Greater London",
    "regionCode": "",
    "postalCode": "EC1A 1BB",
    "country": "United Kingdom",
    "countryCode": "GB",
    "company": ""
  }
}
```

Rate limited to 20 requests per minute per IP.

---

## Checkout Initialization

### POST `/initialize`

Initialize single-page checkout. Auto-calculates shipping options and selects the cheapest option for each warehouse group. This is the recommended starting point for single-page and express checkout flows.

**Request body:**

```json
{
  "countryCode": "GB",
  "stateCode": null,
  "autoSelectShipping": true,
  "email": "customer@example.com",
  "previousShippingSelections": {}
}
```

**Response (200):**

```json
{
  "success": true,
  "basket": { /* updated basket */ },
  "shippingGroups": [
    {
      "groupId": "...",
      "groupName": "Main Warehouse",
      "lineItems": [ /* items in this group */ ],
      "shippingOptions": [
        {
          "id": "so:...",
          "name": "Standard Delivery",
          "cost": 5.99,
          "formattedCost": "\u00a35.99",
          "isSelected": true
        }
      ]
    }
  ],
  "combinedShippingTotal": 5.99,
  "formattedCombinedShippingTotal": "\u00a35.99",
  "shippingAutoSelected": true,
  "currencyDecimalPlaces": 2
}
```

**Response (422):** Returned when items cannot ship to the chosen country, with item-level error details in the basket.

> **Tip:** Set `autoSelectShipping: true` for single-page checkouts. The cheapest option per group is pre-selected, and the customer can change it later.

---

## Shipping

### GET `/shipping-groups`

Get shipping groups with available shipping options. Items are grouped by warehouse/fulfillment source.

**Response (200):**

```json
{
  "success": true,
  "basket": { /* ... */ },
  "shippingGroups": [ /* same format as initialize response */ ]
}
```

---

### POST `/shipping`

Save shipping selections for each warehouse group.

**Request body:**

```json
{
  "selections": {
    "group-id-1": "so:shipping-option-guid",
    "group-id-2": "dyn:carrier:service-code"
  },
  "quotedCosts": {
    "dyn:carrier:service-code": 12.50
  },
  "deliveryDates": {
    "so:shipping-option-guid": "2026-04-02"
  }
}
```

**Response (200):** Returns the updated basket and shipping groups with selections applied.

**Response (422):** Not all groups have valid shipping selections.

> **Note:** The selection keys follow a stable contract: `so:{guid}` for flat-rate options, `dyn:{provider}:{serviceCode}` for dynamic carrier rates.

---

## Discounts

### POST `/discount/apply`

Apply a discount code to the basket.

**Request body:**

```json
{
  "code": "SUMMER20"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Discount applied successfully.",
  "basket": { /* updated basket */ },
  "discountDelta": 17.99
}
```

The `discountDelta` field shows how much the discount changed (in display currency), which is useful for analytics tracking.

**Response (400):** Invalid or expired code, minimum spend not met, etc.

---

### DELETE `/discount/{discountId}`

Remove a specific discount from the basket.

**Response (200):** Returns the updated basket with the discount removed.

---

## Terms and Policies

### GET `/terms/{key}`

Render terms or policy content. The `key` parameter determines what content is shown:

- `terms` -- Returns Terms & Conditions from store settings
- `privacy` -- Returns Privacy Policy from store settings
- Any other key -- Attempts to render a Razor view at `~/App_Plugins/Merchello/Views/Checkout/{Key}.cshtml`

**Response (200):**

```json
{
  "success": true,
  "html": "<h2>Terms and Conditions</h2><p>...</p>"
}
```

---

## Member Account Endpoints

These endpoints handle account creation, sign-in, and password management during checkout.

### POST `/check-email`

Check if an email has an existing member account. For security, this always returns `false` to prevent user enumeration.

---

### POST `/credit-check`

Check if a customer has exceeded their credit limit. Used when Purchase Order payment is selected. Requires authentication.

**Request body:** `{ "email": "customer@example.com" }`

**Response (200):**

```json
{
  "hasCreditLimit": true,
  "creditLimitExceeded": false
}
```

---

### POST `/validate-password`

Validate a password against Umbraco's configured requirements. Used for real-time validation during account creation.

**Request body:** `{ "password": "MyStr0ngP@ss!" }`

**Response (200):**

```json
{
  "isValid": true,
  "errors": []
}
```

---

### POST `/sign-in`

Sign in with an existing member account during checkout.

---

### POST `/sign-out`

Sign out the current member during checkout.

---

### POST `/forgot-password`

Initiate a password reset flow.

---

### POST `/validate-reset-token`

Validate a password reset token.

---

### POST `/reset-password`

Reset a password using a valid token.

---

## Abandoned Checkout Recovery

### POST `/capture-email`

Capture the customer's email early in checkout for abandoned checkout recovery emails.

---

### POST `/capture-address`

Capture address data for abandoned checkout tracking.

---

### GET `/recover/{token}`

Load a recovered checkout session from an abandoned checkout email link. Restores the basket and any saved checkout state.

---

### GET `/recover/{token}/validate`

Validate a recovery token without loading the session. Use this to check if a recovery link is still valid before redirecting the customer.

---

## Payment Endpoints

**Base URL:** `/api/merchello/checkout`

### GET `/payment-methods`

Get available payment methods for checkout.

**Response (200):**

```json
[
  {
    "alias": "stripe",
    "displayName": "Credit/Debit Card",
    "methodAlias": "card",
    "iconHtml": "<svg>...</svg>"
  }
]
```

---

### GET `/payment-options`

Get comprehensive payment options including standard methods, express checkout methods, and saved payment methods (if authenticated).

---

### POST `/pay`

Initiate a payment session. This is the primary payment entry point that creates an invoice and starts the payment flow.

**Request body:**

```json
{
  "providerAlias": "stripe",
  "methodAlias": "card",
  "returnUrl": "https://example.com/checkout/confirmation",
  "cancelUrl": "https://example.com/checkout/payment",
  "acceptTerms": true
}
```

**Response (200):**

```json
{
  "success": true,
  "redirectUrl": null,
  "clientSecret": "pi_..._secret_...",
  "invoiceId": "...",
  "sdkConfig": { /* provider-specific config */ }
}
```

---

### POST `/{invoiceId}/pay`

Create a payment session for a specific invoice (e.g., retry after failure, or pay an existing invoice).

---

### POST `/process-payment`

Process a payment after the customer completes the provider-side flow (e.g., after Stripe.js confirms the PaymentIntent).

**Request body:**

```json
{
  "invoiceId": "...",
  "providerAlias": "stripe",
  "transactionId": "pi_...",
  "paymentMethodToken": "pm_..."
}
```

**Response (200):**

```json
{
  "success": true,
  "confirmationUrl": "/checkout/confirmation/...",
  "invoiceId": "..."
}
```

---

### POST `/process-direct-payment`

Process a direct payment (e.g., Purchase Order, manual payment) that doesn't require a provider redirect.

---

### POST `/process-saved-payment`

Pay using a saved payment method (requires authentication).

**Request body:**

```json
{
  "invoiceId": "...",
  "savedPaymentMethodId": "...",
  "providerAlias": "stripe"
}
```

---

### GET `/return`

Handle the return from a payment provider redirect (e.g., PayPal, Worldpay).

**Query parameters:** Provider-specific query parameters appended by the payment provider.

---

### GET `/cancel`

Handle cancellation from a payment provider redirect.

---

## Express Checkout

### GET `/express-methods`

Get available express checkout methods (e.g., Apple Pay, Google Pay, PayPal Express).

---

### GET `/express-config`

Get express checkout configuration for initializing provider SDKs on the frontend.

---

### POST `/express`

Process an express checkout flow (e.g., Apple Pay, Google Pay).

---

### POST `/express-payment-intent`

Create a payment intent for express checkout flows that need one before the customer confirms.

---

### POST `/{providerAlias}/create-order`

Create a widget order (e.g., PayPal Smart Buttons). Provider-specific.

---

### POST `/{providerAlias}/capture-order`

Capture a widget order after the customer approves it.

---

### POST `/worldpay/apple-pay-validate`

Validate a Worldpay Apple Pay merchant session.

---

## Post-Purchase Upsells

**Base URL:** `/api/merchello/checkout/post-purchase`

These endpoints power the post-purchase upsell flow that appears on the order confirmation page. They require a valid confirmation token cookie.

### GET `/{invoiceId}`

Get available post-purchase upsell offers for an invoice.

**Response (200):**

```json
{
  "suggestions": [
    {
      "upsellRuleId": "...",
      "heading": "Add this to your order",
      "products": [ /* ... */ ]
    }
  ],
  "expiresUtc": "2026-03-28T15:30:00Z",
  "originalInvoiceTotal": 113.96
}
```

**Response (403):** Invalid or missing confirmation token.

---

### POST `/{invoiceId}/preview`

Preview adding a post-purchase upsell item. Returns calculated price, tax, and shipping without committing.

**Request body:**

```json
{
  "productId": "...",
  "quantity": 1,
  "addons": []
}
```

---

### POST `/{invoiceId}/add`

Add a post-purchase upsell item to the order and charge the saved payment method.

**Request body:**

```json
{
  "productId": "...",
  "quantity": 1,
  "upsellRuleId": "...",
  "savedPaymentMethodId": "...",
  "idempotencyKey": "unique-key-123",
  "addons": []
}
```

> **Warning:** The `idempotencyKey` prevents duplicate charges if the request is retried. Always generate a unique key per user action.

---

### POST `/{invoiceId}/skip`

Skip post-purchase upsells and release the fulfillment hold. After calling this, the order proceeds to fulfillment immediately.

**Response (204):** No content.

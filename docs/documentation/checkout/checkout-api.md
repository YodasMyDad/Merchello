# Checkout API Reference

Complete REST API reference for all checkout endpoints. These are public-facing (anonymous) endpoints used by the checkout frontend.

All checkout endpoints are prefixed with `/api/merchello/checkout` and accept JSON request bodies. The surface is split across two controllers that share the route prefix:

- [`CheckoutApiController`](../../../src/Merchello/Controllers/CheckoutApiController.cs) — basket, countries, addresses, shipping, discounts, auth, address lookup, recovery.
- [`CheckoutPaymentsApiController`](../../../src/Merchello/Controllers/CheckoutPaymentsApiController.cs) — payment methods, payment session creation, express checkout, widget orders, provider returns.

> **Invariant:** Controllers do no business logic. They validate input, delegate to `ICheckoutService` / `ICheckoutPaymentsOrchestrationService`, and map the result. Basket totals are always produced by `CheckoutService.CalculateBasketAsync()`.

---

## Basket

### Get Basket

Retrieves the current basket with formatted totals in the customer's display currency.

```
GET /api/merchello/checkout/basket
```

**Response** `200 OK` -- [`CheckoutBasketDto`](../../../src/Merchello.Core/Checkout/Dtos/CheckoutBasketDto.cs)

The DTO carries **both** store-currency amounts (for calculation reconciliation) and display-currency amounts (for rendering). Pre-formatted strings are included so views never need to format money themselves.

```json
{
  "id": "8b0a...",
  "isEmpty": false,
  "lineItems": [],

  "subTotal": 99.99,
  "adjustedSubTotal": 99.99,
  "discount": 0,
  "tax": 17.50,
  "shipping": 5.00,
  "total": 122.49,
  "currency": "GBP",
  "currencySymbol": "£",
  "formattedSubTotal": "£99.99",
  "formattedTotal": "£122.49",

  "displaySubTotal": 122.49,
  "displayDiscount": 0,
  "displayTax": 21.46,
  "displayShipping": 6.13,
  "displayTotal": 150.08,
  "displayCurrencyCode": "USD",
  "displayCurrencySymbol": "$",
  "formattedDisplayTotal": "$150.08",
  "exchangeRate": 1.2253,

  "displayPricesIncTax": false,
  "taxInclusiveDisplaySubTotal": 0,
  "taxIncludedMessage": null,

  "billingAddress": null,
  "shippingAddress": null,
  "appliedDiscounts": [],
  "errors": []
}
```

If the basket is empty, `isEmpty` is `true` and all totals are zero.

> **Invariant — multi-currency:** Basket amounts are always stored in **store currency**. Display amounts are produced on-the-fly by multiplying by `exchangeRate`. The payment/invoicing path divides by the locked rate — never charge from `displayTotal`. See [Multi-Currency Overview](../multi-currency/multi-currency-overview.md).

---

## Countries and Regions

### Get Shipping Countries

Returns countries you can ship to (restricted by warehouse service regions).

```
GET /api/merchello/checkout/shipping/countries
```

**Response** `200 OK` -- `CountryDto[]`

### Get Shipping Regions

Returns regions (states/provinces) for a shipping country.

```
GET /api/merchello/checkout/shipping/regions/{countryCode}
```

### Get Billing Countries

Returns all countries (no restrictions) for billing addresses.

```
GET /api/merchello/checkout/billing/countries
```

### Get Billing Regions

Returns all regions for a billing country.

```
GET /api/merchello/checkout/billing/regions/{countryCode}
```

---

## Addresses

### Save Addresses

Saves billing and shipping addresses. This is the main address submission endpoint that also handles account creation (when a password is included) and checkout initialization.

```
POST /api/merchello/checkout/addresses
```

**Request Body** -- `SaveAddressesRequestDto`

```json
{
  "email": "customer@example.com",
  "billingAddress": {
    "name": "Jane Smith",
    "company": "",
    "addressOne": "123 Main St",
    "addressTwo": "",
    "townCity": "London",
    "countyState": "Greater London",
    "regionCode": "",
    "postalCode": "SW1A 1AA",
    "countryCode": "GB",
    "phone": "020 1234 5678"
  },
  "shippingAddress": { ... },
  "shippingSameAsBilling": true,
  "acceptsMarketing": false,
  "password": null
}
```

> **Note:** If `password` is provided, a new member account is created during address save. See [Checkout Authentication](checkout-authentication.md).

**Response** `200 OK` -- `SaveAddressesResponseDto`

```json
{
  "success": true,
  "message": "Addresses saved successfully.",
  "basket": { ... }
}
```

**Error** `400 Bad Request` when validation fails.

---

## Checkout Initialization

### Initialize Checkout

Initializes the checkout with a country/state, calculates shipping groups, and auto-selects the cheapest shipping option per group. Used when the page first loads and when the customer changes their shipping country.

```
POST /api/merchello/checkout/initialize
```

**Request Body** -- `InitializeCheckoutRequestDto`

```json
{
  "countryCode": "US",
  "stateCode": "CA",
  "autoSelectShipping": true,
  "email": null,
  "previousShippingSelections": null
}
```

**Response** `200 OK` -- `InitializeCheckoutResponseDto`

```json
{
  "success": true,
  "basket": { ... },
  "shippingGroups": [
    {
      "groupId": "...",
      "groupName": "Warehouse 1",
      "warehouseId": "...",
      "lineItems": [...],
      "shippingOptions": [
        {
          "id": "...",
          "name": "Standard Shipping",
          "daysFrom": 3,
          "daysTo": 5,
          "cost": 5.99,
          "formattedCost": "$5.99",
          "selectionKey": "so:abc123...",
          "isNextDay": false
        }
      ],
      "selectedShippingOptionId": "so:abc123..."
    }
  ],
  "combinedShippingTotal": 5.99,
  "shippingAutoSelected": true
}
```

**Error** `422 Unprocessable Entity` when items can't ship to the destination.

---

## Shipping

### Get Shipping Groups

Returns shipping groups with available options for the current basket and address.

```
GET /api/merchello/checkout/shipping-groups
```

### Save Shipping Selections

Saves the customer's shipping selection for each shipping group.

```
POST /api/merchello/checkout/shipping
```

**Request Body** -- `SelectShippingRequestDto`

```json
{
  "selections": {
    "group-id-1": "so:shipping-option-guid",
    "group-id-2": "dyn:fedex:FEDEX_GROUND"
  },
  "quotedCosts": {
    "group-id-2": 12.50
  },
  "deliveryDates": null
}
```

Selection key formats (stable contract — do not invent new shapes):

- **Flat-rate:** `so:{shippingOptionGuid}`
- **Dynamic (carrier):** `dyn:{providerKey}:{serviceCode}`

`QuotedCosts` only needs entries for dynamic selections — flat-rate costs are re-computed deterministically by `ShippingCostResolver`. See [Checkout Shipping](checkout-shipping.md).

**Response** `200 OK` -- `SelectShippingResponseDto` with updated basket and groups.

---

## Discounts

### Apply Discount Code

```
POST /api/merchello/checkout/discount/apply
```

```json
{
  "code": "SAVE10"
}
```

**Response** `200 OK` -- `ApplyDiscountResponseDto`

```json
{
  "success": true,
  "message": "Discount applied successfully.",
  "basket": { ... },
  "discountDelta": 10.00
}
```

### Remove Discount

```
DELETE /api/merchello/checkout/discount/{discountId}
```

---

## Authentication

### Check Email

```
POST /api/merchello/checkout/check-email
```

Always returns `{ "hasExistingAccount": false }` to prevent email enumeration. See [Checkout Authentication](checkout-authentication.md).

### Sign In

```
POST /api/merchello/checkout/sign-in
```

### Validate Password

```
POST /api/merchello/checkout/validate-password
```

### Forgot Password

```
POST /api/merchello/checkout/forgot-password
```

### Validate Reset Token

```
POST /api/merchello/checkout/validate-reset-token
```

### Reset Password

```
POST /api/merchello/checkout/reset-password
```

---

## Credit Check

For purchase order payments -- checks whether a customer has exceeded their credit limit.

```
POST /api/merchello/checkout/credit-check
```

Requires authentication. Returns default (no limit) for anonymous callers.

---

## Address Lookup

### Get Config

```
GET /api/merchello/checkout/address-lookup/config
```

Returns address lookup provider configuration (e.g., Loqate/Google Places) for the frontend.

### Get Suggestions

```
POST /api/merchello/checkout/address-lookup/suggestions
```

```json
{
  "query": "123 Main",
  "countryCode": "US",
  "limit": 5,
  "sessionId": "..."
}
```

Rate limited: 30 requests/minute per IP.

### Resolve Address

```
POST /api/merchello/checkout/address-lookup/resolve
```

```json
{
  "id": "suggestion-id",
  "countryCode": "US",
  "sessionId": "..."
}
```

Rate limited: 20 requests/minute per IP.

---

## Terms and Policies

### Get Terms Content

```
GET /api/merchello/checkout/terms/{key}
```

Renders policy content by key. For `terms` and `privacy`, content is sourced from the store policies configured in the backoffice. Other keys fall back to Razor views.

---

## Cart Recovery

### Recover Basket

```
GET /api/merchello/checkout/recover/{token}
```

Restores a basket from an abandoned cart recovery link. Rate limited: 10 requests/minute per IP. See [Abandoned Cart Recovery](abandoned-cart.md).

### Validate Recovery Token

```
GET /api/merchello/checkout/recover/{token}/validate
```

Validates a recovery token without restoring the basket.

---

## Payment Endpoints

Payment operations use a separate controller at the same base path. See [Payment System Overview](../payments/payment-system-overview.md) for details.

### Get Payment Methods

```
GET /api/merchello/checkout/payment-methods
```

Returns available payment methods for checkout.

### Get Payment Options

```
GET /api/merchello/checkout/payment-options
```

Returns full payment options including saved methods, express checkout availability, and configured payment methods.

### Initiate Payment

```
POST /api/merchello/checkout/pay
```

**Request Body** -- `InitiatePaymentDto`

```json
{
  "providerAlias": "stripe",
  "methodAlias": "card",
  "savePaymentMethod": false
}
```

### Create Payment Session (Invoice)

```
POST /api/merchello/checkout/{invoiceId}/pay
```

Creates a payment session for a specific invoice (used after order creation).

### Process Payment

```
POST /api/merchello/checkout/process-payment
```

Processes a payment after client-side interaction (token submission, SDK confirmation).

### Process Direct Payment

```
POST /api/merchello/checkout/process-direct-payment
```

Processes a direct form payment (e.g., purchase order number).

### Process Saved Payment

```
POST /api/merchello/checkout/process-saved-payment
```

Pays using a saved payment method. Requires authentication.

### Handle Return

```
GET /api/merchello/checkout/return?{query}
```

Handles redirect returns from payment providers.

### Handle Cancel

```
GET /api/merchello/checkout/cancel?{query}
```

Handles payment cancellation redirects.

---

## Express Checkout

### Get Express Methods

```
GET /api/merchello/checkout/express-methods
```

Returns available express checkout methods (Apple Pay, Google Pay, PayPal).

### Get Express Config

```
GET /api/merchello/checkout/express-config
```

Returns SDK configuration for initializing express checkout buttons.

### Create Express Payment Intent

```
POST /api/merchello/checkout/express-payment-intent
```

Creates a payment intent for express checkout (e.g., Stripe Payment Request).

### Process Express Checkout

```
POST /api/merchello/checkout/express
```

Processes an express checkout payment (creates order + processes payment in one step).

### Create Widget Order

```
POST /api/merchello/checkout/{providerAlias}/create-order
```

Creates an order via a payment widget (e.g., PayPal Buttons).

### Capture Widget Order

```
POST /api/merchello/checkout/{providerAlias}/capture-order
```

Captures a widget order after customer approval.

### Apple Pay Merchant Validation (WorldPay)

```
POST /api/merchello/checkout/worldpay/apple-pay-validate
```

Validates the Apple Pay merchant session for WorldPay integration.

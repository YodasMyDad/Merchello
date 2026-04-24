# Express Checkout

Express checkout lets customers pay with Apple Pay, Google Pay, or PayPal in a single step -- no forms to fill out. The payment provider supplies both the payment authorization and the customer's shipping address, so the entire checkout can be completed with one tap.

**What it is:** A parallel checkout path that skips the information/shipping/payment steps. The wallet (Apple Pay, Google Pay) or SDK (PayPal Buttons, Braintree Drop-in) returns an authorized token plus customer + shipping data, and Merchello creates the order and captures the payment in one server call.

**Why it matters:** Expected on mobile. Express checkout methods live on payment providers that declare `IsExpressCheckout = true`; Merchello's job is to collect them, surface them in the checkout UI, and run the single-shot order creation.

**How it relates to other docs:**

- Payment providers that back express methods: [Payment Providers](../payments/payment-providers.md), [Payment System Overview](../payments/payment-system-overview.md).
- How selection keys and basket totals flow through: [Checkout Flow](checkout-flow.md), [Checkout Shipping](checkout-shipping.md).
- The underlying REST endpoints live on `CheckoutPaymentsApiController` — see [Checkout API Reference](checkout-api.md#express-checkout).

## How Express Checkout Works

Unlike standard checkout (where the customer fills in address, selects shipping, then pays), express checkout collapses everything into one interaction:

1. Customer taps the express checkout button (Apple Pay, Google Pay, or PayPal)
2. The payment sheet or wallet appears with their saved address and card
3. Customer authorizes the payment
4. Merchello receives both the payment token AND shipping details
5. An order is created and payment is processed in a single API call

---

## Supported Providers

Express checkout is supported by providers that declare express methods in their `GetAvailablePaymentMethods()`:

| Provider | Express Methods | Notes |
|----------|-----------------|-------|
| **Stripe** | Apple Pay, Google Pay | Via Stripe Payment Request Button |
| **PayPal** | PayPal Express | Via PayPal Buttons SDK |
| **Braintree** | Apple Pay, Google Pay, PayPal, Venmo | Via Braintree Web SDK |
| **WorldPay** | Apple Pay, Google Pay | Via WorldPay Checkout SDK |

> **Note:** Each method is declared with `IsExpressCheckout = true` in the provider's payment method definitions.

---

## Configuration

Express checkout is enabled per-provider. Each provider has its own requirements:

### Stripe (Apple Pay / Google Pay)

1. Configure Stripe with your API keys (see [Payment Providers](../payments/payment-providers.md))
2. Apple Pay requires domain verification in your Stripe Dashboard
3. Google Pay works automatically in supported browsers

### PayPal Express

1. Configure PayPal with your Client ID and Secret
2. PayPal Express is automatically available when the PayPal provider is enabled

### Braintree

1. Configure Braintree with your Merchant ID and API keys
2. Enable Apple Pay and Google Pay in your Braintree merchant settings
3. Apple Pay requires additional Apple developer setup

### WorldPay

1. Configure WorldPay with your API credentials
2. Provide your Apple Merchant ID and/or Google Merchant ID in the provider config
3. Apple Pay requires WorldPay-specific merchant validation

---

## API Endpoints

### Get Express Checkout Methods

Returns the express methods available for the current basket:

```
GET /api/merchello/checkout/express-methods
```

**Response** `200 OK` -- `ExpressCheckoutMethodDto[]`

```json
[
  {
    "providerAlias": "stripe",
    "methodAlias": "applepay",
    "displayName": "Apple Pay",
    "iconHtml": "<svg>...</svg>",
    "sdkUrl": "https://js.stripe.com/clover/stripe.js"
  }
]
```

### Get Express Checkout Config

Returns the SDK configuration needed to initialize express checkout buttons on the frontend:

```
GET /api/merchello/checkout/express-config
```

**Response** `200 OK` -- `ExpressCheckoutConfigDto`

```json
{
  "methods": [...],
  "amount": 99.99,
  "currency": "GBP",
  "country": "GB",
  "storeName": "My Store"
}
```

> **Tip:** The `MerchelloCheckoutController` pre-builds the express config server-side and includes it in the `CheckoutViewModel.ExpressCheckoutConfig` property. This avoids an extra API call on page load. The client falls back to the API endpoint if the server-side build fails.

### Create Express Payment Intent

For Stripe Payment Request, creates a PaymentIntent that the browser wallet uses:

```
POST /api/merchello/checkout/express-payment-intent
```

**Request Body** -- `ExpressPaymentIntentRequestDto`

```json
{
  "providerAlias": "stripe",
  "methodAlias": "applepay",
  "amount": 99.99,
  "currency": "GBP"
}
```

### Process Express Checkout

The main endpoint that processes the express payment and creates the order:

```
POST /api/merchello/checkout/express
```

**Request Body** -- `ExpressCheckoutRequestDto`

```json
{
  "providerAlias": "stripe",
  "methodAlias": "applepay",
  "paymentToken": "tok_...",
  "billingAddress": { ... },
  "shippingAddress": { ... },
  "email": "customer@example.com"
}
```

**Response** `200 OK` -- `ExpressCheckoutResponseDto`

```json
{
  "success": true,
  "invoiceId": "...",
  "confirmationUrl": "/checkout/confirmation/..."
}
```

---

## Widget-Based Express Checkout

Some providers (like PayPal) use a widget-based flow where the order is created and captured through the provider's own SDK:

### Create Widget Order

```
POST /api/merchello/checkout/{providerAlias}/create-order
```

Called when the customer clicks the PayPal button. Creates an order with the provider and returns an order ID for the widget to use.

### Capture Widget Order

```
POST /api/merchello/checkout/{providerAlias}/capture-order
```

Called after the customer approves the payment in the widget. Captures the payment and creates the Merchello order.

---

## Apple Pay Merchant Validation

Apple Pay requires server-side merchant validation. For WorldPay, there's a dedicated endpoint:

```
POST /api/merchello/checkout/worldpay/apple-pay-validate
```

**Request Body** -- `ApplePayValidationRequestDto`

```json
{
  "validationUrl": "https://apple-pay-gateway.apple.com/..."
}
```

This endpoint proxies the validation request through your server (required by Apple's security model -- the validation URL can't be called from the browser).

---

## Frontend Integration

Each provider supplies adapter scripts that handle the SDK integration. These are served from stable URLs:

```
/App_Plugins/Merchello/js/checkout/adapters/stripe-payment-adapter.js
/App_Plugins/Merchello/js/checkout/adapters/paypal-unified-adapter.js
/App_Plugins/Merchello/js/checkout/adapters/braintree-payment-adapter.js
/App_Plugins/Merchello/js/checkout/adapters/worldpay-express-adapter.js
```

The checkout view loads the appropriate adapter based on the express config returned by the API. The adapter handles:

1. Loading the provider's SDK
2. Rendering the express button
3. Handling the payment sheet interaction
4. Submitting the payment token to the Merchello API

> **Warning:** Do not change these script URLs. They are stable paths served from `Client/public/js/checkout/` and must remain accessible at the same location.

---

## Browser Compatibility

Express checkout availability depends on the customer's browser and device:

| Method | Requirements |
|--------|-------------|
| Apple Pay | Safari on iOS/macOS with a card in Apple Wallet |
| Google Pay | Chrome on Android or desktop with a saved card |
| PayPal | Any browser (opens PayPal login window) |
| Venmo | Mobile browsers (Braintree) |

The express checkout buttons only appear when the method is supported. The provider SDKs handle capability detection automatically.

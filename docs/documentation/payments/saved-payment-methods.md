# Saved Payment Methods (Vaulting)

Saved payment methods let customers store their card details for faster checkout on future orders. Merchello handles vaulting through the payment provider — card details are never stored in your database. Full service surface: [`ISavedPaymentMethodService.cs`](../../../src/Merchello.Core/Payments/Services/Interfaces/ISavedPaymentMethodService.cs). For a deeper dive into the design and payment-side wiring, see [VaultedPayments.md](../../VaultedPayments.md) in the repo root.

## How Vaulting Works

When a customer saves a payment method, the card details are stored securely at the payment provider (Stripe, Braintree, or PayPal). Merchello stores only a reference:

- Provider alias (e.g., "stripe")
- Card brand (e.g., "Visa")
- Last 4 digits (e.g., "4242")
- Expiry month/year
- Provider's token for charging

> **Note:** No sensitive card data (full card numbers, CVVs) is ever stored in the Merchello database.

---

## Supported Providers

| Provider | Vaulting | Provider Customer ID Required |
|----------|---------|-------------------------------|
| Stripe | Yes | Yes -- creates a Stripe Customer |
| PayPal | Yes | No -- uses vault tokens directly |
| Braintree | Yes | Yes -- creates a Braintree Customer |
| WorldPay | No | N/A |
| Amazon Pay | No | N/A |
| Manual | No | N/A |

To enable vaulting for a provider, toggle the **Enable Card Vaulting** option in the provider's backoffice configuration.

---

## Saving Methods During Checkout

The simplest way for customers to save a payment method is during checkout. When the customer opts in to "Save this card for future purchases", the method is saved after successful payment.

The checkout API handles this via `savePaymentMethod: true` in [`InitiatePaymentDto`](../../../src/Merchello.Core/Payments/Dtos/InitiatePaymentDto.cs) posted to `POST /api/merchello/checkout/pay`:

```json
{
  "providerAlias": "stripe",
  "methodAlias": "cards-elements",
  "returnUrl": "/checkout/return",
  "cancelUrl": "/checkout/cancel",
  "savePaymentMethod": true
}
```

After the payment succeeds, `ISavedPaymentMethodService.SaveFromCheckoutAsync()` stores the reference — the provider's vault token, card brand/last4/expiry, and `ConsentDateUtc` / `ConsentIpAddress`.

---

## Standalone Vault Setup

Customers can also save payment methods outside of checkout (e.g. from an account settings page). This uses a two-step setup flow exposed by [`StorefrontSavedPaymentMethodsController`](../../../src/Merchello/Controllers/StorefrontSavedPaymentMethodsController.cs).

### Step 1: Create Setup Session

```http
POST /api/merchello/storefront/payment-methods/setup
Content-Type: application/json
```

```json
{
  "providerAlias": "stripe",
  "methodAlias": "cards-elements",
  "returnUrl": "/account/payment-methods",
  "cancelUrl": "/account/payment-methods"
}
```

**Response ([`VaultSetupResponseDto`](../../../src/Merchello.Core/Payments/Dtos/VaultSetupResponseDto.cs)):**

```json
{
  "success": true,
  "setupSessionId": "seti_...",
  "clientSecret": "seti_..._secret_...",
  "redirectUrl": null,
  "providerCustomerId": "cus_...",
  "sdkConfig": { }
}
```

### Step 2: Confirm Setup

After the customer completes the SDK form (enters card, passes 3D Secure, etc.):

```http
POST /api/merchello/storefront/payment-methods/confirm
Content-Type: application/json
```

```json
{
  "providerAlias": "stripe",
  "setupSessionId": "seti_...",
  "paymentMethodToken": "pm_...",
  "providerCustomerId": "cus_...",
  "setAsDefault": true
}
```

**Response:**

```json
{
  "success": true,
  "paymentMethod": {
    "id": "...",
    "providerAlias": "stripe",
    "cardBrand": "Visa",
    "last4": "4242",
    "expiryFormatted": "12/28",
    "isDefault": true
  }
}
```

---

## Using Saved Methods at Checkout

When a logged-in customer reaches the payment step, the checkout API returns their saved methods alongside provider payment methods:

```http
GET /api/merchello/checkout/payment-options
```

Returns [`CheckoutPaymentOptionsDto`](../../../src/Merchello.Core/Checkout/Dtos/CheckoutPaymentOptionsDto.cs) — provider methods + saved methods + `CanSavePaymentMethods` flag.

To pay with a saved method, POST [`ProcessSavedPaymentMethodDto`](../../../src/Merchello.Core/Payments/Dtos/ProcessSavedPaymentMethodDto.cs):

```http
POST /api/merchello/checkout/process-saved-payment
Content-Type: application/json
```

```json
{
  "invoiceId": "7d2a...",
  "savedPaymentMethodId": "8e3c...",
  "idempotencyKey": "order-123-retry-1"
}
```

This charges the saved method off-session (no CVV required). The provider handles the charge using the stored token, and `Payment.IdempotencyKey` prevents duplicate charges if the client retries.

> **Note:** Saved payment requires authentication. The endpoint returns `401 Unauthorized` for anonymous users and enforces ownership — customers can only charge their own saved methods.

---

## Managing Saved Methods (Storefront API)

All storefront endpoints require authentication and only allow access to the current customer's methods.

### List Methods

```
GET /api/merchello/storefront/payment-methods
```

Returns all saved methods for the current customer:

```json
[
  {
    "id": "...",
    "providerAlias": "stripe",
    "methodType": "Card",
    "cardBrand": "Visa",
    "last4": "4242",
    "expiryFormatted": "12/28",
    "isExpired": false,
    "displayLabel": "Visa ending in 4242",
    "isDefault": true,
    "iconHtml": "<svg>...</svg>"
  }
]
```

### Set Default

```
POST /api/merchello/storefront/payment-methods/{id}/set-default
```

### Delete Method

```
DELETE /api/merchello/storefront/payment-methods/{id}
```

Removes the method from both the provider (Stripe/Braintree) and the Merchello database.

### Get Vault Providers

```
GET /api/merchello/storefront/payment-methods/providers
```

Returns providers that support vaulting and have it enabled.

---

## Managing Saved Methods (Backoffice API)

Staff can view and manage customer payment methods from the backoffice:

### List Customer Methods

```
GET /umbraco/api/v1/customers/{customerId}/saved-payment-methods
```

### View Method Detail

```
GET /umbraco/api/v1/saved-payment-methods/{id}
```

### Set Default

```
POST /umbraco/api/v1/saved-payment-methods/{id}/set-default
```

### Delete Method

```
DELETE /umbraco/api/v1/saved-payment-methods/{id}
```

---

## ISavedPaymentMethodService Reference

| Method | Purpose |
|--------|---------|
| `GetCustomerPaymentMethodsAsync(customerId)` | List all saved methods for a customer |
| `GetPaymentMethodAsync(id)` | Get a specific saved method |
| `GetDefaultPaymentMethodAsync(customerId)` | Get the customer's default method |
| `CreateSetupSessionAsync(params)` | Start a vault setup session |
| `ConfirmSetupAsync(params)` | Confirm and save a method |
| `SaveFromCheckoutAsync(params)` | Save a method after checkout payment |
| `SetDefaultAsync(id)` | Set a method as default |
| `DeleteAsync(id)` | Delete from provider and database |
| `ChargeAsync(params)` | Charge a saved method off-session |
| `GetOrCreateProviderCustomerIdAsync(customerId, alias)` | Get/create provider customer |

---

## Off-Session Charging

Saved methods can be charged off-session for scenarios like:

- Post-purchase upsells
- Repeat purchases
- Subscription renewals

`ChargeAsync` always attaches the charge to an **invoice** — create one first if the charge doesn't originate from an existing order. See [`ChargeSavedMethodParameters`](../../../src/Merchello.Core/Payments/Services/Parameters/ChargeSavedMethodParameters.cs):

```csharp
var result = await savedPaymentMethodService.ChargeAsync(
    new ChargeSavedMethodParameters
    {
        InvoiceId            = invoiceId,                // required - charge is recorded against an invoice
        SavedPaymentMethodId = methodId,                 // required
        Amount               = 29.99m,                   // null = charge the invoice balance due
        Description          = "Monthly subscription",
        IdempotencyKey       = "sub-2026-04-renewal-1"   // recommended for subscriptions
    },
    cancellationToken);
```

The currency comes from the invoice — the service does not take a `CurrencyCode`. Merchello validates the saved method is owned by the invoice's customer before charging.

---

## Security

- **Ownership checks** — Storefront endpoints verify the payment method belongs to the current customer; backoffice charges validate ownership against the invoice's customer.
- **Authentication required** — Storefront endpoints return `401` for unauthenticated requests.
- **Consent tracking** — `ConsentDateUtc` and `ConsentIpAddress` are recorded when a method is saved.
- **Expiry detection** — Methods are automatically flagged as expired based on `ExpiryMonth`/`ExpiryYear`.
- **Idempotency** — Pass an `IdempotencyKey` on saved-method charges and refunds to make retries safe (see [Payment System Overview](payment-system-overview.md#idempotency--dedupe-invariant)).

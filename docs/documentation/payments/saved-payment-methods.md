# Saved Payment Methods (Vaulting)

Saved payment methods let customers store their card details for faster checkout on future orders. Merchello handles vaulting through the payment provider -- card details are never stored in your database.

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

The simplest way for customers to save a payment method is during checkout. When the customer checks "Save this card for future purchases", the method is saved after successful payment.

The checkout API handles this via `savePaymentMethod: true` in the `InitiatePaymentDto`:

```json
{
  "providerAlias": "stripe",
  "methodAlias": "card",
  "savePaymentMethod": true
}
```

After the payment succeeds, `ISavedPaymentMethodService.SaveFromCheckoutAsync()` stores the reference.

---

## Standalone Vault Setup

Customers can also save payment methods outside of checkout (e.g., from their account settings page). This uses a two-step setup flow:

### Step 1: Create Setup Session

```
POST /api/merchello/storefront/payment-methods/setup
```

```json
{
  "providerAlias": "stripe",
  "methodAlias": "card",
  "returnUrl": "/account/payment-methods",
  "cancelUrl": "/account/payment-methods"
}
```

**Response:**

```json
{
  "success": true,
  "setupSessionId": "seti_...",
  "clientSecret": "seti_..._secret_...",
  "providerCustomerId": "cus_...",
  "sdkConfig": { ... }
}
```

### Step 2: Confirm Setup

After the customer completes the SDK form (enters their card, passes 3D Secure, etc.):

```
POST /api/merchello/storefront/payment-methods/confirm
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

When a logged-in customer reaches the payment step, the checkout API returns their saved methods in the payment options:

```
GET /api/merchello/checkout/payment-options
```

To pay with a saved method:

```
POST /api/merchello/checkout/process-saved-payment
```

```json
{
  "savedPaymentMethodId": "...",
  "invoiceId": "..."
}
```

This charges the saved method off-session (no CVV required). The provider handles the charge using the stored token.

> **Note:** Saved payment requires authentication. The endpoint returns `401 Unauthorized` for anonymous users.

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

```csharp
var result = await savedPaymentMethodService.ChargeAsync(
    new ChargeSavedMethodParameters
    {
        SavedPaymentMethodId = methodId,
        Amount = 29.99m,
        CurrencyCode = "GBP",
        Description = "Monthly subscription"
    },
    cancellationToken);
```

The charge is processed through the provider's `ChargeVaultedMethodAsync()` method. No customer interaction is needed.

---

## Security

- **Ownership checks**: All storefront endpoints verify the payment method belongs to the current customer
- **Authentication required**: Storefront endpoints return `401` for unauthenticated requests
- **Consent tracking**: The service records `ConsentDateUtc` and `ConsentIpAddress` when a method is saved
- **Expiry detection**: Methods are automatically flagged as expired based on `ExpiryMonth`/`ExpiryYear`

# Built-in Payment Providers

Merchello ships with six payment providers out of the box (including the built-in `Manual` provider). Each provider is a plugin discovered by the `ExtensionManager` — you configure them in the backoffice under **Settings > Payment Providers**. For an in-depth developer walkthrough including hosted fields, webhooks, vaulting, express checkout, and payment links, see the repo-root [PaymentProviders-DevGuide](https://github.com/YodasMyDad/Merchello/blob/main/docs/PaymentProviders-DevGuide.md). To build your own, see [Creating Payment Providers](../extending/creating-payment-providers.md).

> **Alias stability:** The `Alias` on a provider is permanent — it's used for webhook URLs, stored settings, and `Payment.PaymentProviderAlias`. Never change it after deployment.

---

## Provider Comparison

Capabilities below come directly from each provider's `PaymentProviderMetadata` (verified against source):

| Feature | Stripe | PayPal | Amazon Pay | Braintree | WorldPay | Manual |
|---------|--------|--------|------------|-----------|----------|--------|
| Credit/Debit Cards | Yes | No | No | Yes | Yes | No |
| PayPal | No | Yes | No | Yes | No | No |
| Apple Pay | Yes | No | No | Yes | Yes | No |
| Google Pay | Yes | No | No | Yes | Yes | No |
| Refunds | Yes | Yes | **No** | Yes | Yes | Yes (recording) |
| Partial Refunds | Yes | Yes | **No** | Yes | Yes | Yes (recording) |
| Auth & Capture | Yes | Yes | No | Yes | Yes | No |
| Webhooks | Required | Required | No | Required | Required | No |
| Payment Links | Yes | Yes | No | No | No | No |
| Saved Cards (Vaulting) | Yes | Yes | No | Yes | **No** | No |
| Purchase Orders | No | No | No | No | No | Yes |

---

## Stripe

**Alias:** `stripe`

Stripe is the most full-featured provider, supporting credit cards, Apple Pay, Google Pay, and more through Stripe's Payment Element or Card Elements.

### Integration Type

Stripe uses `HostedFields` integration -- the Stripe.js SDK renders payment fields as iframes directly in the checkout page. No redirect is needed.

### Configuration Fields

| Field | Description |
|-------|-------------|
| `secretKey` | Stripe Secret Key (`sk_test_*` or `sk_live_*`) |
| `publishableKey` | Stripe Publishable Key (`pk_test_*` or `pk_live_*`) |
| `webhookSecret` | Stripe Webhook Signing Secret (`whsec_*`) |

### Webhook Setup

1. In Stripe Dashboard, go to **Developers > Webhooks**
2. Add endpoint: `https://your-site.com/umbraco/merchello/webhooks/payments/stripe`
3. Subscribe to events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `charge.dispute.created`

### Payment Methods

Stripe exposes several method aliases — pick one in `InitiatePaymentDto.methodAlias` or let the checkout default apply:

| Alias | Integration | Notes |
|-------|-------------|-------|
| `cards` | Redirect | Stripe Checkout hosted page |
| `cards-elements` | HostedFields | Unified Payment Element (recommended inline card entry) |
| `cards-hosted` | HostedFields | Individual card number/expiry/CVC fields with per-field styling |
| `applepay` | Widget | Express checkout (requires domain verification in Stripe) |
| `googlepay` | Widget | Express checkout (works in Chrome/Android) |
| `link` | Widget | Link by Stripe |
| `amazonpay` | Widget | Amazon Pay via Stripe |

### Capabilities

- Full and partial refunds
- Authorization and capture
- Payment links (Stripe Checkout sessions)
- Saved card vaulting (requires Stripe Customer ID — `RequiresProviderCustomerId = true`)

---

## PayPal

**Alias:** `paypal`

PayPal supports standard PayPal Checkout and Pay Later options using the PayPal Server SDK (Orders V2 API).

### Integration Type

PayPal uses a widget-based flow -- the PayPal Buttons SDK renders in the checkout page. The customer approves the payment in a PayPal popup or redirect.

### Configuration Fields

| Field | Description |
|-------|-------------|
| `clientId` | PayPal Client ID |
| `clientSecret` | PayPal Client Secret |
| `webhookId` | PayPal Webhook ID (for signature verification) |

### Webhook Setup

1. In PayPal Developer Dashboard, go to **My Apps & Credentials**
2. Select your app and scroll to **Webhooks**
3. Add webhook URL: `https://your-site.com/umbraco/merchello/webhooks/payments/paypal`
4. Subscribe to events:
   - `CHECKOUT.ORDER.APPROVED`
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DENIED`
   - `PAYMENT.CAPTURE.REFUNDED`

### Payment Methods

| Alias | Name | Notes |
|-------|------|-------|
| `paypal` | PayPal | Standard PayPal Buttons |
| `paylater` | Pay Later | Installments / buy now pay later |

### Capabilities

- Full and partial refunds
- Authorization and capture
- Payment links
- Saved payment methods (vault tokens, no separate provider customer ID required)

---

## Amazon Pay

**Alias:** `amazonpay`

Amazon Pay lets customers pay using their Amazon account. It uses a redirect-based checkout session flow.

### Integration Type

Amazon Pay uses `Redirect` integration -- the customer is sent to Amazon's checkout page and redirected back after authorization.

### Configuration Fields

| Field | Description |
|-------|-------------|
| `publicKeyId` | Amazon Pay Public Key ID |
| `privateKey` | Amazon Pay Private Key (PEM format) |
| `storeId` | Amazon Pay Store ID |
| `region` | Region: `NA` (North America), `EU` (Europe), or `JP` (Japan) |

### Setup

1. Sign up at the Amazon Pay developer portal
2. Create a web store and generate API keys
3. Configure the allowed return URL: `https://your-site.com/checkout/return`

### Payment Methods

- **Amazon Pay** (`amazonpay`) — Pay with Amazon account

### Capabilities

- Basic payment processing (redirect-based)
- **No** refunds, webhooks, or vaulting — to refund an Amazon Pay order, process it in the Amazon Pay dashboard and record it in Merchello via the [manual refund flow](refunds.md#recording-a-manual-refund).

---

## Braintree

**Alias:** `braintree`

Braintree (a PayPal company) supports credit cards via Hosted Fields, PayPal, Apple Pay, Google Pay, Venmo, and European local payment methods (iDEAL, Bancontact, SEPA, EPS, P24).

### Integration Type

Braintree uses `HostedFields` integration with multiple SDK components loaded dynamically based on the payment method.

### Configuration Fields

| Field | Description |
|-------|-------------|
| `merchantId` | Braintree Merchant ID |
| `publicKey` | Braintree Public Key |
| `privateKey` | Braintree Private Key |
| `merchantAccountId` | (Optional) Merchant Account ID for multi-currency |

### Webhook Setup

1. In Braintree Control Panel, go to **Settings > Webhooks**
2. Add URL: `https://your-site.com/umbraco/merchello/webhooks/payments/braintree`
3. Subscribe to events:
   - `TransactionSettled`
   - `TransactionSettlementDeclined`
   - `DisputeOpened`

### Payment Methods

| Alias | Name |
|-------|------|
| `cards` | Credit/debit cards (Hosted Fields) |
| `paypal` | PayPal via Braintree |
| `applepay` | Apple Pay (requires Apple developer setup) |
| `googlepay` | Google Pay |
| `venmo` | Venmo |
| `ideal` | iDEAL |
| `bancontact` | Bancontact |
| `sepa` | SEPA Direct Debit |
| `eps` | eps |
| `p24` | Przelewy24 |

### Capabilities

- Full and partial refunds
- Authorization and capture
- Saved card vaulting (requires Braintree Customer ID)

---

## WorldPay

**Alias:** `worldpay`

WorldPay (Access Worldpay platform) supports credit cards with 3D Secure via the Checkout SDK, plus Apple Pay and Google Pay.

### Integration Type

WorldPay uses `HostedFields` integration -- the Access Checkout SDK renders card fields in the checkout page with built-in 3D Secure support.

### Configuration Fields

| Field | Description |
|-------|-------------|
| `serviceKey` | Basic Auth username (from Implementation Manager) |
| `clientKey` | Basic Auth password (from Implementation Manager) |
| `merchantEntity` | Entity for billing/reporting |
| `appleMerchantId` | (Optional) Apple Pay Merchant ID |
| `googleMerchantId` | (Optional) Google Pay Merchant ID |

### Webhook Setup

1. Contact your WorldPay Implementation Manager for webhook configuration
2. Endpoint: `https://your-site.com/umbraco/merchello/webhooks/payments/worldpay`
3. Required events: `authorized`, `sentForSettlement`, `refused`, `refundFailed`

### Payment Methods

| Alias | Name | Notes |
|-------|------|-------|
| `cards` | Credit/debit cards | Access Checkout SDK with 3D Secure |
| `applepay` | Apple Pay | Uses the dedicated `/api/merchello/checkout/worldpay/apple-pay-validate` merchant validation endpoint |
| `googlepay` | Google Pay | Loads Google's pay SDK |

### Capabilities

- Full and partial refunds
- Authorization and capture
- No vaulting (not supported by this provider)

---

## Manual Payment

**Provider alias:** `manual` (see [`ManualPaymentProvider.cs`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Payments/Providers/BuiltIn/ManualPaymentProvider.cs))

The Manual Payment provider handles offline payments and purchase orders. It's automatically enabled on install — no configuration needed.

### Payment Methods

| Alias | Name | Checkout visibility | Use cases |
|-------|------|---------------------|-----------|
| `manual` | Manual Payment | Hidden (`ShowInCheckoutByDefault = false`) — backoffice only | Cash in-store, cheque payments (with cheque number), bank transfers / wire transfers |
| `purchaseorder` | Purchase Order | Shown at checkout (`DirectForm` with a PO number field) | B2B orders with PO numbers, net terms for established accounts, government/education |

Form field data is persisted on the resulting `Payment.ProviderData` — the Purchase Order method also saves the PO number onto `Invoice.PurchaseOrder` and adds a note.

### Capabilities

- Full and partial refund recording (for accounting purposes — no gateway call)
- No auth/capture (payment is either recorded after the fact or deferred externally)
- No webhooks or vaulting

---

## Creating a Custom Provider

To add your own payment provider, extend `PaymentProviderBase`:

```csharp
public class MyGatewayProvider : PaymentProviderBase
{
    public override PaymentProviderMetadata Metadata => new()
    {
        Alias = "mygateway",
        DisplayName = "My Gateway",
        Description = "Accept payments via My Gateway",
        SupportsRefunds = true
    };

    public override IReadOnlyList<PaymentMethodDefinition>
        GetAvailablePaymentMethods() => [
        new PaymentMethodDefinition
        {
            Alias = "card",
            DisplayName = "Credit Card",
            IntegrationType = PaymentIntegrationType.Redirect
        }
    ];

    public override async Task<PaymentSessionResult>
        CreatePaymentSessionAsync(PaymentRequest request, CancellationToken ct)
    {
        // Create session with your gateway
        // Return redirect URL, client secret, etc.
    }

    public override async Task<PaymentResult>
        ProcessPaymentAsync(ProcessPaymentRequest request, CancellationToken ct)
    {
        // Verify payment with your gateway
        // Return success/failure
    }
}
```

The provider is automatically discovered by `ExtensionManager` and appears in the backoffice for configuration.

# Built-in Payment Providers

Merchello ships with six payment providers out of the box. Each provider is a plugin discovered by the `ExtensionManager` -- you configure them in the backoffice under **Settings > Payment Providers**.

---

## Provider Comparison

| Feature | Stripe | PayPal | Amazon Pay | Braintree | WorldPay | Manual |
|---------|--------|--------|------------|-----------|----------|--------|
| Credit/Debit Cards | Yes | No | No | Yes | Yes | No |
| PayPal | No | Yes | No | Yes | No | No |
| Apple Pay | Yes | No | No | Yes | Yes | No |
| Google Pay | Yes | No | No | Yes | Yes | No |
| Refunds | Yes | Yes | No | Yes | Yes | Yes |
| Partial Refunds | Yes | Yes | No | Yes | Yes | Yes |
| Auth & Capture | Yes | Yes | No | Yes | Yes | No |
| Webhooks | Required | Required | No | Required | Required | No |
| Payment Links | Yes | Yes | No | No | No | No |
| Saved Cards (Vaulting) | Yes | Yes | No | Yes | No | No |
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

- **Card** -- Credit/debit cards via Payment Element (unified) or Card Elements (individual fields)
- **Apple Pay** -- Express checkout (requires domain verification in Stripe Dashboard)
- **Google Pay** -- Express checkout (works automatically in Chrome)

### Capabilities

- Full and partial refunds
- Authorization and capture
- Payment links (Stripe Checkout sessions)
- Saved card vaulting (requires Stripe Customer ID)

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

- **PayPal** -- Standard PayPal checkout
- **Pay Later** -- PayPal's installment payment option
- **PayPal Express** -- Express checkout from the cart page

### Capabilities

- Full and partial refunds
- Authorization and capture
- Payment links
- Saved payment methods (vault tokens)

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

- **Amazon Pay** -- Pay with Amazon account

### Capabilities

- Basic payment processing
- No refunds, webhooks, or vaulting (use Amazon Pay dashboard for refunds)

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

- **Card** -- Credit/debit cards via Hosted Fields
- **PayPal** -- Via Braintree's PayPal integration
- **Apple Pay** -- Express checkout (requires Apple developer setup)
- **Google Pay** -- Express checkout
- **Venmo** -- Mobile payments
- **Local Payments** -- iDEAL, Bancontact, SEPA, EPS, P24

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

- **Card** -- Credit/debit cards with 3D Secure
- **Apple Pay** -- Express checkout (requires merchant validation endpoint)
- **Google Pay** -- Express checkout

### Capabilities

- Full and partial refunds
- Authorization and capture
- Apple Pay merchant validation (dedicated endpoint)

---

## Manual Payment

**Alias:** `manual`

The Manual Payment provider handles offline payments and purchase orders. It's automatically enabled -- no configuration needed.

### Payment Methods

#### Manual Payment (Backoffice Only)

Record offline payments from the order detail screen. This method is **hidden from the checkout** (`ShowInCheckoutByDefault = false`).

Use cases:
- Cash payments received in-store
- Check payments (record check numbers)
- Bank transfers / wire transfers

#### Purchase Order (Checkout)

Allows business customers to complete checkout using a purchase order number. Uses `DirectForm` integration -- a simple text input.

Use cases:
- B2B orders with purchase order numbers
- Net terms for established customers
- Government/education institutions

### Capabilities

- Full and partial refund recording (for accounting purposes)
- No auth/capture (payment is immediate or deferred externally)

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

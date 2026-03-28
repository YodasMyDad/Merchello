# Payment System Overview

Merchello's payment system is built around a provider-based architecture. Payment providers (Stripe, PayPal, etc.) are plugins that handle the specifics of each payment gateway, while `IPaymentService` orchestrates the business logic.

## Key Concepts

### Payment Providers

A payment provider represents a payment gateway (Stripe, PayPal, Braintree, etc.). Each provider:

- Declares its **capabilities** (refunds, partial refunds, auth/capture, vaulting, payment links)
- Offers one or more **payment methods** (card, PayPal, Apple Pay, Google Pay, etc.)
- Handles **payment sessions**, **processing**, **refunds**, and **webhooks**

Providers implement `IPaymentProvider` (or extend `PaymentProviderBase` for sensible defaults) and are discovered automatically by the `ExtensionManager`.

### Payment Methods

A payment method is a specific way to pay within a provider. For example, the Stripe provider offers:

- Credit/Debit Card (via Payment Element or Card Elements)
- Apple Pay (express checkout)
- Google Pay (express checkout)

Each method has an `IntegrationType` that determines how the frontend renders it:

| Integration Type | Frontend Behavior |
|-----------------|-------------------|
| `Redirect` | Customer is redirected to the provider's hosted page |
| `HostedFields` | Provider's iframe fields render on the checkout page (e.g., Stripe Elements) |
| `Widget` | Provider's embedded UI component loads on the checkout page (e.g., PayPal Buttons) |
| `DirectForm` | Simple form fields rendered by the checkout (e.g., PO number) |

### Payment Sessions

A payment session represents a single payment attempt. When a customer clicks "Pay", the system:

1. Creates an invoice from the basket (if not already created)
2. Calls the provider's `CreatePaymentSessionAsync()` to get frontend configuration
3. Returns SDK config, redirect URL, or form fields to the frontend
4. The frontend renders the payment UI based on the integration type
5. After customer interaction, `ProcessPaymentAsync()` records the result

---

## Payment Flow

Here's the standard payment flow from checkout to completed order:

```
Customer clicks "Pay"
    |
    v
Checkout API: InitiatePayment
    |-- Creates invoice from basket
    |-- Calls provider.CreatePaymentSessionAsync()
    |-- Returns: { clientSecret, sdkConfig, redirectUrl }
    |
    v
Frontend: Renders payment UI
    |-- Redirect: window.location = redirectUrl
    |-- HostedFields: stripe.confirmPayment(clientSecret)
    |-- DirectForm: submit PO number
    |
    v
Checkout API: ProcessPayment (or HandleReturn for redirects)
    |-- Calls provider.ProcessPaymentAsync()
    |-- Records payment in database
    |-- Updates invoice payment status
    |-- Fires PaymentCreatedNotification
    |
    v
Redirect to /checkout/confirmation/{invoiceId}
```

---

## Payment Status

Payment status is calculated centrally by `IPaymentService.CalculatePaymentStatus()`. This is the single source of truth -- never calculate payment status yourself.

The method returns `PaymentStatusDetails` which includes:

| Property | Description |
|----------|-------------|
| `Status` | `Unpaid`, `AwaitingPayment`, `PartiallyPaid`, `Paid`, `PartiallyRefunded`, `Refunded` |
| `TotalPaid` | Sum of all positive payments |
| `TotalRefunded` | Sum of all refunds (positive number) |
| `BalanceDue` | Remaining amount to pay (clamped to 0) |
| `CreditDue` | Overpayment amount |

```csharp
// Calculate payment status for an invoice
var details = paymentService.CalculatePaymentStatus(
    new CalculatePaymentStatusParameters
    {
        Payments = payments,
        InvoiceTotal = invoice.Total,
        CurrencyCode = invoice.CurrencyCode,
        InvoiceTotalInStoreCurrency = invoice.TotalInStoreCurrency,
        StoreCurrencyCode = invoice.StoreCurrencyCode
    });
```

> **Warning:** `CalculatePaymentStatus` is synchronous (not async). This is intentional -- it operates on in-memory payment data only.

---

## Idempotency

Merchello uses two mechanisms to prevent duplicate payments:

### Idempotency Keys

Each payment attempt generates an `IdempotencyKey`. If a duplicate request arrives with the same key, the original payment is returned instead of creating a new one. This prevents double-charges from network retries or webhook race conditions.

### Webhook Event IDs

Webhook handlers store the `WebhookEventId` from the provider. Before processing a webhook, the system checks if that event ID has already been processed. This prevents duplicate payment recording when providers retry webhook delivery.

---

## IPaymentService Reference

The payment service provides all payment operations:

### Payment Processing

| Method | Purpose |
|--------|---------|
| `CreatePaymentSessionAsync(params)` | Create a session with the provider |
| `ProcessPaymentAsync(request)` | Process payment after client interaction |
| `RecordPaymentAsync(params)` | Record a payment (from webhook or return URL) |

### Refunds

| Method | Purpose |
|--------|---------|
| `ProcessRefundAsync(params)` | Process a refund through the provider |
| `PreviewRefundAsync(params)` | Preview refund calculation without processing |
| `RecordManualRefundAsync(params)` | Record a manual/external refund |

### Queries

| Method | Purpose |
|--------|---------|
| `GetPaymentsForInvoiceAsync(invoiceId)` | Get all payments for an invoice |
| `GetPaymentAsync(paymentId)` | Get a specific payment |
| `GetPaymentByTransactionIdAsync(txnId)` | Find payment by provider transaction ID |
| `GetInvoicePaymentStatusAsync(invoiceId)` | Get calculated payment status |
| `CalculatePaymentStatus(params)` | Calculate status from loaded payments (sync) |

### Manual / Backoffice

| Method | Purpose |
|--------|---------|
| `RecordManualPaymentAsync(params)` | Record cash, check, or bank transfer |
| `BatchMarkAsPaidAsync(params)` | Mark multiple invoices as paid at once |

---

## Provider Interface

Payment providers implement `IPaymentProvider`. Here are the required and optional methods:

### Required (must implement)

| Method | Purpose |
|--------|---------|
| `Metadata` | Provider name, alias, capabilities |
| `GetAvailablePaymentMethods()` | Declare supported payment methods |
| `CreatePaymentSessionAsync(request)` | Create payment session with SDK config |
| `ProcessPaymentAsync(request)` | Process the payment result |

### Optional (have working defaults in PaymentProviderBase)

| Method | Default | Purpose |
|--------|---------|---------|
| `GetConfigurationFieldsAsync()` | Empty list | Configuration UI fields |
| `ConfigureAsync(config)` | Stores config | Apply saved configuration |
| `RefundPaymentAsync(request)` | "Not supported" | Process refunds |
| `CapturePaymentAsync(txnId, amount)` | "Not supported" | Capture authorized payment |
| `ValidateWebhookAsync(payload, headers)` | `false` | Validate webhook signature |
| `ProcessWebhookAsync(payload, headers)` | "Not supported" | Process webhook payload |
| `CreatePaymentLinkAsync(request)` | "Not supported" | Generate shareable payment link |
| `CreateVaultSetupSessionAsync(request)` | "Not supported" | Set up saved payment method |

---

## Webhooks

Payment providers that use webhooks have a dedicated endpoint:

```
/umbraco/merchello/webhooks/payments/{providerAlias}
```

The webhook flow:

1. Provider sends webhook to the endpoint
2. System calls `provider.ValidateWebhookAsync()` to verify the signature
3. System calls `provider.ProcessWebhookAsync()` to handle the event
4. Duplicate webhooks are detected via `WebhookEventId`
5. Payment is recorded or updated based on the webhook event type

> **Tip:** Each provider documents its required webhook events in the `SetupInstructions` on its metadata. Check [Payment Providers](payment-providers.md) for provider-specific webhook setup.

---

## Multi-Currency Payments

When a store uses multiple currencies:

- The invoice stores amounts in **both** the presentment currency (what the customer sees) and the store currency (for accounting)
- Exchange rate, rate source, and timestamp are captured at invoice creation for audit
- Payment status calculations support multi-currency via `InvoiceTotalInStoreCurrency` and `StoreCurrencyCode` parameters

> **Warning:** Never charge from display amounts. Always use the invoice conversion path. Display currency is for showing prices to customers; the invoice currency is what gets charged.

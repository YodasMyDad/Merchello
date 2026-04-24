# Payment System Overview

Merchello's payment system is built around a provider-based architecture. Payment providers (Stripe, PayPal, etc.) are plugins that handle the specifics of each payment gateway, while [`IPaymentService`](../../../src/Merchello.Core/Payments/Services/Interfaces/IPaymentService.cs) owns the payment lifecycle — recording payments, dedupe, refunds, and status.

> **Single source of truth:** Never recompute payment status, refund totals, or balance-due in controllers, views, or JS. Call [`IPaymentService.CalculatePaymentStatus`](../../../src/Merchello.Core/Payments/Services/Interfaces/IPaymentService.cs#L114) (sync, on already-loaded payments) or `GetInvoicePaymentStatusAsync` (async, fetches payments for you). See [Architecture Diagrams §2.6 Payments](https://github.com/YodasMyDad/Merchello/blob/main/docs/Architecture-Diagrams.md).

## Key Concepts

### Payment Providers

A payment provider represents a payment gateway (Stripe, PayPal, Braintree, etc.). Each provider:

- Declares its **capabilities** (refunds, partial refunds, auth/capture, vaulting, payment links)
- Offers one or more **payment methods** (card, PayPal, Apple Pay, Google Pay, etc.)
- Handles **payment sessions**, **processing**, **refunds**, and **webhooks**

Providers implement [`IPaymentProvider`](../../../src/Merchello.Core/Payments/Providers/Interfaces/IPaymentProvider.cs) (or extend `PaymentProviderBase` for sensible defaults) and are discovered automatically by the `ExtensionManager`. See [Creating Payment Providers](../extending/creating-payment-providers.md) for a full walkthrough.

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

1. Creates an invoice from the basket (if not already created). The invoice captures the exchange rate snapshot (`PricingExchangeRate`, `PricingExchangeRateSource`, `PricingExchangeRateTimestampUtc`) for multi-currency audit — see [Multi-Currency Overview](../multi-currency/multi-currency-overview.md).
2. Calls the provider's `CreatePaymentSessionAsync()` to get frontend configuration
3. Returns SDK config, redirect URL, or form fields to the frontend
4. The frontend renders the payment UI based on the integration type
5. After customer interaction, `ProcessPaymentAsync()` records the result

---

## Payment Flow

Here is the standard payment flow from checkout to completed order. Storefront endpoints live under `/api/merchello/checkout/*` (see [Checkout API](../checkout/checkout-api.md)), implemented in [`CheckoutPaymentsApiController.cs`](../../../src/Merchello/Controllers/CheckoutPaymentsApiController.cs):

```text
Customer clicks "Pay"
    |
    v
POST /api/merchello/checkout/pay  (InitiatePaymentDto)
    |-- CheckoutPaymentsOrchestrationService creates or reuses the invoice
    |-- Invoice locks PricingExchangeRate + source + timestamp
    |-- Calls IPaymentService.CreatePaymentSessionAsync -> provider.CreatePaymentSessionAsync
    |-- Returns PaymentSessionResultDto { integrationType, clientSecret, sdkConfig, redirectUrl, formFields }
    |
    v
Frontend renders payment UI (per integrationType)
    |-- Redirect     : window.location = redirectUrl
    |-- HostedFields : provider SDK confirms with clientSecret
    |-- Widget       : provider Buttons/Widget captures
    |-- DirectForm   : user fills fields (e.g. PO number)
    |
    v
POST /api/merchello/checkout/process-payment (or GET /checkout/return for redirect flows)
    |-- provider.ProcessPaymentAsync or webhook confirms the charge
    |-- IPaymentService records the Payment row
    |   * Payment.IdempotencyKey -> dedupes retries
    |   * Payment.WebhookEventId -> dedupes provider retries
    |-- Invoice payment status recomputed via CalculatePaymentStatus
    |-- PaymentCreatedNotification fires (see notifications below)
    |
    v
Redirect to /checkout/confirmation/{invoiceId}
```

> **Digital-only invoices** auto-complete after a successful payment — the `DigitalProductPaymentHandler` (subscribed to `PaymentCreatedNotification`) issues download tokens and marks the order complete. See [Digital Products](../products/digital-products.md) and [Architecture Diagrams §2.12](https://github.com/YodasMyDad/Merchello/blob/main/docs/Architecture-Diagrams.md).

---

## Payment Status

Payment status is calculated centrally by [`IPaymentService.CalculatePaymentStatus`](../../../src/Merchello.Core/Payments/Services/Interfaces/IPaymentService.cs#L114). This is the single source of truth — never recompute it in controllers, views, or JS.

The method returns [`PaymentStatusDetails`](../../../src/Merchello.Core/Payments/Models/PaymentStatusDetails.cs):

| Property | Description |
|----------|-------------|
| `Status` | `Unpaid`, `AwaitingPayment`, `PartiallyPaid`, `Paid`, `PartiallyRefunded`, `Refunded` (see [`InvoicePaymentStatus`](../../../src/Merchello.Core/Payments/Models/InvoicePaymentStatus.cs)) |
| `StatusDisplay` | Human-readable label (`"Partially Refunded"`, etc.) |
| `TotalPaid` / `TotalPaidInStoreCurrency` | Sum of successful `PaymentType.Payment` rows |
| `TotalRefunded` / `TotalRefundedInStoreCurrency` | Sum of refund rows (positive numbers) |
| `NetPayment` / `NetPaymentInStoreCurrency` | `TotalPaid - TotalRefunded` |
| `BalanceDue` / `BalanceDueInStoreCurrency` | Remaining amount to pay (clamped to 0) |
| `CreditDue` / `CreditDueInStoreCurrency` | Overpayment that should be refunded |
| `MaxRiskScore`, `MaxRiskScoreSource`, `RiskLevel` | Max fraud/risk across payments (`high`/`medium`/`low`/`minimal`) |

```csharp
// Already have the payments loaded? Use the sync version:
var details = paymentService.CalculatePaymentStatus(new CalculatePaymentStatusParameters
{
    Payments = payments,
    InvoiceTotal = invoice.Total,
    CurrencyCode = invoice.CurrencyCode,
    // Multi-currency: pass store-currency fields too so balances are accurate
    InvoiceTotalInStoreCurrency = invoice.TotalInStoreCurrency,
    StoreCurrencyCode = invoice.StoreCurrencyCode
});

// Don't have them? Let the service fetch + calculate:
var status = await paymentService.GetInvoicePaymentStatusAsync(invoiceId, ct);
```

> **Warning:** `CalculatePaymentStatus` is intentionally synchronous — it operates on in-memory payments only. Use `GetInvoicePaymentStatusAsync` when you need the service to load payments for you.

---

## Idempotency & Dedupe (Invariant)

`Payment.IdempotencyKey` and `Payment.WebhookEventId` are how Merchello prevents double-charges. Both fields live on the [`Payment`](../../../src/Merchello.Core/Accounting/Models/Payment.cs) record and **must be preserved** by every flow that records or updates a payment.

### Idempotency keys

Every payment-creating operation accepts an optional `IdempotencyKey`. If a second request arrives with the same key, the service short-circuits and returns the original payment instead of charging again. Pass one for:

- Saved-method charges — `ProcessSavedPaymentMethodDto.IdempotencyKey` and `ChargeSavedMethodParameters.IdempotencyKey`
- Refunds — `ProcessRefundParameters.IdempotencyKey`
- Any retry-prone integration that can re-issue the same logical request

### Webhook event IDs

Provider webhooks store the event ID on `Payment.WebhookEventId`. Before processing, the webhook pipeline checks whether that event has already been recorded for this provider, so Stripe/PayPal/Braintree retries do not create duplicate payments. Custom provider webhook handlers must populate this field — see [Creating Payment Providers](../extending/creating-payment-providers.md).

---

## IPaymentService Reference

Full interface: [`IPaymentService.cs`](../../../src/Merchello.Core/Payments/Services/Interfaces/IPaymentService.cs).

### Payment processing

| Method | Purpose |
|--------|---------|
| `CreatePaymentSessionAsync(CreatePaymentSessionParameters)` | Create a session with the provider |
| `ProcessPaymentAsync(ProcessPaymentRequest)` | Process payment after client interaction |
| `RecordPaymentAsync(RecordPaymentParameters)` | Record a payment (from webhook or return URL) |

### Refunds

| Method | Purpose |
|--------|---------|
| `ProcessRefundAsync(ProcessRefundParameters)` | Process a refund through the provider |
| `PreviewRefundAsync(PreviewRefundParameters)` | Preview refund calculation without processing |
| `RecordManualRefundAsync(RecordManualRefundParameters)` | Record a refund processed externally |

### Queries

| Method | Purpose |
|--------|---------|
| `GetPaymentsForInvoiceAsync(invoiceId)` | Get all payments (and nested refunds) for an invoice |
| `GetPaymentAsync(paymentId)` | Get a specific payment |
| `GetPaymentByTransactionIdAsync(txnId)` | Find payment by provider transaction ID |
| `GetInvoicePaymentStatusAsync(invoiceId)` | Load payments and return `InvoicePaymentStatus` |
| `CalculatePaymentStatus(CalculatePaymentStatusParameters)` | Sync status calculation from already-loaded payments |

### Manual / backoffice

| Method | Purpose |
|--------|---------|
| `RecordManualPaymentAsync(RecordManualPaymentParameters)` | Record cash, cheque, or bank transfer |
| `BatchMarkAsPaidAsync(BatchMarkAsPaidParameters)` | Mark multiple invoices as paid in one call (see [Manual Orders](../orders/manual-orders.md)) |

---

## Notifications

Payment events dispatch notifications that email, webhook, and custom handlers subscribe to. See [Architecture Diagrams §8](https://github.com/YodasMyDad/Merchello/blob/main/docs/Architecture-Diagrams.md) for the full handler priority ordering.

| Notification | Fired when | Handlers include |
|--------------|------------|------------------|
| `PaymentCreatedNotification` | A successful payment is recorded | Digital download issuance, fulfilment release (`OnPaid`), invoice.paid webhook, confirmation emails |
| `PaymentRefundedNotification` | A refund is processed or recorded | invoice.refunded webhook, refund email |

Handlers with lower `[NotificationHandlerPriority(N)]` run first. Custom handlers must catch and log — never rethrow — so downstream notifications (emails, webhooks) still fire.

## Provider Interface

Payment providers implement [`IPaymentProvider`](../../../src/Merchello.Core/Payments/Providers/Interfaces/IPaymentProvider.cs). Here are the required and optional methods:

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

Payment providers that use webhooks have a dedicated endpoint handled by [`PaymentWebhookController.cs`](../../../src/Merchello/Controllers/PaymentWebhookController.cs):

```text
POST /umbraco/merchello/webhooks/payments/{providerAlias}
```

The webhook flow:

1. Provider POSTs the webhook to the endpoint
2. System calls `provider.ValidateWebhookAsync()` to verify the signature (fails closed — default returns `false`)
3. System calls `provider.ProcessWebhookAsync()` to handle the event
4. Duplicate webhooks are detected via `Payment.WebhookEventId`
5. Payment is recorded or updated based on the webhook event type

> **Tip:** Each provider documents its required webhook events in the `SetupInstructions` on its metadata. See [Payment Providers](payment-providers.md) for provider-specific setup and [Webhook API](../api/webhook-api.md) for the incoming webhook contract.

---

## Multi-Currency Payments (Invariant)

See [Multi-Currency Overview](../multi-currency/multi-currency-overview.md) for the full model. Payment-specific rules:

- The invoice stores amounts in **both** the presentment currency (what the customer sees) and the store currency (for accounting).
- Exchange rate, rate source, and timestamp are **locked at invoice creation** — `PricingExchangeRate`, `PricingExchangeRateSource`, `PricingExchangeRateTimestampUtc`. Edits and subsequent charges use this locked rate; they never refetch market rates.
- The rate is stored as presentment-to-store (e.g. `1.25` means `1 GBP = 1.25 USD`). Display multiplies (`amount * rate`); checkout/payment divides (`amount / rate`).
- `CalculatePaymentStatus` accepts `InvoiceTotalInStoreCurrency` + `StoreCurrencyCode`. Pass both whenever you have them so store-currency totals, refunds, and balances stay coherent.
- Providers may report a settlement currency (e.g. Stripe converting GBP to USD on deposit). Those values land on `Payment.SettlementCurrencyCode`, `SettlementAmount`, `SettlementExchangeRate`, `SettlementExchangeRateSource` — they are informational and never drive balance math.

> **Warning:** Never charge from display amounts. Always charge the invoice amount (store currency divided by the locked `PricingExchangeRate` when needed). Display currency is only for showing prices to the customer; the invoice is the contract.

---

## Related

- [Payment Providers](payment-providers.md) — per-provider capabilities and setup
- [Refunds](refunds.md) — provider refunds, manual refunds, preview
- [Saved Payment Methods](saved-payment-methods.md) — vaulting and off-session charging
- [Payment Links & Invoice Reminders](payment-links.md) — admin-generated pay URLs and automated follow-ups
- [Orders Overview](../orders/orders-overview.md) — how payments attach to invoices and orders
- [Checkout API](../checkout/checkout-api.md) — the storefront endpoints that drive payment sessions
- [Webhook API](../api/webhook-api.md) — incoming provider webhooks
- [Creating Payment Providers](../extending/creating-payment-providers.md) and the [PaymentProviders DevGuide](../../PaymentProviders-DevGuide.md)

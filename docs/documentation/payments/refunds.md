# Refunds

Merchello supports processing refunds through payment providers, recording manual refunds, and previewing refund calculations before committing.

## Refund Types

### Provider Refund

A refund processed through the payment provider (e.g., Stripe, PayPal). The provider reverses the charge and Merchello records the refund.

### Manual Refund

A refund recorded in Merchello when the actual refund was processed outside the system (e.g., refunded directly in the Stripe Dashboard, cash refund in-store). This keeps the accounting records accurate without double-processing.

---

## Processing a Provider Refund

To refund through the payment provider:

```csharp
var result = await paymentService.ProcessRefundAsync(
    new ProcessRefundParameters
    {
        PaymentId = originalPaymentId,
        Amount = 25.00m,           // null for full refund
        Reason = "Customer return"
    },
    cancellationToken);
```

The flow:

1. `IPaymentService` looks up the original payment and its provider
2. Calls `provider.RefundPaymentAsync()` which processes the refund with the gateway
3. Creates a refund `Payment` record (with negative amount)
4. Updates the invoice's payment status via `CalculatePaymentStatus()`
5. Fires a `PaymentRefundedNotification`

### Full Refunds

When `Amount` is null, the full payment amount is refunded:

```csharp
var result = await paymentService.ProcessRefundAsync(
    new ProcessRefundParameters
    {
        PaymentId = originalPaymentId,
        Amount = null,  // Full refund
        Reason = "Order cancelled"
    },
    cancellationToken);
```

### Partial Refunds

Specify an amount less than the original payment for a partial refund:

```csharp
var result = await paymentService.ProcessRefundAsync(
    new ProcessRefundParameters
    {
        PaymentId = originalPaymentId,
        Amount = 15.00m,  // Partial refund
        Reason = "One item returned"
    },
    cancellationToken);
```

You can issue multiple partial refunds against the same payment, as long as the total doesn't exceed the original payment amount.

> **Note:** Not all providers support partial refunds. Check `Metadata.SupportsPartialRefunds` on the provider.

---

## Preview Before Refunding

Before processing a refund, you can preview the calculation to show the customer or staff member what will happen:

```csharp
var preview = await paymentService.PreviewRefundAsync(
    new PreviewRefundParameters
    {
        PaymentId = originalPaymentId,
        Amount = 25.00m
    },
    cancellationToken);
```

The preview returns a `RefundPreviewDto` with:

| Property | Description |
|----------|-------------|
| `RefundAmount` | The amount that will be refunded |
| `OriginalPaymentAmount` | The original payment amount |
| `AlreadyRefunded` | Total already refunded for this payment |
| `RemainingRefundable` | Maximum amount still refundable |
| `ProviderSupportsRefund` | Whether the provider can process this refund |

> **Tip:** Always show a preview to staff before processing refunds. It helps prevent accidental over-refunding.

---

## Recording a Manual Refund

When a refund is processed outside Merchello (directly in the provider dashboard, cash refund, etc.), record it for accounting:

```csharp
var result = await paymentService.RecordManualRefundAsync(
    new RecordManualRefundParameters
    {
        InvoiceId = invoiceId,
        Amount = 50.00m,
        Reason = "Refunded via Stripe Dashboard",
        TransactionId = "re_abc123"  // Optional provider reference
    },
    cancellationToken);
```

This creates a refund record without calling the payment provider. The invoice's payment status is updated accordingly.

---

## Backoffice API

### Process Refund

```
POST /umbraco/api/v1/payments/{paymentId}/refund
```

```json
{
  "amount": 25.00,
  "reason": "Customer return"
}
```

### Preview Refund

```
POST /umbraco/api/v1/payments/{paymentId}/refund/preview
```

```json
{
  "amount": 25.00
}
```

### Record Manual Refund

```
POST /umbraco/api/v1/invoices/{invoiceId}/manual-refund
```

```json
{
  "amount": 50.00,
  "reason": "Refunded externally",
  "transactionId": "re_abc123"
}
```

---

## Payment Status After Refunds

After a refund, the invoice's payment status is recalculated:

| Scenario | Resulting Status |
|----------|-----------------|
| Full refund of full payment | `Refunded` |
| Partial refund | `PartiallyRefunded` |
| Multiple partial refunds totaling the full amount | `Refunded` |
| Refund on a partially-paid invoice | Depends on remaining balance |

The status is always calculated by `IPaymentService.CalculatePaymentStatus()` -- the single source of truth.

---

## Provider Refund Support

| Provider | Full Refund | Partial Refund | Notes |
|----------|-------------|----------------|-------|
| Stripe | Yes | Yes | Via Stripe Refunds API |
| PayPal | Yes | Yes | Via PayPal Payments V2 API |
| Braintree | Yes | Yes | Via Braintree Transaction API |
| WorldPay | Yes | Yes | Via Access Worldpay API |
| Amazon Pay | No | No | Refund via Amazon Pay Dashboard |
| Manual | Yes | Yes | Recording only (no gateway call) |

---

## Error Handling

Refund operations return `CrudResult<Payment>`. Check `result.Success` before assuming the refund went through:

```csharp
var result = await paymentService.ProcessRefundAsync(parameters, ct);

if (!result.Success)
{
    // Check error messages
    var errors = result.Messages
        .Where(m => m.ResultMessageType == ResultMessageType.Error);

    // Common errors:
    // - "Payment not found"
    // - "Refund amount exceeds original payment"
    // - "Provider does not support refunds"
    // - Provider-specific errors (insufficient funds, etc.)
}
```

> **Warning:** If the provider refund succeeds but the Merchello record fails to save (unlikely but possible), the refund still happened at the provider. The manual refund recording feature lets you fix the accounting records in this scenario.

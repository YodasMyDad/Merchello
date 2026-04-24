# Refunds

Merchello supports processing refunds through payment providers, recording manual (externally-processed) refunds, and previewing refund calculations before committing. All refund operations live on [`IPaymentService`](../../../src/Merchello.Core/Payments/Services/Interfaces/IPaymentService.cs).

## Refund Types

### Provider refund

A refund processed through the payment gateway (Stripe, PayPal, Braintree, WorldPay). The provider reverses the charge and Merchello records a `Refund` / `PartialRefund` payment row linked to the original payment via `ParentPaymentId`.

### Manual refund

A refund recorded in Merchello when the money was returned outside the system (refunded directly in the Stripe dashboard, cash refund in-store, bank transfer reversal). No gateway call is made — just the accounting record.

---

## Processing a Provider Refund

All refund parameters live on [`ProcessRefundParameters`](../../../src/Merchello.Core/Payments/Services/Parameters/ProcessRefundParameters.cs). `Reason` is **required**.

```csharp
var result = await paymentService.ProcessRefundAsync(
    new ProcessRefundParameters
    {
        PaymentId      = originalPaymentId,
        Amount         = 25.00m,              // null or 0 = full refundable amount
        Reason         = "Customer return",   // required
        IdempotencyKey = "refund-order-123"   // optional; dedupes retries
    },
    cancellationToken);
```

The flow:

1. `IPaymentService` looks up the original payment and its provider.
2. Calls `provider.RefundPaymentAsync()`, which reverses the charge at the gateway.
3. Creates a child `Payment` record with `ParentPaymentId = originalPaymentId` and `PaymentType = Refund` (or `PartialRefund`). Amounts are stored as positive values; the status calculator subtracts them from `TotalPaid`.
4. Recomputes invoice status via `CalculatePaymentStatus` (the single source of truth).
5. Fires `PaymentRefundedNotification`, which in turn dispatches the `payment.refunded` / `invoice.refunded` email + webhook topics.

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

Before processing a refund, preview the calculation so staff see exactly what will happen:

```csharp
var preview = await paymentService.PreviewRefundAsync(
    new PreviewRefundParameters
    {
        PaymentId  = originalPaymentId,
        Amount     = 25.00m,   // exact amount, OR...
        Percentage = null       // ...0-100 percentage of refundable amount (takes precedence if provided)
    },
    cancellationToken);
```

The preview returns a [`RefundPreviewDto`](../../../src/Merchello.Core/Payments/Dtos/RefundPreviewDto.cs):

| Property | Description |
|----------|-------------|
| `PaymentId` | The payment being previewed |
| `RefundableAmount` | Maximum still refundable (original amount minus prior refunds) |
| `RequestedAmount` | Amount that will be refunded based on `Amount`/`Percentage` |
| `CurrencyCode` | ISO currency code |
| `SupportsRefund` | Whether the provider can refund at all |
| `SupportsPartialRefund` | Whether the provider supports partial refunds |
| `ProviderAlias` | The provider that will handle the refund |
| `FormattedRefundableAmount` / `FormattedRequestedAmount` | Pre-formatted display strings |

> **Tip:** Always show a preview to staff before processing refunds — it prevents accidental over-refunding and surfaces provider capability issues up front.

---

## Recording a Manual Refund

When a refund was processed outside Merchello (directly in the provider dashboard, cash in-store, etc.), record it for accounting via [`RecordManualRefundParameters`](../../../src/Merchello.Core/Payments/Services/Parameters/RecordManualRefundParameters.cs). Note that this is keyed off the **original payment** — not the invoice:

```csharp
var result = await paymentService.RecordManualRefundAsync(
    new RecordManualRefundParameters
    {
        PaymentId = originalPaymentId,           // required
        Amount    = 50.00m,                      // required, positive
        Reason    = "Refunded via Stripe Dashboard" // required
    },
    cancellationToken);
```

No gateway call is made — the refund row is created and invoice status recalculated.

---

## Backoffice API

All backoffice refund operations go through the single [`PaymentsApiController`](../../../src/Merchello/Controllers/PaymentsApiController.cs) endpoint. Manual refunds share the same URL and are selected via `isManualRefund: true` in the body.

### Process Refund (provider or manual)

```http
POST /umbraco/api/v1/payments/{paymentId}/refund
Content-Type: application/json
```

```json
{
  "amount": 25.00,
  "reason": "Customer return",
  "isManualRefund": false
}
```

- `amount` — `null` or `0` refunds the full remaining refundable amount.
- `reason` — **required**, max 1000 chars.
- `isManualRefund` — set `true` to record without calling the provider (e.g. refund already issued in the Stripe dashboard).

### Preview Refund

```http
POST /umbraco/api/v1/payments/{paymentId}/preview-refund
Content-Type: application/json
```

```json
{
  "amount": 25.00,
  "percentage": null
}
```

Returns `RefundPreviewDto`. `percentage` (0–100) takes precedence over `amount` if both are supplied.

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

Capabilities come from each provider's `PaymentProviderMetadata.SupportsRefunds` / `SupportsPartialRefunds` flags. Always check `RefundPreviewDto.SupportsRefund` / `SupportsPartialRefund` before offering the action to staff — if a provider is disabled or incapable, fall back to a manual refund.

| Provider | Full refund | Partial refund | Notes |
|----------|-------------|----------------|-------|
| Stripe | Yes | Yes | Via Stripe Refunds API |
| PayPal | Yes | Yes | Via PayPal Payments V2 API |
| Braintree | Yes | Yes | Via Braintree Transaction API |
| WorldPay | Yes | Yes | Via Access Worldpay API |
| Amazon Pay | No | No | Refund via Amazon Pay Dashboard, then record manually |
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

> **Warning:** If the provider refund succeeds but the Merchello record fails to save (rare but possible), the refund still happened at the provider. Use `RecordManualRefundAsync` / the `isManualRefund` flag to reconcile the accounting records without double-refunding.

## Related

- [Payment System Overview](payment-system-overview.md) — payment status, idempotency, and the `IPaymentService` surface
- [Payment Providers](payment-providers.md) — per-provider refund support
- [Orders Overview](../orders/orders-overview.md) — how refunds appear on invoices and in customer statements

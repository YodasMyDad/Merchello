# Fulfilment System Overview

Merchello separates **shipping** (customer-facing rates and delivery options) from **fulfilment** (the behind-the-scenes logistics of actually getting products to the customer). Shipping providers determine what the customer sees at checkout, while fulfilment providers handle 3PL submission, tracking, and inventory sync after the order is placed.

## Why the Separation Matters

Your customer picks "Express Shipping" at checkout -- that is the **shipping** system. Once the order is paid, someone needs to pick, pack, and ship it. That is the **fulfilment** system.

This separation means you can:

- Use one carrier for customer-facing rates but fulfil through a different 3PL
- Have multiple fulfilment providers for different product lines
- Mix self-fulfilment with 3PL fulfilment in the same store

## Provider Architecture

Fulfilment providers implement `IFulfilmentProvider` (or extend `FulfilmentProviderBase` for sensible defaults). Providers are discovered automatically through `ExtensionManager`.

Every provider declares its capabilities through `FulfilmentProviderMetadata`:

| Capability | Description |
| ---------- | ----------- |
| `SupportsOrderSubmission` | Can submit orders to the 3PL |
| `SupportsOrderCancellation` | Can cancel orders at the 3PL |
| `SupportsWebhooks` | Can receive real-time status updates |
| `SupportsPolling` | Can poll for status changes |
| `SupportsProductSync` | Can push product catalog to the 3PL |
| `SupportsInventorySync` | Can pull inventory levels from the 3PL |
| `CreatesShipmentOnSubmission` | Creates a shipment record immediately (vs. waiting for webhook) |

### API Styles

Providers declare their communication style via `FulfilmentApiStyle`:

- **Rest** -- REST API (e.g., ShipBob)
- **GraphQL** -- GraphQL API
- **Sftp** -- File-based integration (e.g., Supplier Direct)

### Key Interfaces

```csharp
public interface IFulfilmentProvider
{
    FulfilmentProviderMetadata Metadata { get; }
    Task<FulfilmentOrderResult> SubmitOrderAsync(FulfilmentOrderRequest request, CancellationToken ct);
    Task<FulfilmentCancelResult> CancelOrderAsync(string providerReference, CancellationToken ct);
    Task<bool> ValidateWebhookAsync(HttpRequest request, CancellationToken ct);
    Task<FulfilmentWebhookResult> ProcessWebhookAsync(HttpRequest request, CancellationToken ct);
    Task<IReadOnlyList<FulfilmentStatusUpdate>> PollOrderStatusAsync(
        IEnumerable<string> providerReferences, CancellationToken ct);
    Task<FulfilmentSyncResult> SyncProductsAsync(IEnumerable<FulfilmentProduct> products, CancellationToken ct);
    Task<IReadOnlyList<FulfilmentInventoryLevel>> GetInventoryLevelsAsync(CancellationToken ct);
}
```

## Order Submission Flow

When an order is submitted to a fulfilment provider:

1. A `FulfilmentOrderRequest` is built from the order data (line items, shipping address, customer info)
2. The provider's `SubmitOrderAsync()` sends it to the 3PL
3. On success, a `FulfilmentOrderResult` returns with a `ProviderReference` (the 3PL's order ID)
4. A `FulfilmentSubmittedNotification` fires, which downstream handlers use for timeline logging, email, and webhooks

```csharp
public record FulfilmentOrderRequest
{
    public required Guid OrderId { get; init; }
    public required string OrderNumber { get; init; }
    public required IReadOnlyList<FulfilmentLineItem> LineItems { get; init; }
    public required FulfilmentAddress ShippingAddress { get; init; }
    public string? ShippingServiceCode { get; init; }
    public Dictionary<string, object> ExtendedData { get; init; } = [];
}
```

### Submission Trigger Policies

Orders can be submitted via two trigger policies:

- **OnPaid** -- Automatically submits when payment is confirmed. The default for most 3PLs.
- **ExplicitRelease** -- Staff must manually release the order before submission. The order must be paid first. This policy is exclusive to the Supplier Direct provider and does not affect other providers.

The trigger policy is a strategic decision that affects your integration code: `OnPaid` requires no intervention, while `ExplicitRelease` means you need to call the release endpoint or build a staff workflow around it.

## Status Updates

### Webhooks (Real-Time)

When a 3PL sends a webhook, it hits:

```text
POST /umbraco/merchello/webhooks/fulfilment/{providerKey}
```

The controller validates the webhook signature via `ValidateWebhookAsync()`, checks for duplicate webhooks (idempotency via message ID), and calls `ProcessWebhookAsync()` to parse the payload. The result can contain:

- **Status updates** -- Order status changes (e.g., shipped, delivered, cancelled)
- **Shipment updates** -- Tracking numbers, carrier info, shipped items
- **Inventory updates** -- Stock level changes from the 3PL

### Polling (Background Job)

The `FulfilmentPollingJob` runs on a configurable interval (default: every 15 minutes) and calls `PollOrderStatusAsync()` for providers that support it. Useful as a fallback when webhooks are unreliable.

## Retries and Error Handling

Failed submissions are retried by the `FulfilmentRetryJob` with exponential backoff. Configuration in `appsettings.json`:

```json
{
  "Merchello": {
    "Fulfilment": {
      "PollingIntervalMinutes": 15,
      "MaxRetryAttempts": 5,
      "RetryDelaysMinutes": [5, 15, 30, 60, 120],
      "SyncLogRetentionDays": 30,
      "WebhookLogRetentionDays": 7
    }
  }
}
```

After all retry attempts are exhausted, a `FulfilmentSubmissionFailedNotification` fires so you can alert staff via email or webhook.

## Product and Inventory Sync

Providers that support it can:

- **Push products** to the 3PL via `SyncProductsAsync()` -- sends SKU, name, barcode, dimensions, weight, cost, and HS code
- **Pull inventory** from the 3PL via `GetInventoryLevelsAsync()` -- returns available, reserved, and incoming quantities per SKU and warehouse

The `FulfilmentCleanupJob` periodically cleans up old sync and webhook logs based on retention settings.

## Built-In Providers

| Provider | Key | Style | Description |
| -------- | --- | ----- | ----------- |
| [ShipBob](shipbob.md) | `shipbob` | REST | Full 3PL integration with orders, webhooks, products, and inventory |
| [Supplier Direct](supplier-direct.md) | `supplier-direct` | SFTP | CSV-based order transmission via email, FTP, or SFTP |

## Building a Custom Provider

Create a class extending `FulfilmentProviderBase`, set `Metadata` with your provider's capabilities, and override the methods you need. The provider is automatically discovered by `ExtensionManager`.

```csharp
public class MyWarehouseProvider : FulfilmentProviderBase
{
    public override FulfilmentProviderMetadata Metadata => new()
    {
        Key = "my-warehouse",
        DisplayName = "My Warehouse",
        SupportsOrderSubmission = true,
        SupportsWebhooks = true,
        CreatesShipmentOnSubmission = false, // Shipment data comes from webhooks
        ApiStyle = FulfilmentApiStyle.Rest
    };

    public override async Task<FulfilmentOrderResult> SubmitOrderAsync(
        FulfilmentOrderRequest request,
        CancellationToken cancellationToken = default)
    {
        var response = await _client.PostOrderAsync(request);

        return response.Success
            ? FulfilmentOrderResult.Succeeded(response.OrderId)
            : FulfilmentOrderResult.Failed(response.Error);
    }
}
```

Set `CreatesShipmentOnSubmission = false` if your provider receives shipment/tracking data via webhooks (like ShipBob). Set it to `true` if your provider creates a shipment record immediately when the order is submitted (like Supplier Direct).

## Related Topics

- [ShipBob Integration](shipbob.md)
- [Supplier Direct Fulfilment](supplier-direct.md)
- [Background Jobs](../background-jobs/background-jobs.md)
- [Notification System](../notifications/notification-system.md)

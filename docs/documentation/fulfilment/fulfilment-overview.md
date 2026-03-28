# Fulfilment System Overview

Merchello separates **shipping** (customer-facing rates and delivery options) from **fulfilment** (the behind-the-scenes logistics of actually getting products to the customer). This is an important distinction: shipping providers determine what the customer sees at checkout, while fulfilment providers handle 3PL submission, tracking, and inventory sync after the order is placed.

## Why the Separation Matters

Think of it this way: your customer picks "Express Shipping" at checkout -- that is the **shipping** system. Once the order is paid, someone needs to pick, pack, and ship it. That is the **fulfilment** system.

This separation means you can:

- Use one carrier for customer-facing rates but fulfil through a different 3PL
- Have multiple fulfilment providers for different product lines
- Mix self-fulfilment with 3PL fulfilment in the same store

## Provider Architecture

Fulfilment providers implement the `IFulfilmentProvider` interface (or extend `FulfilmentProviderBase` for sensible defaults). Providers are discovered automatically through Merchello's `ExtensionManager` -- you register them and they appear in the backoffice.

Every provider declares its capabilities through `FulfilmentProviderMetadata`:

| Capability | Description |
|---|---|
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

## Order Submission Flow

Here is what happens when an order is submitted to a fulfilment provider:

1. A `FulfilmentOrderRequest` is built from the order data (line items, shipping address, customer info)
2. The provider's `SubmitOrderAsync()` method sends it to the 3PL
3. On success, a `FulfilmentOrderResult` returns with a `ProviderReference` (the 3PL's order ID)
4. A `FulfilmentSubmittedNotification` fires, which downstream handlers use for timeline logging, email, and webhooks

```csharp
// The request sent to the provider
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

### Submission Triggers

Orders can be submitted to fulfilment providers via two trigger policies:

- **OnPaid** (`FulfilmentSubmissionSource.PaymentCreated`) -- Automatically submits when payment is confirmed. This is the default for most 3PLs.
- **ExplicitRelease** (`FulfilmentSubmissionSource.ExplicitRelease`) -- Staff must manually release the order via the backoffice or API (`POST /orders/{orderId}/fulfillment/release`). The order must be paid before release is allowed.

> **Note:** The ExplicitRelease trigger is only supported by the Supplier Direct provider. Dynamic/non-Supplier Direct providers are unaffected by this setting.

## Status Updates

Providers can report status changes back to Merchello in two ways:

### Webhooks (Real-Time)

When a 3PL sends a webhook, it hits:

```
POST /umbraco/merchello/webhooks/fulfilment/{providerKey}
```

The controller:
1. Looks up the provider by key
2. Validates the webhook signature via `ValidateWebhookAsync()`
3. Checks for duplicate webhooks (idempotency via message ID)
4. Calls `ProcessWebhookAsync()` to parse the payload
5. Processes any `StatusUpdates` and `ShipmentUpdates` from the result

The webhook result can contain:

- **Status updates** -- Order status changes (e.g., shipped, delivered, cancelled)
- **Shipment updates** -- Tracking numbers, carrier info, shipped items
- **Inventory updates** -- Stock level changes from the 3PL

### Polling (Background Job)

The `FulfilmentPollingJob` runs on a configurable interval (default: every 15 minutes) and calls `PollOrderStatusAsync()` for providers that support it. This is useful as a fallback when webhooks are unreliable.

## Retries and Error Handling

Failed submissions are retried by the `FulfilmentRetryJob` with exponential backoff:

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

Merchello ships with two fulfilment providers:

| Provider | Key | Style | Description |
|---|---|---|---|
| [ShipBob](shipbob.md) | `shipbob` | REST | Full 3PL integration with orders, webhooks, products, and inventory |
| [Supplier Direct](supplier-direct.md) | `supplier-direct` | SFTP | CSV-based order transmission via email, FTP, or SFTP |

## Building a Custom Provider

To create your own fulfilment provider:

1. Create a class extending `FulfilmentProviderBase`
2. Set the `Metadata` property with your provider's capabilities
3. Override the methods you need (e.g., `SubmitOrderAsync`, `ProcessWebhookAsync`)
4. Register with the `ExtensionManager` for automatic discovery

```csharp
public class MyWarehouseProvider : FulfilmentProviderBase
{
    public override FulfilmentProviderMetadata Metadata => new()
    {
        Key = "my-warehouse",
        DisplayName = "My Warehouse",
        SupportsOrderSubmission = true,
        SupportsWebhooks = true,
        CreatesShipmentOnSubmission = false, // We'll get shipment data from webhooks
        ApiStyle = FulfilmentApiStyle.Rest
    };

    public override async Task<FulfilmentOrderResult> SubmitOrderAsync(
        FulfilmentOrderRequest request,
        CancellationToken cancellationToken = default)
    {
        // Send order to your warehouse API
        var response = await _client.PostOrderAsync(request);

        return response.Success
            ? FulfilmentOrderResult.Succeeded(response.OrderId)
            : FulfilmentOrderResult.Failed(response.Error);
    }
}
```

> **Tip:** If your provider receives shipment/tracking data via webhooks (like ShipBob does), set `CreatesShipmentOnSubmission = false`. If your provider creates a shipment record immediately when the order is submitted (like Supplier Direct), set it to `true`.

## Related Topics

- [ShipBob Integration](shipbob.md)
- [Supplier Direct Fulfilment](supplier-direct.md)
- [Background Jobs](../background-jobs/background-jobs.md)
- [Notification System](../notifications/notification-system.md)

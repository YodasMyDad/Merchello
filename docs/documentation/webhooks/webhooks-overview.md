# Outbound Webhooks

Merchello can send HTTP webhooks to external systems when events happen in your store. When an order is placed, a product is updated, or a shipment ships, Merchello posts a JSON payload to your configured URL. This lets you integrate with ERPs, marketing tools, analytics platforms, or any system that can receive HTTP requests.

Webhooks are driven by the same [notification pipeline](../notifications/notification-system.md) as the [email system](../email/email-overview.md). The [`WebhookNotificationHandler`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Webhooks/Handlers/WebhookNotificationHandler.cs) runs at priority **2200** and queues an `OutboundDelivery` row for each active subscription whose topic and filter match.

```
Notification -> WebhookNotificationHandler (2200) -> IWebhookService.QueueDeliveryAsync
    -> OutboundDelivery (Pending) -> OutboundDeliveryJob -> WebhookDispatcher.SendAsync
    -> persist (Succeeded / Retrying / Abandoned)
```

> **CLAUDE.md invariant:** The handler catches and logs all dispatch errors; it never rethrows. A failed webhook must never break the business operation that triggered it.

## Key Features

- **36 event topics** across 11 categories (see [WebhookTopicRegistry.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Webhooks/Services/WebhookTopicRegistry.cs))
- **HMAC-SHA256 / SHA512 signing** for payload verification
- **Multiple auth types** (HMAC, Bearer Token, API Key, Basic Auth, None)
- **Automatic retry** with configurable backoff and stale-send recovery
- **Full delivery history** with request/response logging
- **Test webhooks** and URL ping for development
- **Filter expressions** for conditional delivery
- **SSRF protection** — private/internal IPs are rejected before sending

## Event Topics

Webhooks are organized by category. Here are all the available topics:

### Orders
| Topic | Description |
|---|---|
| `order.created` | New order placed |
| `order.updated` | Order modified |
| `order.status_changed` | Order status changed |
| `order.cancelled` | Order cancelled |

### Invoices
| Topic | Description |
|---|---|
| `invoice.created` | Invoice created |
| `invoice.paid` | Invoice fully paid |
| `invoice.refunded` | Refund processed |
| `invoice.deleted` | Invoice deleted |

### Products
| Topic | Description |
|---|---|
| `product.created` | Product created |
| `product.updated` | Product modified |
| `product.deleted` | Product deleted |

### Inventory
| Topic | Description |
|---|---|
| `inventory.adjusted` | Stock levels adjusted |
| `inventory.low_stock` | Stock below threshold |
| `inventory.reserved` | Stock reserved for order |
| `inventory.allocated` | Stock allocated for shipment |

### Customers
| Topic | Description |
|---|---|
| `customer.created` | Customer registered |
| `customer.updated` | Customer modified |
| `customer.deleted` | Customer deleted |

### Shipments
| Topic | Description |
|---|---|
| `shipment.created` | Shipment created |
| `shipment.updated` | Shipment modified |

### Discounts
| Topic | Description |
|---|---|
| `discount.created` | Discount created |
| `discount.updated` | Discount modified |
| `discount.deleted` | Discount deleted |

### Checkout Recovery
| Topic | Description |
|---|---|
| `checkout.abandoned` | Cart abandoned |
| `checkout.abandoned.first` | First recovery email due |
| `checkout.abandoned.reminder` | Recovery reminder due |
| `checkout.abandoned.final` | Final recovery notice due |
| `checkout.recovered` | Abandoned cart recovered |
| `checkout.converted` | Recovery converted to order |

### Baskets
| Topic | Description |
|---|---|
| `basket.created` | Basket created |
| `basket.updated` | Basket modified |

### Digital Products
| Topic | Description |
|---|---|
| `digital.delivered` | Download links ready |

### Fulfilment
| Topic | Description |
|---|---|
| `fulfilment.submitted` | Order submitted to 3PL |
| `fulfilment.failed` | Fulfilment submission failed |
| `fulfilment.inventory_updated` | Inventory synced from 3PL |
| `fulfilment.product_synced` | Products synced to 3PL |

> **Topic naming:** Keys use dots as category separators and underscores within a word. Always reference the constants in [Constants.cs:WebhookTopics](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Constants.cs#L239) rather than copy/pasting strings.

## Creating a Webhook Subscription

### Via the Backoffice

Go to **Settings** > **Webhooks** and click "Add Subscription". You will need:

1. **Name** -- A descriptive name (e.g., "Order sync to ERP")
2. **Topic** -- Which event to subscribe to
3. **Target URL** -- Where to send the webhook
4. **Auth Type** -- How to authenticate the request

### Via the API

```
POST /api/v1/webhooks
```

```json
{
  "name": "Order Created -> My ERP",
  "topic": "order.created",
  "targetUrl": "https://my-erp.example.com/webhooks/merchello",
  "authType": "HmacSha256",
  "timeoutSeconds": 30,
  "headers": {
    "X-Source": "merchello"
  }
}
```

## Authentication Types

| Type | Value | Description |
|---|---|---|
| None | `0` | No authentication |
| HMAC-SHA256 | `1` | Signature in `X-Merchello-Hmac-SHA256` header |
| HMAC-SHA512 | `2` | Signature in `X-Merchello-Hmac-SHA512` header |
| Bearer Token | `3` | Token in `Authorization: Bearer {token}` header |
| API Key | `4` | Key in a custom header |
| Basic Auth | `5` | Credentials in `Authorization: Basic {encoded}` header |

### HMAC Signing

When you create a subscription with HMAC auth, Merchello generates a secret key. Each webhook delivery includes a signature header computed from the UTF-8 bytes of the raw request body, Base64-encoded (see [WebhookDispatcher.AddSignature](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Webhooks/Services/WebhookDispatcher.cs#L236)):

```
X-Merchello-Hmac-SHA256: {base64-encoded-signature}
```

Every delivery also includes these standard headers for replay/correlation:

- `X-Merchello-Topic` — the topic key (for example `order.created`)
- `X-Merchello-Delivery-Id` — the `OutboundDelivery.Id` GUID (use for idempotent receiving)
- `X-Merchello-Timestamp` — Unix timestamp (seconds) when the request was built
- `User-Agent: Merchello-Webhooks/1.0`

To verify on your end:

```csharp
// Compute HMAC of the raw request body using the shared secret
using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(requestBody));
var expected = Convert.ToBase64String(hash);

// Compare with the header value (constant-time comparison!)
var valid = CryptographicOperations.FixedTimeEquals(
    Encoding.UTF8.GetBytes(expected),
    Encoding.UTF8.GetBytes(headerValue));
```

You can regenerate the secret at any time:

```
POST /api/v1/webhooks/{id}/regenerate-secret
```

## Delivery and Retries

Webhooks are delivered asynchronously through the [`OutboundDeliveryJob`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Webhooks/Services/OutboundDeliveryJob.cs) background service, which also processes [email](../email/email-overview.md) deliveries. This means:

- Webhook dispatch never blocks the main operation
- Failed deliveries are automatically retried
- Every delivery attempt is logged
- Orphaned `Pending` rows and stale `Sending` rows (past the timeout window) are automatically requeued

### Delivery Statuses

| Status | Description |
|---|---|
| Pending | Queued for delivery |
| Sending | Currently being delivered (atomic claim) |
| Succeeded | HTTP 2xx response received |
| Failed | Delivery failed, will retry |
| Retrying | Waiting for next retry attempt |
| Abandoned | All retries exhausted (terminal) |

### Retry Policy

Configurable via [`WebhookSettings`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Webhooks/Models/WebhookSettings.cs) (binds from `Merchello:Webhooks`):

```json
{
  "Merchello": {
    "Webhooks": {
      "MaxRetries": 5,
      "RetryDelaysSeconds": [60, 300, 900, 3600, 14400],
      "DeliveryIntervalSeconds": 10,
      "DefaultTimeoutSeconds": 30,
      "MaxPayloadSizeBytes": 1000000,
      "DeliveryLogRetentionDays": 30
    }
  }
}
```

Default retry schedule: 1 min, 5 min, 15 min, 1 hr, 4 hr. After `MaxRetries` the delivery is marked `Abandoned`.

Payloads exceeding `MaxPayloadSizeBytes` are recorded as terminal `Abandoned` rows without dispatch.

The delivery job also purges delivery logs older than `DeliveryLogRetentionDays` while excluding active rows (`Pending`, `Retrying`, `Sending`).

## Testing Webhooks

### Send a Test Webhook

```
POST /api/v1/webhooks/{id}/test
```

This sends a sample payload to the configured URL and returns the response details (status code, body, duration).

### Ping a URL

```
POST /api/v1/webhooks/ping
```

```json
{
  "url": "https://my-erp.example.com/webhooks/merchello"
}
```

Tests basic connectivity to a URL without sending a real webhook payload.

## Delivery History

Every webhook delivery is logged with full request/response details:

| Endpoint | Description |
|---|---|
| `GET /api/v1/webhooks/{id}/deliveries` | List deliveries for a subscription |
| `GET /api/v1/webhooks/deliveries/{id}` | Get delivery detail (headers, body, response) |
| `POST /api/v1/webhooks/deliveries/{id}/retry` | Manually retry a failed delivery |

The detail view includes: target URL, request body, request headers, response body, response headers, status code, duration, and attempt number.

## Statistics

```
GET /api/v1/webhooks/stats?from=2025-01-01&to=2025-12-31
```

Returns aggregate statistics for webhook deliveries: success count, failure count, and other metrics for the specified period.

## URL Security

Webhook target URLs are validated before delivery by [`UrlSecurityValidator.TryValidatePublicHttpUrl`](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello.Core/Shared/Security/UrlSecurityValidator.cs). Enforced rules:
- Must be a valid HTTP/HTTPS URL
- Private/internal IP addresses are blocked (SSRF protection)
- The URL validation runs on every delivery attempt, not just at subscription creation
- The `Webhooks` named `HttpClient` has infinite timeout; the per-subscription `TimeoutSeconds` is enforced via linked `CancellationTokenSource` inside the dispatcher

## Backoffice API Summary

Source: [WebhooksApiController.cs](https://github.com/YodasMyDad/Merchello/blob/main/src/Merchello/Controllers/WebhooksApiController.cs).

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/webhooks` | GET | List subscriptions (paginated, filterable) |
| `/api/v1/webhooks/{id}` | GET | Get subscription detail |
| `/api/v1/webhooks` | POST | Create subscription |
| `/api/v1/webhooks/{id}` | PUT | Update subscription |
| `/api/v1/webhooks/{id}` | DELETE | Delete subscription |
| `/api/v1/webhooks/{id}/test` | POST | Send test webhook |
| `/api/v1/webhooks/{id}/regenerate-secret` | POST | Regenerate HMAC secret |
| `/api/v1/webhooks/topics` | GET | List all topics |
| `/api/v1/webhooks/topics/by-category` | GET | Topics grouped by category |
| `/api/v1/webhooks/ping` | POST | Test URL connectivity |
| `/api/v1/webhooks/stats` | GET | Delivery statistics |
| `/api/v1/webhooks/{id}/deliveries` | GET | Recent delivery history for a subscription (supports `?status=` and `?statuses=` filters) |
| `/api/v1/webhooks/deliveries/{id}` | GET | Delivery detail (request + response) |
| `/api/v1/webhooks/deliveries/{id}/retry` | POST | Manually retry a failed delivery |

## Related Topics

- [Notification System](../notifications/notification-system.md)
- [Email System](../email/email-overview.md)
- [Background Jobs](../background-jobs/background-jobs.md)
- [UCP Protocol](../ucp/ucp-overview.md) (uses a separate ES256-signed webhook stream for agents)
- [Architecture Diagrams - Webhooks](https://github.com/YodasMyDad/Merchello/blob/main/docs/Architecture-Diagrams.md)

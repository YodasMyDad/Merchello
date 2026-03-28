# Outbound Webhooks

Merchello can send HTTP webhooks to external systems when events happen in your store. When an order is placed, a product is updated, or a shipment ships, Merchello posts a JSON payload to your configured URL. This lets you integrate with ERPs, marketing tools, analytics platforms, or any system that can receive HTTP requests.

## Key Features

- **36+ event topics** across 10 categories
- **HMAC-SHA256/SHA512 signing** for payload verification
- **Multiple auth types** (HMAC, Bearer Token, API Key, Basic Auth)
- **Automatic retry** with configurable backoff
- **Full delivery history** with request/response logging
- **Test webhooks** for development
- **Filter expressions** for conditional delivery

## Event Topics

Webhooks are organized by category. Here are all the available topics:

### Orders
| Topic | Description |
|---|---|
| `order.created` | New order placed |
| `order.updated` | Order modified |
| `order.status-changed` | Order status changed |
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
| `inventory.low-stock` | Stock below threshold |
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
| `digital-product.delivered` | Download links ready |

### Fulfilment
| Topic | Description |
|---|---|
| `fulfilment.submitted` | Order submitted to 3PL |
| `fulfilment.failed` | Fulfilment submission failed |
| `fulfilment.inventory-updated` | Inventory synced from 3PL |
| `fulfilment.product-synced` | Products synced to 3PL |

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

When you create a subscription with HMAC auth, Merchello generates a secret key. Each webhook delivery includes a signature header computed from the request body:

```
X-Merchello-Hmac-SHA256: {base64-encoded-signature}
```

To verify on your end:

```csharp
// Compute HMAC of the raw request body using the shared secret
var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(requestBody));
var expected = Convert.ToBase64String(hash);

// Compare with the header value (constant-time comparison!)
bool valid = CryptographicOperations.FixedTimeEquals(
    Encoding.UTF8.GetBytes(expected),
    Encoding.UTF8.GetBytes(headerValue));
```

You can regenerate the secret at any time:

```
POST /api/v1/webhooks/{id}/regenerate-secret
```

## Delivery and Retries

Webhooks are delivered asynchronously through the `OutboundDeliveryJob` background service. This means:

- Webhook dispatch never blocks the main operation
- Failed deliveries are automatically retried
- Every delivery attempt is logged

### Delivery Statuses

| Status | Description |
|---|---|
| Pending | Queued for delivery |
| Sending | Currently being delivered |
| Succeeded | HTTP 2xx response received |
| Failed | Delivery failed, will retry |
| Retrying | Waiting for next retry attempt |
| Abandoned | All retries exhausted |

### Retry Policy

Retries use the webhook settings configuration. The delivery job processes pending and retrying deliveries on each pass.

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

Webhook target URLs are validated before delivery:
- Must be a valid HTTP/HTTPS URL
- Private/internal IP addresses are blocked (SSRF protection)
- The URL validation runs on every delivery attempt, not just at subscription creation

## Backoffice API Summary

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/webhooks` | GET | List subscriptions |
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

## Related Topics

- [Notification System](../notifications/notification-system.md)
- [Email System](../email/email-overview.md)
- [Background Jobs](../background-jobs/background-jobs.md)

# Webhook API

Merchello supports two kinds of webhooks:

1. **Inbound webhooks** -- Callbacks that payment providers and fulfillment (3PL) providers send to Merchello
2. **Outbound webhooks** -- Events that Merchello sends to your external systems when things happen in your store

Most developers only need to work with outbound webhooks. Inbound webhooks are handled automatically by Merchello once you configure your payment or fulfillment provider.

---

## Inbound Webhooks

Inbound webhooks are endpoints that external services (Stripe, PayPal, ShipBob, etc.) call to notify Merchello about events like completed payments, refunds, or shipment updates.

**You don't need to write any code for these.** Merchello validates signatures, deduplicates events, and processes them automatically.

### Payment Webhooks

**URL pattern:** `https://yourdomain.com/umbraco/merchello/webhooks/payments/{providerAlias}`

When you configure a payment provider (e.g., Stripe), set the webhook URL in your provider's dashboard to this pattern. For example:

```
https://yourdomain.com/umbraco/merchello/webhooks/payments/stripe
```

Merchello handles:

- **Signature validation** using the webhook secret from your provider settings
- **Idempotency** -- duplicate events are detected and skipped
- **Rate limiting** per provider and IP address
- **Event routing** -- payment completions, failures, refunds, and disputes are processed automatically

Supported event types: `PaymentCompleted`, `PaymentFailed`, `PaymentCancelled`, `RefundCompleted`, `DisputeOpened`, `DisputeResolved`.

For provider-specific setup instructions, see the documentation for your payment provider.

### Fulfillment Webhooks

**URL pattern:** `https://yourdomain.com/umbraco/merchello/webhooks/fulfilment/{providerKey}`

3PL providers send callbacks for order status changes, shipment tracking updates, and inventory level changes. Like payment webhooks, these are validated, deduplicated, and processed automatically.

> **Tip:** Use the backoffice test tools to simulate webhook events before going live. Navigate to the fulfillment or payment provider settings and use the "Simulate Webhook" feature.

---

## Outbound Webhooks

Outbound webhooks let you push store events to your own systems -- ERPs, Slack channels, analytics platforms, CRMs, or any HTTP endpoint. This is the section most developers need.

**Management Base URL:** `/umbraco/api/v1`  
**Authentication:** Requires Umbraco backoffice authentication.

You can configure outbound webhooks through the backoffice UI or the management API described below.

### Topics

Every outbound webhook subscribes to a topic -- the type of event that triggers it.

#### GET `/webhooks/topics`

Get all available webhook topics.

**Response (200):**

```json
[
  {
    "key": "order.created",
    "displayName": "Order Created",
    "description": "Fires when a new order is placed",
    "category": "Orders",
    "samplePayload": "{ ... }"
  }
]
```

#### GET `/webhooks/topics/by-category`

Get topics grouped by category (Orders, Payments, Shipping, etc.). Useful for building a topic picker UI.

### Subscriptions

#### POST `/webhooks`

Create a new webhook subscription.

**Request body:**

```json
{
  "name": "Order Notifications",
  "topic": "order.created",
  "targetUrl": "https://example.com/webhooks/orders",
  "authType": "HmacSha256",
  "timeoutSeconds": 30,
  "headers": {}
}
```

**Authentication types:**

| Type | Description |
|------|-------------|
| `None` | No authentication |
| `HmacSha256` | Signs the payload with HMAC SHA-256 (recommended) |
| `HmacSha512` | Signs the payload with HMAC SHA-512 |
| `BearerToken` | Sends a Bearer token in the Authorization header |
| `ApiKey` | Sends an API key in a custom header |
| `BasicAuth` | HTTP Basic authentication |

**Response (201):** The created subscription, including the HMAC signing secret if applicable.

#### GET `/webhooks`

List webhook subscriptions with optional filtering by topic, active status, or search term. Supports pagination.

#### GET `/webhooks/{id}`

Get a webhook subscription with its 10 most recent delivery attempts.

#### PUT `/webhooks/{id}`

Update a webhook subscription.

#### DELETE `/webhooks/{id}`

Delete a webhook subscription.

### Testing

#### POST `/webhooks/ping`

Ping a URL to test connectivity before creating a subscription.

**Request body:**

```json
{
  "url": "https://example.com/webhooks/test"
}
```

#### POST `/webhooks/{id}/test`

Send a test webhook with a sample payload to verify your endpoint works correctly.

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "responseBody": "OK",
  "durationMs": 245,
  "deliveryId": "..."
}
```

### HMAC Signature Verification

When using `HmacSha256` or `HmacSha512` authentication, Merchello signs the payload body and sends the signature in the request headers. Your receiving endpoint should verify this signature to confirm the webhook is genuine.

#### POST `/webhooks/{id}/regenerate-secret`

Regenerate the HMAC signing secret. The old secret is immediately invalidated.

**Response (200):**

```json
{
  "secret": "whsec_new-secret-here"
}
```

> **Warning:** After regenerating the secret, update it in your receiving application immediately. Webhooks signed with the old secret will fail validation.

### Delivery Tracking

Merchello tracks every delivery attempt so you can monitor reliability and debug failures.

#### GET `/webhooks/{id}/deliveries`

Get delivery history for a subscription. Filter by status and paginate results.

**Delivery statuses:**

| Status | Description |
|--------|-------------|
| `Pending` | Queued for delivery |
| `Sending` | Currently being sent |
| `Succeeded` | Delivered successfully |
| `Failed` | Delivery failed |
| `Retrying` | Failed and queued for retry |
| `Abandoned` | Exhausted all retry attempts |

#### GET `/webhooks/deliveries/{id}`

Get full details of a delivery attempt, including request/response headers and bodies. Useful for debugging failed deliveries.

#### POST `/webhooks/deliveries/{id}/retry`

Manually retry a failed delivery.

### Retry Behavior

Failed deliveries are automatically retried with increasing delays. The default retry schedule is:

1. After 1 minute
2. After 5 minutes
3. After 15 minutes
4. After 1 hour
5. After 4 hours

After exhausting all retries (default: 5 attempts), the delivery is marked as `Abandoned`. You can configure retry behavior in `appsettings.json`:

```json
{
  "Merchello": {
    "Webhooks": {
      "MaxRetries": 5,
      "RetryDelaysSeconds": [60, 300, 900, 3600, 14400],
      "DefaultTimeoutSeconds": 30,
      "DeliveryLogRetentionDays": 30
    }
  }
}
```

### Statistics

#### GET `/webhooks/stats`

Get webhook delivery statistics for a time period. Pass `from` and `to` query parameters to define the range.

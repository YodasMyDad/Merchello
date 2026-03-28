# Webhook and Payment Webhook API

Merchello has two kinds of webhook functionality:

1. **Inbound webhooks** -- Endpoints that receive callbacks from external payment providers and fulfillment (3PL) providers
2. **Outbound webhooks** -- A management API for configuring webhooks that Merchello sends to your external systems when events occur

---

## Inbound Payment Webhooks

**Base URL:** `/umbraco/merchello/webhooks/payments`

These endpoints receive callbacks from payment providers (Stripe, PayPal, Braintree, Worldpay, etc.) when payment events occur. They are publicly accessible (no authentication) since payment providers need to reach them.

### POST `/{providerAlias}`

Receive a webhook from a payment provider.

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `providerAlias` | string | The alias of the payment provider (e.g., `stripe`, `paypal`, `braintree`) |

**How it works:**

1. **Rate limiting** -- The endpoint checks rate limits per provider and IP address. Returns `429` if exceeded.
2. **Provider lookup** -- Finds the registered payment provider. Webhooks are accepted even if the provider is currently disabled (to avoid losing payment confirmations during maintenance).
3. **Payload extraction** -- Reads the request body. For Braintree, it extracts `bt_signature` and `bt_payload` from form data. For all others, it reads raw JSON/text body.
4. **Signature validation** -- Calls the provider's `ValidateWebhookAsync()` to verify the webhook is genuine.
5. **Idempotency check** -- Uses `TryMarkAsProcessingAsync()` to prevent concurrent duplicate handling of the same event.
6. **Event processing** -- Routes the event based on type and records the appropriate action.

**Supported webhook event types:**

| Event Type | Action |
|------------|--------|
| `PaymentCompleted` | Records payment, publishes deferred invoice notifications, captures settlement currency and risk score |
| `PaymentFailed` | Logs the failure for investigation |
| `PaymentCancelled` | Logs the cancellation |
| `RefundCompleted` | Logs (refunds are typically initiated from backoffice) |
| `DisputeOpened` | Logs the dispute |
| `DisputeResolved` | Logs the resolution |

**Response codes:**

| Status | Meaning |
|--------|---------|
| `200` | Webhook processed successfully (or already processed) |
| `400` | Empty payload, invalid signature, or processing failed |
| `404` | Unknown provider alias |
| `429` | Rate limited |

**Example: Configuring Stripe webhooks**

In your Stripe dashboard, set the webhook URL to:
```
https://yourdomain.com/umbraco/merchello/webhooks/payments/stripe
```

> **Warning:** Never expose webhook secrets in client-side code. Merchello validates webhook signatures server-side using the secret configured in your payment provider settings.

> **Note:** Payment webhooks include idempotency protection. If Stripe retries a webhook that was already processed, Merchello returns `200` with `"Already processed"` without recording a duplicate payment.

---

## Inbound Fulfillment Webhooks

**Base URL:** `/umbraco/merchello/webhooks/fulfilment`

These endpoints receive callbacks from 3PL/fulfillment providers when order status, shipment, or inventory changes occur.

### POST `/{providerKey}`

Receive a webhook from a fulfillment provider.

**Path parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `providerKey` | string | The key/alias of the fulfillment provider |

**How it works:**

1. **Provider lookup** -- Finds the registered fulfillment provider. Returns `400` if the provider doesn't support webhooks.
2. **Payload capture** -- Reads and buffers the request body so both validation and processing can read it.
3. **Message ID extraction** -- Extracts a unique message ID from common webhook headers (`webhook-id`, `X-Webhook-Id`, `X-Shiphero-Message-ID`, `X-Request-Id`). Falls back to a SHA-256 hash of the payload body.
4. **Signature validation** -- Calls the provider's `ValidateWebhookAsync()`.
5. **Idempotency** -- Writes a webhook log entry atomically before processing. If the message ID already exists, returns `200` with `"Already processed"`.
6. **Processing** -- Calls the provider's `ProcessWebhookAsync()`, then processes each update type individually.

**Update types processed:**

| Update Type | Description |
|-------------|-------------|
| **Status updates** | Order status changes (e.g., processing, shipped, delivered) |
| **Shipment updates** | Tracking numbers, carrier info, shipment creation |
| **Inventory updates** | Stock level changes from the 3PL |

**Response (200):**

```json
{
  "message": "Webhook processed",
  "eventType": "shipment_update",
  "statusUpdates": 0,
  "shipmentUpdates": 1
}
```

**Error handling:** If processing fails, the webhook log entry is released so the provider can retry. Individual status/shipment/inventory updates are processed independently -- if one fails, the others still complete.

> **Tip:** When setting up a new fulfillment provider, use the backoffice test tools (`POST /fulfilment-providers/{id}/test/simulate-webhook`) to verify your webhook handling before going live.

---

## Outbound Webhook Management API

**Base URL:** `/umbraco/api/v1`

**Authentication:** Requires Umbraco backoffice authentication.

This API lets you configure webhooks that Merchello sends to your external systems when store events happen (e.g., order created, payment received, shipment dispatched).

### Subscriptions

#### GET `/webhooks`

List webhook subscriptions with optional filtering.

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `topic` | string | Filter by topic |
| `isActive` | bool | Filter by active status |
| `searchTerm` | string | Search in name/URL |
| `page` | int | Page number (default: 1) |
| `pageSize` | int | Items per page (default: 20) |
| `sortBy` | string | Sort field |
| `sortDirection` | string | `asc` or `desc` |

**Response (200):**

```json
{
  "items": [
    {
      "id": "...",
      "name": "Order Notifications",
      "topic": "order.created",
      "topicDisplayName": "Order Created",
      "targetUrl": "https://example.com/webhooks/orders",
      "isActive": true,
      "authType": "HmacSha256",
      "authTypeDisplay": "HMAC SHA-256",
      "successCount": 142,
      "failureCount": 3,
      "lastTriggeredUtc": "2026-03-28T10:00:00Z",
      "lastSuccessUtc": "2026-03-28T10:00:00Z",
      "dateCreated": "2026-01-15T09:30:00Z"
    }
  ],
  "totalItems": 5,
  "pageIndex": 1,
  "pageSize": 20
}
```

---

#### GET `/webhooks/{id}`

Get a webhook subscription with recent deliveries.

**Response (200):** Full subscription details plus the 10 most recent delivery attempts.

---

#### POST `/webhooks`

Create a new webhook subscription.

**Request body:**

```json
{
  "name": "Order Notifications",
  "topic": "order.created",
  "targetUrl": "https://example.com/webhooks/orders",
  "authType": "HmacSha256",
  "authHeaderName": null,
  "authHeaderValue": null,
  "timeoutSeconds": 30,
  "filterExpression": null,
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

**Response (201):** The created subscription.

---

#### PUT `/webhooks/{id}`

Update a webhook subscription.

---

#### DELETE `/webhooks/{id}`

Delete a webhook subscription.

**Response (204):** No content.

---

#### POST `/webhooks/{id}/test`

Send a test webhook to verify connectivity and authentication.

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

---

#### POST `/webhooks/{id}/regenerate-secret`

Regenerate the HMAC signing secret for a subscription. The old secret is immediately invalidated.

**Response (200):**

```json
{
  "secret": "whsec_new-secret-here"
}
```

> **Warning:** After regenerating the secret, you must update it in your receiving application immediately. Any webhooks signed with the old secret will fail validation.

---

### Topics

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

---

#### GET `/webhooks/topics/by-category`

Get topics grouped by category (Orders, Payments, Shipping, etc.).

---

### Deliveries

#### GET `/webhooks/{id}/deliveries`

Get delivery history for a subscription.

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | enum | Filter by status |
| `statuses` | list | Filter by multiple statuses |
| `page` | int | Page number |
| `pageSize` | int | Items per page |

**Delivery statuses:**

| Status | Description |
|--------|-------------|
| `Pending` | Queued for delivery |
| `Sending` | Currently being sent |
| `Succeeded` | Delivered successfully |
| `Failed` | Delivery failed |
| `Retrying` | Failed and queued for retry |
| `Abandoned` | Exhausted all retry attempts |

---

#### GET `/webhooks/deliveries/{id}`

Get full details of a delivery attempt, including request/response headers and bodies.

---

#### POST `/webhooks/deliveries/{id}/retry`

Retry a failed delivery.

---

### Statistics

#### GET `/webhooks/stats`

Get webhook delivery statistics for a time period.

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | DateTime | Start date |
| `to` | DateTime | End date |

---

### Utilities

#### POST `/webhooks/ping`

Ping a URL to test connectivity before creating a subscription.

**Request body:**

```json
{
  "url": "https://example.com/webhooks/test"
}
```

**Response (200):**

```json
{
  "success": true,
  "statusCode": 200,
  "durationMs": 150
}
```

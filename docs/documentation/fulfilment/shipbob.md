# ShipBob Integration

ShipBob is a built-in fulfilment provider that connects Merchello to [ShipBob's](https://www.shipbob.com) global 3PL network. It supports the full range of fulfilment operations: order submission, real-time tracking via webhooks, status polling, product catalog sync, and inventory sync.

## Capabilities

| Feature | Supported |
|---|---|
| Order submission | Yes |
| Order cancellation | Yes |
| Webhook status updates | Yes |
| Status polling | Yes |
| Product sync | Yes |
| Inventory sync | Yes |
| Shipment on submission | No (shipments come via webhooks) |

## Setup

### 1. Get Your ShipBob Credentials

1. Log into your [ShipBob Dashboard](https://app.shipbob.com)
2. Navigate to **Settings** > **Integrations** > **Developer API**
3. Create a new **Personal Access Token** (PAT)
4. Copy the **Channel ID** from your account settings
5. For webhooks, copy the **Webhook Secret** from your webhook configuration

Your PAT needs these scopes:
- `orders_read`, `orders_write` -- Create and manage orders
- `products_read`, `products_write` -- Sync product catalog
- `inventory_read` -- Retrieve inventory levels
- `webhooks_read`, `webhooks_write` -- Configure webhooks

### 2. Configure in Merchello

In the Merchello backoffice, go to **Settings** > **Fulfilment** and add the ShipBob provider. You will be prompted for:

| Field | Required | Description |
|---|---|---|
| Personal Access Token | Yes | Your ShipBob PAT (stored encrypted) |
| Channel ID | Yes | Your ShipBob channel identifier |
| Webhook Secret | No (recommended) | Secret for validating webhook signatures |
| API Version | No | Defaults to `2026-01` |
| Default Fulfillment Center | No | Force all orders to a specific center |
| Debug Logging | No | Log API requests for troubleshooting |

### 3. Configure Shipping Method Mapping

ShipBob maps Merchello's shipping service categories to ShipBob shipping methods. The defaults are:

| Merchello Category | ShipBob Method |
|---|---|
| Standard (4-7 days) | Ground |
| Express (2-3 days) | 2-Day |
| Overnight (next day) | Overnight |
| Economy (8+ days) | Standard |

You can customize these in the provider configuration. If no category mapping matches, the **Default Shipping Method** (default: "Standard") is used.

### 4. Set Up Webhooks

Configure ShipBob to send webhooks to:

```
https://your-site.com/umbraco/merchello/webhooks/fulfilment/shipbob
```

ShipBob supports these webhook events:

| Event | Description |
|---|---|
| `order.shipped` | Order has been shipped with tracking info |
| `order.delivered` | Order has been delivered |
| `order.cancelled` | Order has been cancelled |
| `shipment.created` | New shipment created with tracking details |

> **Warning:** While the webhook secret is optional, it is strongly recommended. Without it, anyone can send fake webhook payloads to your endpoint. ShipBob uses HMAC-SHA256 signature validation.

## How It Works

### Order Submission

When an order is submitted to ShipBob, Merchello:

1. Maps the order to ShipBob's API format (recipient, products, shipping method)
2. Includes internal notes and delivery date as ShipBob order tags
3. Returns the ShipBob order ID as the `ProviderReference`

The response includes extended data: `ShipBobOrderNumber`, `ShipBobReferenceId`, `ShipBobStatus`, and `ShipBobCreatedAt`.

### Order Cancellation

ShipBob cancellation works by cancelling each shipment on the order. Orders that are already `fulfilled`, `completed`, or `delivered` cannot be cancelled.

### Webhook Processing

When ShipBob sends a webhook:

1. The webhook signature is validated using HMAC-SHA256
2. The payload is parsed for order/shipment data
3. Status updates map ShipBob statuses to Merchello order statuses
4. Shipment updates extract tracking number, URL, carrier, and shipped items

### Status Polling

The polling job queries ShipBob for order status updates. It can look up orders by:
- ShipBob order ID (numeric)
- Reference ID (fallback for non-numeric references)

### Product Sync

Product sync is an upsert operation -- it checks if a product exists by SKU and updates it, or creates a new one. The sync sends: name, SKU, barcode, reference ID, and unit price.

### Inventory Sync

Inventory levels are returned per fulfillment center, including:
- **Available quantity** (fulfillable)
- **Reserved quantity** (committed)
- **Incoming quantity** (awaiting)

## Testing

You can simulate webhook events from the backoffice using the webhook simulation feature. ShipBob supports test payloads for:
- Order shipped
- Order delivered
- Order cancelled
- Shipment created

The test payloads include valid HMAC signatures when a webhook secret is configured.

## Troubleshooting

**Connection test fails:**
- Verify your PAT has the required scopes
- Check the Channel ID is correct
- Enable debug logging to see raw API responses

**Webhooks not arriving:**
- Confirm the webhook URL is publicly accessible
- Check ShipBob's webhook delivery history in their dashboard
- Look at the fulfilment webhook logs in Merchello's backoffice

**Orders stuck in submitted status:**
- Ensure webhooks are configured in ShipBob
- The polling job (default: every 15 minutes) will pick up status changes as a fallback

## Related Topics

- [Fulfilment System Overview](fulfilment-overview.md)
- [Supplier Direct Fulfilment](supplier-direct.md)

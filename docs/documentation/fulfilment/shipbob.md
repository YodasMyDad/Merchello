# ShipBob Integration

ShipBob is a built-in fulfilment provider that connects Merchello to [ShipBob's](https://www.shipbob.com) global 3PL network. It supports the full range of fulfilment operations: order submission, real-time tracking via webhooks, status polling, product catalog sync, and inventory sync.

## Capabilities

| Feature | Supported |
| ------- | --------- |
| Order submission | Yes |
| Order cancellation | Yes |
| Webhook status updates | Yes |
| Status polling | Yes |
| Product sync | Yes |
| Inventory sync | Yes |
| Shipment on submission | No (shipments come via webhooks) |

## Configuration Fields

The ShipBob provider requires:

| Field | Required | Description |
| ----- | -------- | ----------- |
| Personal Access Token | Yes | ShipBob PAT (stored encrypted) |
| Channel ID | Yes | ShipBob channel identifier |
| Webhook Secret | No (recommended) | Secret for validating webhook signatures (HMAC-SHA256) |
| API Version | No | Defaults to `2026-01` |
| Default Fulfillment Center | No | Force all orders to a specific center |
| Debug Logging | No | Log API requests for troubleshooting |

Your PAT needs these scopes: `orders_read`, `orders_write`, `products_read`, `products_write`, `inventory_read`, `webhooks_read`, `webhooks_write`.

## Shipping Method Mapping

ShipBob maps Merchello's shipping service categories to ShipBob shipping methods:

| Merchello Category | ShipBob Method |
| ------------------ | -------------- |
| Standard (4-7 days) | Ground |
| Express (2-3 days) | 2-Day |
| Overnight (next day) | Overnight |
| Economy (8+ days) | Standard |

The mapping priority is: category mapping, then default provider method, then raw shipping service code fallback. If no category mapping matches, the default shipping method ("Standard") is used.

## Order Submission

When an order is submitted to ShipBob, Merchello:

1. Maps the order to ShipBob's API format (recipient, products, shipping method)
2. Includes internal notes and delivery date as ShipBob order tags
3. Returns the ShipBob order ID as the `ProviderReference`

The response includes extended data: `ShipBobOrderNumber`, `ShipBobReferenceId`, `ShipBobStatus`, and `ShipBobCreatedAt`.

## Order Cancellation

ShipBob cancellation works by cancelling each shipment on the order. Orders that are already `fulfilled`, `completed`, or `delivered` cannot be cancelled.

## Webhook Processing

Webhooks should be configured to point at:

```text
POST /umbraco/merchello/webhooks/fulfilment/shipbob
```

Supported webhook events:

| Event | Description |
| ----- | ----------- |
| `order.shipped` | Order has been shipped with tracking info |
| `order.delivered` | Order has been delivered |
| `order.cancelled` | Order has been cancelled |
| `shipment.created` | New shipment created with tracking details |

When ShipBob sends a webhook:

1. The webhook signature is validated using HMAC-SHA256
2. The payload is parsed for order/shipment data
3. Status updates map ShipBob statuses to Merchello order statuses
4. Shipment updates extract tracking number, URL, carrier, and shipped items

While the webhook secret is optional, it is strongly recommended. Without it, anyone can send fake webhook payloads to your endpoint.

## Status Polling

The polling job queries ShipBob for order status updates. It can look up orders by ShipBob order ID (numeric) or reference ID (fallback for non-numeric references). This serves as a fallback when webhooks are unreliable -- the polling job runs every 15 minutes by default.

## Product Sync

Product sync is an upsert operation -- it checks if a product exists by SKU and updates it, or creates a new one. The sync sends: name, SKU, barcode, reference ID, and unit price.

## Inventory Sync

Inventory levels are returned per fulfillment center, including:

- **Available quantity** (fulfillable)
- **Reserved quantity** (committed)
- **Incoming quantity** (awaiting)

## Troubleshooting

**Connection test fails:** Verify your PAT has the required scopes and the Channel ID is correct. Enable debug logging to see raw API responses.

**Webhooks not arriving:** Confirm the webhook URL is publicly accessible and check ShipBob's webhook delivery history in their dashboard.

**Orders stuck in submitted status:** Ensure webhooks are configured in ShipBob. The polling job will pick up status changes as a fallback.

## Related Topics

- [Fulfilment System Overview](fulfilment-overview.md)
- [Supplier Direct Fulfilment](supplier-direct.md)

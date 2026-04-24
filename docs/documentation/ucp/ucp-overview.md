# Universal Commerce Protocol (UCP)

The Universal Commerce Protocol (UCP) is an open standard for AI agents to interact with ecommerce systems. Merchello implements UCP through a protocol adapter, allowing AI shopping assistants and automated agents to browse products, manage carts, create checkout sessions, and complete purchases -- all through a standardized API.

> **Security notice:** Enabling UCP exposes transactional endpoints (`/api/v1/checkout-sessions`, `/api/v1/orders`, `/api/v1/carts`) to authenticated external agents. Only turn on the capabilities you need, keep `RequireHttps` enabled in production, and allow-list agent profile URIs via `Ucp:AllowedAgents` rather than `"*"` unless you intentionally want an open store.

## What is UCP?

UCP defines a common language for commerce interactions. Instead of every AI agent needing custom integration code for every ecommerce platform, UCP provides a standard protocol. An agent that speaks UCP can work with any UCP-compatible store.

Key UCP concepts:
- **Discovery** -- Agents find stores and their capabilities via `/.well-known/ucp`
- **Checkout sessions** -- Structured cart-to-payment flows
- **Capability negotiation** -- Server and agent agree on supported features
- **Extensions** -- Optional capabilities like discounts, fulfilment, and buyer consent

## Discovery Manifest

The UCP discovery endpoint lives at:

```
GET /.well-known/ucp
```

This returns a manifest describing your store's UCP capabilities. The manifest includes:
- Store name and description
- Supported capabilities (checkout, orders, identity linking)
- Supported extensions (discounts, fulfilment, buyer consent)
- API endpoints
- Protocol version

### Capability Negotiation

When an agent provides its capabilities in the `UCP-Agent` header, the server returns a **negotiated manifest** -- only the capabilities both sides support. This is UCP's "server-selects" model.

```
GET /.well-known/ucp
UCP-Agent: profile="https://agent.example.com/.well-known/ucp"
```

## Capabilities

Merchello supports these UCP capabilities (configurable in settings):

| Capability | Description |
|---|---|
| `checkout` | Create and manage checkout sessions |
| `order` | Query order status and details |
| `identity_linking` | Link agent identity to customer accounts |

### Extensions

Extensions add optional features to the checkout flow:

| Extension | Description |
|---|---|
| `discount` | Apply discount codes and promotions |
| `fulfillment` | Choose shipping/delivery options |
| `buyer_consent` | Handle terms and consent requirements |
| `ap2_mandates` | Authorization-to-purchase mandates |

## Checkout Sessions

The primary UCP flow is the checkout session. An agent creates a session, adds items, sets addresses, and completes payment. All transactional endpoints are implemented in [`UcpCheckoutSessionsController`](../../../src/Merchello/Controllers/UcpCheckoutSessionsController.cs) and delegate to [`UCPProtocolAdapter`](../../../src/Merchello.Core/Protocols/UCP/UCPProtocolAdapter.cs).

### Session Lifecycle

1. **Create** -- `POST /api/v1/checkout-sessions`
2. **Get** -- `GET /api/v1/checkout-sessions/{id}`
3. **Update** -- `PUT /api/v1/checkout-sessions/{id}` (add items, set addresses, select shipping)
4. **Complete** -- `POST /api/v1/checkout-sessions/{id}/complete` (process payment)
5. **Cancel** -- `POST /api/v1/checkout-sessions/{id}/cancel`

### Session State

Each session tracks:
- Line items with options and quantities
- Shipping and billing addresses
- Selected fulfilment/shipping method
- Applied discounts
- Totals breakdown (subtotal, tax, shipping, total)
- Messages and validation errors
- Status (active, completed, cancelled, expired)

## Cart API (Draft)

The cart API provides pre-checkout exploration. Agents can create carts, add/remove items, and see pricing before committing to a checkout session. Source: [`UcpCartController`](../../../src/Merchello/Controllers/UcpCartController.cs).

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/carts` | POST | Create a cart |
| `/api/v1/carts/{id}` | GET | Get cart state |
| `/api/v1/carts/{id}` | PUT | Update cart (full replacement) |
| `/api/v1/carts/{id}/cancel` | POST | Cancel cart |

## Orders API

Agents can query order status after checkout. Source: [`UcpOrdersController`](../../../src/Merchello/Controllers/UcpOrdersController.cs).

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/orders/{id}` | GET | Get order details in UCP format |

## Catalog API (Draft)

Agents can browse and search the product catalog:

- **Search** -- Query products with filters
- **Lookup** -- Get a specific product or variant by ID

## Agent Authentication

UCP uses the `UCP-Agent` header for agent identification. The header contains a profile URI pointing to the agent's own `/.well-known/ucp` manifest.

Merchello's [`AgentAuthenticationMiddleware`](../../../src/Merchello/Middleware/AgentAuthenticationMiddleware.cs) processes this header to:

1. Parse the agent identity
2. Fetch the agent's profile (if needed)
3. Validate signing keys
4. Attach the identity to the request context

The middleware only activates on UCP paths: `/.well-known/ucp`, `/api/v1/checkout-sessions`, `/api/v1/orders`, `/api/v1/carts`. If `ProtocolSettings:RequireHttps` is enabled it rejects non-HTTPS requests with `400 https_required`, and when `MinimumTlsVersion` is set it enforces the TLS handshake version.

### Signing Keys

UCP uses ES256 (ECDSA with P-256) for request signing. The [`UcpSigningKeyRotationJob`](../../../src/Merchello.Core/Protocols/Webhooks/UcpSigningKeyRotationJob.cs) background service enforces the configured rotation policy (daily check, rotation after `Ucp:SigningKeyRotationDays`, default 90). Setting `SigningKeyRotationDays` to 0 disables automatic rotation.

### OAuth 2.0 Integration

When the Identity Linking capability is enabled, Merchello exposes standard OAuth 2.0 endpoints:

```
GET /.well-known/oauth-authorization-server
```

This returns OAuth 2.0 Authorization Server Metadata (RFC 8414) with:
- Authorization endpoint
- Token endpoint
- Supported scopes (`ucp:scopes:checkout_session`)
- Supported grant types (`authorization_code`, `refresh_token`)
- PKCE support (`S256`)

## Configuration

Configure UCP in `appsettings.json` (binds to [`ProtocolSettings`](../../../src/Merchello.Core/Protocols/Models/ProtocolSettings.cs) / [`UcpSettings`](../../../src/Merchello.Core/Protocols/Models/UcpSettings.cs)):

```json
{
  "Merchello": {
    "Protocol": {
      "ManifestCacheDurationMinutes": 60,
      "RequireHttps": true,
      "MinimumTlsVersion": "Tls12",
      "Ucp": {
        "Version": "2025-04-draft",
        "AllowedAgents": ["*"],
        "SigningKeyRotationDays": 90,
        "WebhookTimeoutSeconds": 30,
        "Capabilities": {
          "Checkout": true,
          "Order": true,
          "IdentityLinking": false
        },
        "Extensions": {
          "Discount": true,
          "Fulfillment": true,
          "BuyerConsent": false,
          "Ap2Mandates": false
        }
      }
    }
  }
}
```

`AllowedAgents` accepts exact agent profile URIs or `"*"` for all. Replace `"*"` with an explicit allow list in production.

## Protocol Adapter Architecture

UCP is implemented through the [`ICommerceProtocolAdapter`](../../../src/Merchello.Core/Protocols/Interfaces/ICommerceProtocolAdapter.cs) interface, which is discovered by Merchello's `ExtensionManager`. The [`UCPProtocolAdapter`](../../../src/Merchello.Core/Protocols/UCP/UCPProtocolAdapter.cs) translates between UCP's protocol format and Merchello's internal checkout/payment models.

The [`ICommerceProtocolManager`](../../../src/Merchello.Core/Protocols/Interfaces/ICommerceProtocolManager.cs) coordinates adapters and handles:

- Protocol support detection
- Manifest generation and caching
- Capability negotiation (server-selects)
- Adapter lifecycle

This architecture means you could implement adapters for other commerce protocols beyond UCP using the same framework.

## Testing

Merchello includes a UCP test agent profile endpoint for development (implemented in [`WellKnownController`](../../../src/Merchello/Controllers/WellKnownController.cs)):

```
GET /.well-known/ucp-test-agent/{agentId}
```

This returns a simulated agent profile with the store's published signing keys and negotiated capabilities, making it easier to test UCP flows without a real agent.

The [`UcpTestApiController`](../../../src/Merchello/Controllers/UcpTestApiController.cs) provides additional testing endpoints backed by [`IUcpFlowTestService`](../../../src/Merchello.Core/Protocols/UCP/Services/Interfaces/IUcpFlowTestService.cs) for validating create/update/complete session flows end-to-end.

## UCP Webhooks

UCP supports webhook notifications for session state changes. These are separate from Merchello's standard [outbound webhooks](../webhooks/webhooks-overview.md) and follow UCP's webhook specification with ES256-signed payloads, dispatched by [`UcpOrderWebhookHandler`](../../../src/Merchello.Core/Protocols/UCP/Handlers/UcpOrderWebhookHandler.cs) (priority 3000).

## Related Topics

- [Checkout](../checkout/)
- [Notification System](../notifications/notification-system.md) (UCP handler priority 3000)
- [Outbound Webhooks](../webhooks/webhooks-overview.md)
- [Background Jobs](../background-jobs/background-jobs.md)
- [Developer reference - docs/UCP.md](../../UCP.md) (internal integration guide)

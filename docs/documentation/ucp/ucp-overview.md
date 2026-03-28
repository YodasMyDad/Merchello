# Universal Commerce Protocol (UCP)

The Universal Commerce Protocol (UCP) is an open standard for AI agents to interact with ecommerce systems. Merchello implements UCP through a protocol adapter, allowing AI shopping assistants and automated agents to browse products, manage carts, create checkout sessions, and complete purchases -- all through a standardized API.

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

The primary UCP flow is the checkout session. An agent creates a session, adds items, sets addresses, and completes payment.

### Session Lifecycle

1. **Create** -- `POST /api/v1/checkout-sessions`
2. **Update** -- `PUT /api/v1/checkout-sessions/{id}` (add items, set addresses, select shipping)
3. **Complete** -- `POST /api/v1/checkout-sessions/{id}/complete` (process payment)
4. **Cancel** -- `DELETE /api/v1/checkout-sessions/{id}`

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

The cart API provides pre-checkout exploration. Agents can create carts, add/remove items, and see pricing before committing to a checkout session.

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/carts` | POST | Create a cart |
| `/api/v1/carts/{id}` | GET | Get cart state |
| `/api/v1/carts/{id}` | PUT | Update cart (full replacement) |
| `/api/v1/carts/{id}` | DELETE | Cancel cart |

## Orders API

Agents can query order status after checkout:

| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/orders/{id}` | GET | Get order details in UCP format |

## Catalog API (Draft)

Agents can browse and search the product catalog:

- **Search** -- Query products with filters
- **Lookup** -- Get a specific product or variant by ID

## Agent Authentication

UCP uses the `UCP-Agent` header for agent identification. The header contains a profile URI pointing to the agent's own `/.well-known/ucp` manifest.

Merchello's `AgentAuthenticationMiddleware` processes this header to:
1. Parse the agent identity
2. Fetch the agent's profile (if needed)
3. Validate signing keys
4. Attach the identity to the request context

### Signing Keys

UCP uses ES256 (ECDSA with P-256) for request signing. The `UcpSigningKeyRotationJob` background service handles key rotation automatically.

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

Configure UCP in `appsettings.json`:

```json
{
  "Merchello": {
    "Protocol": {
      "ManifestCacheDurationMinutes": 60,
      "Ucp": {
        "Version": "2025-04-draft",
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

## Protocol Adapter Architecture

UCP is implemented through the `ICommerceProtocolAdapter` interface, which is discovered by Merchello's `ExtensionManager`. The adapter translates between UCP's protocol format and Merchello's internal models.

The `ICommerceProtocolManager` coordinates adapters and handles:
- Protocol support detection
- Manifest generation
- Capability negotiation
- Adapter lifecycle

This architecture means you could implement adapters for other commerce protocols beyond UCP using the same framework.

## Testing

Merchello includes a UCP test agent profile endpoint for development:

```
GET /.well-known/ucp-test-agent/{agentId}
```

This returns a simulated agent profile with signing keys and capabilities, making it easier to test UCP flows without a real agent.

The `UcpTestApiController` provides additional testing endpoints for validating checkout session flows.

## UCP Webhooks

UCP supports webhook notifications for session state changes. These are separate from Merchello's standard outbound webhooks and follow UCP's webhook specification with ES256 signed payloads.

## Related Topics

- [Checkout](../checkout/)
- [Outbound Webhooks](../webhooks/webhooks-overview.md)
- [Background Jobs](../background-jobs/background-jobs.md)

# Universal Commerce Protocol (UCP) Integration

## Overview

The Universal Commerce Protocol (UCP) is an open-source standard developed by Google in collaboration with Shopify, Stripe, Visa, Mastercard, and other industry leaders. It enables "agentic commerce" - allowing AI agents to conduct commerce on behalf of users.

**Current Status**: Spec version 2026-01-23 (newly released)
**Initial Rollout**: Google AI Mode in Search, Gemini app (US only)
**Timeline**: Global expansion "in coming months"

### What UCP Enables

1. **Discovery** - Merchants publish a manifest at `/.well-known/ucp` describing their capabilities
2. **Checkout Sessions** - AI agents create and manage checkout sessions via standardized API
3. **Payment Handlers** - Separates payment instruments (wallets) from handlers (processors)
4. **Order Lifecycle** - Standardized order tracking, fulfillment updates, and returns
5. **Identity Linking** - OAuth 2.0 based account linking for personalized experiences

### Industry Backing

Co-developed with Google and endorsed by 25+ global partners including:
- **Platforms**: Shopify, Etsy, Wayfair, Target, Walmart
- **Payments**: Stripe, Adyen, Visa, Mastercard, American Express
- **Retailers**: Best Buy, Flipkart, Macy's, The Home Depot, Zalando

---

## Official Resources

- [UCP Specification](https://ucp.dev/specification/overview/)
- [HTTP/REST Binding](https://ucp.dev/specification/checkout-rest/)
- [Google Developers UCP Guide](https://developers.google.com/merchant/ucp)
- [Google Pay Payment Handler](https://developers.google.com/merchant/ucp/guides/google-pay-payment-handler)
- [Business Profile Guide](https://developers.google.com/merchant/ucp/guides/business-profile)
- [Order Lifecycle](https://developers.google.com/merchant/ucp/guides/orders)
- [Identity Linking](https://developers.google.com/merchant/ucp/guides/identity-linking)
- [UCP GitHub Repository](https://github.com/Universal-Commerce-Protocol/ucp)
- [UCP Samples (Python & Node.js)](https://github.com/Universal-Commerce-Protocol/samples)
- [Google Developers Blog - UCP Overview](https://developers.googleblog.com/under-the-hood-universal-commerce-protocol-ucp/)
- [Shopify Engineering - Building UCP](https://shopify.engineering/ucp)

---

## UCP Specification Summary

### Protocol Architecture

UCP implements a **layered protocol design** inspired by TCP/IP:

```
┌─────────────────────────────────────────────────────────┐
│                    Extensions Layer                      │
│   Domain-specific schemas (Discount, Fulfillment, etc.) │
├─────────────────────────────────────────────────────────┤
│                   Capabilities Layer                     │
│    Major functional areas (Checkout, Order, Identity)   │
├─────────────────────────────────────────────────────────┤
│                  Shopping Service Layer                  │
│   Core primitives (session, line items, totals, status) │
└─────────────────────────────────────────────────────────┘
```

### Capabilities & Extensions

**Core Capabilities:**

| Capability | Namespace | Purpose |
|------------|-----------|---------|
| Checkout | `dev.ucp.shopping.checkout` | Cart management, tax calculation, payment |
| Order | `dev.ucp.shopping.order` | Post-purchase lifecycle, fulfillment, adjustments |
| Identity Linking | `dev.ucp.common.identity_linking` | OAuth 2.0 account authorization |

**Extensions (augment Checkout):**

| Extension | Namespace | Purpose |
|-----------|-----------|---------|
| Discount | `dev.ucp.shopping.discount` | Discount code application and validation |
| Fulfillment | `dev.ucp.shopping.fulfillment` | Shipping, pickup, delivery options |
| Buyer Consent | `dev.ucp.shopping.buyer_consent` | Marketing, analytics consent tracking |
| AP2 Mandates | `dev.ucp.shopping.ap2_mandates` | Cryptographic payment authorization |

### Checkout Session States

UCP implements a **three-state checkout machine**:

```
                    ┌──────────────┐
                    │  incomplete  │  Missing required information
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
    ┌───────────────────┐    ┌──────────────────────┐
    │ requires_escalation│    │  ready_for_complete  │
    │  (needs user input)│    │   (can finalize)     │
    └─────────┬─────────┘    └──────────┬───────────┘
              │                         │
              │    ┌───────────────┐    │
              └───►│   completed   │◄───┘
                   └───────────────┘
```

**Status Values:**
- `incomplete` - Missing required information; agent attempts API resolution
- `requires_escalation` - Buyer input needed; agent hands off via `continue_url`
- `ready_for_complete` - All data collected; agent can finalize programmatically
- `complete_in_progress` - Payment processing in progress
- `completed` - Order successfully created
- `canceled` - Session terminated

### REST API Endpoints

All endpoints require HTTPS with **TLS 1.3 minimum**.

| Operation | Method | Route | Purpose |
|-----------|--------|-------|---------|
| Create | POST | `/checkout-sessions` | Initiate checkout |
| Retrieve | GET | `/checkout-sessions/{id}` | Fetch session state |
| Update | PUT | `/checkout-sessions/{id}` | Modify session data |
| Complete | POST | `/checkout-sessions/{id}/complete` | Finalize order |
| Cancel | POST | `/checkout-sessions/{id}/cancel` | Terminate session |

**Example Create Request:**

```http
POST /checkout-sessions HTTP/1.1
Host: merchant.example.com
Content-Type: application/json
UCP-Agent: profile="https://platform.example/profile"
Idempotency-Key: abc123

{
  "line_items": [
    {
      "id": "li_1",
      "item": {
        "id": "product_123",
        "title": "Red T-Shirt",
        "price": 2500
      },
      "quantity": 2
    }
  ],
  "currency": "USD"
}
```

**Example Response:**

```json
{
  "ucp": {
    "version": "2026-01-23",
    "capabilities": [
      {"name": "dev.ucp.shopping.checkout", "version": "2026-01-23"},
      {"name": "dev.ucp.shopping.discount", "version": "2026-01-23"},
      {"name": "dev.ucp.shopping.fulfillment", "version": "2026-01-23"},
      {"name": "dev.ucp.shopping.order", "version": "2026-01-23"}
    ],
    "payment_handlers": [
      {
        "handler_id": "manual:manual",
        "title": "Manual Payment",
        "type": "form"
      }
    ]
  },
  "id": "chk_1234567890",
  "status": "incomplete",
  "currency": "USD",
  "line_items": [...],
  "totals": [
    {"type": "subtotal", "amount": 5000, "currency": "USD"},
    {"type": "tax", "amount": 400, "currency": "USD"},
    {"type": "total", "amount": 5400, "currency": "USD"}
  ],
  "links": [
    {"rel": "terms", "href": "https://merchant.example.com/terms"},
    {"rel": "privacy", "href": "https://merchant.example.com/privacy"}
  ],
  "messages": [
    {
      "type": "error",
      "code": "missing",
      "path": "$.buyer",
      "content": "Buyer information required",
      "severity": "requires_buyer_input"
    }
  ]
}
```

### Authentication & Headers

**Required headers for transactional routes** (`/api/v1/checkout-sessions*`, `/api/v1/orders*`):

| Header | Format | Purpose |
|--------|--------|---------|
| `UCP-Agent` | `profile="https://platform.example/profile"` | Agent identity + profile URI |
| `Request-Signature` | Detached JWT (RFC 7797) | Signature over raw HTTP body bytes |
| `Request-Id` | UUID | Request tracing and replay diagnostics |
| `Idempotency-Key` | Unique string | Required on `POST /checkout-sessions`, `PUT /checkout-sessions/{id}`, `POST /checkout-sessions/{id}/complete` |
| `Content-Type` | `application/json` | Required for request bodies |

**Discovery route behavior** (`/.well-known/ucp`):
- `UCP-Agent` is optional (negotiable endpoint).
- If `UCP-Agent` is provided, version negotiation is applied.

**Inbound signature verification:**
- Signature validation is mandatory for transactional UCP routes.
- Verification uses the exact raw request body + `Request-Signature`.
- Keys are resolved from the agent profile `signing_keys` (top-level or `ucp.signing_keys`).

**Strictness note:**
- Merchello enforces transactional header/signature policy regardless of `RequireAuthentication` legacy settings.

### Data Format Requirements

| Data Type | Format | Example |
|-----------|--------|---------|
| Amounts | Minor units (cents) | `2500` = $25.00 |
| Timestamps | RFC 3339 | `2026-01-15T10:30:00Z` |
| Phone | E.164 | `+14155551234` |
| Country | ISO 3166-1 alpha-2 | `US`, `GB` |
| Currency | ISO 4217 | `USD`, `EUR` |

### Business Profile (Manifest)

Published at `/.well-known/ucp`:

```json
{
  "ucp": {
    "version": "2026-01-23",
    "services": {
      "shopping": {
        "rest": {
          "endpoint": "https://merchant.example.com/api/v1",
          "schema": "https://ucp.dev/services/shopping/rest.openapi.json"
        }
      }
    },
    "capabilities": [
      {
        "name": "dev.ucp.shopping.checkout",
        "version": "2026-01-23",
        "spec": "https://ucp.dev/specification/checkout/",
        "schema": "https://ucp.dev/schemas/shopping/checkout.json"
      },
      {
        "name": "dev.ucp.shopping.discount",
        "version": "2026-01-23",
        "spec": "https://ucp.dev/specification/discount/",
        "schema": "https://ucp.dev/schemas/shopping/discount.json",
        "extends": "dev.ucp.shopping.checkout"
      },
      {
        "name": "dev.ucp.shopping.fulfillment",
        "version": "2026-01-23",
        "spec": "https://ucp.dev/specification/fulfillment/",
        "schema": "https://ucp.dev/schemas/shopping/fulfillment.json",
        "extends": "dev.ucp.shopping.checkout"
      }
    ]
  },
  "payment": {
    "handlers": [...]
  },
  "signing_keys": [
    {
      "kty": "EC",
      "kid": "key-2026-01",
      "crv": "P-256",
      "x": "...",
      "y": "...",
      "use": "sig",
      "alg": "ES256"
    }
  ]
}
```

---

## UCP Capabilities Detail

### Discount Extension

Enables discount code application during checkout.

**Structure:**

```json
{
  "discounts": {
    "codes": ["SAVE20"],
    "applied": [
      {
        "code": "SAVE20",
        "title": "20% Off Order",
        "amount": 1000,
        "automatic": false,
        "method": "across",
        "priority": 1,
        "allocation": [
          {
            "target": "$.line_items[0]",
            "amount": 500
          },
          {
            "target": "$.line_items[1]",
            "amount": 500
          }
        ]
      }
    ]
  }
}
```

**Allocation Methods:**
- `each` - Applied independently per eligible item
- `across` - Split proportionally by value across targets

**Rejection Codes:**
- `discount_code_expired`
- `discount_code_invalid`
- `discount_code_already_applied`
- `discount_code_combination_disallowed`
- `discount_code_user_not_logged_in`
- `discount_code_user_ineligible`

### Fulfillment Extension

Enables shipping and pickup options during checkout.

**Structure:**

```json
{
  "fulfillment": {
    "methods": [
      {
        "type": "shipping",
        "line_item_ids": ["li_1", "li_2"],
        "destinations": [
          {
            "type": "postal_address",
            "address": {...}
          }
        ],
        "groups": [
          {
            "id": "grp_1",
            "line_item_ids": ["li_1", "li_2"],
            "selected_option_id": "dyn:fedex:FEDEX_GROUND",
            "options": [
              {
                "id": "so:7f6a5f48-8b96-4fd0-8f27-1afaa79fe6ec",
                "title": "Standard Shipping",
                "description": "5-7 business days",
                "totals": [
                  {"type": "fulfillment", "amount": 599}
                ],
                "earliest_fulfillment_time": "2026-01-20",
                "latest_fulfillment_time": "2026-01-22"
              },
              {
                "id": "dyn:fedex:FEDEX_2_DAY",
                "title": "Express Shipping",
                "description": "2-3 business days",
                "totals": [
                  {"type": "fulfillment", "amount": 1299}
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

Selection key contract:
- Flat-rate options: `so:{guid}`
- Dynamic provider options: `dyn:{provider}:{serviceCode}`

**Method Types:**
- `shipping` - Delivery to address
- `pickup` - Collection from retail location

### Order Capability

Post-purchase order lifecycle management via webhooks.

**Order Structure:**

```json
{
  "id": "ord_123",
  "checkout_id": "chk_456",
  "permalink_url": "https://merchant.example.com/orders/ord_123",
  "line_items": [
    {
      "id": "li_1",
      "item": {"id": "prod_1", "title": "T-Shirt", "price": 2500},
      "quantity": {"total": 2, "fulfilled": 1},
      "totals": {"subtotal": 5000, "total": 5000},
      "status": "partial"
    }
  ],
  "fulfillment": {
    "expectations": [...],
    "events": [
      {
        "occurred_at": "2026-01-16T14:30:00Z",
        "type": "shipped",
        "line_items": [{"id": "li_1", "quantity": 1}],
        "tracking": {
          "number": "1Z999AA10123456784",
          "url": "https://tracking.example.com/..."
        }
      }
    ]
  },
  "adjustments": [
    {
      "type": "refund",
      "amount": 2500,
      "status": "completed",
      "line_items": [{"id": "li_1", "quantity": 1}]
    }
  ]
}
```

**Fulfillment Event Types:**
- `processing`, `shipped`, `in_transit`, `delivered`
- `failed_attempt`, `canceled`, `undeliverable`, `returned_to_sender`

**Adjustment Types:**
- `refund`, `return`, `credit`, `price_adjustment`, `dispute`, `cancellation`

**Webhook Requirements:**
- Sign all payloads using detached JWT (RFC 7797)
- Include `Request-Signature` header with key ID
- Send complete order entity on updates (not deltas)
- Platform responds with 2xx status codes

### Identity Linking Capability

> **Status: Future Capability**
>
> Identity Linking infrastructure is in place (configuration toggle, OAuth metadata endpoint),
> but the OAuth authorization, token, and revocation endpoints (`/oauth/authorize`, `/oauth/token`,
> `/oauth/revoke`) are not yet implemented. Keep `IdentityLinking: false` in configuration until
> full implementation is complete.

OAuth 2.0 based account authorization.

**Requirements (for future implementation):**
- Implement OAuth 2.0 Authorization Code flow (RFC 6749 4.1)
- Publish metadata at `/.well-known/oauth-authorization-server`
- Support HTTP Basic Authentication at Token Endpoint
- Implement token revocation (RFC 7009)

**Scope:**
```
ucp:scopes:checkout_session
```
Grants: Get, Create, Update, Delete, Cancel, Complete operations.

---

## Payment Handler Model

UCP separates **instruments** (what consumers use) from **handlers** (processing specifications).

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Platform     │     │    Business     │     │  Credential     │
│  (Agent/App)    │     │   (Merchant)    │     │   Provider      │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │  1. Discover handlers │                       │
         │◄──────────────────────┤                       │
         │                       │                       │
         │  2. Acquire credential│                       │
         │──────────────────────────────────────────────►│
         │                       │                       │
         │  3. Return opaque token                       │
         │◄──────────────────────────────────────────────┤
         │                       │                       │
         │  4. Submit to complete│                       │
         │──────────────────────►│                       │
         │                       │                       │
         │                       │  5. Process via PSP   │
         │                       │──────────────────────►│
```

### Handler Structure

```json
{
  "payment": {
    "handlers": [
      {
        "id": "com.google.pay",
        "name": "Google Pay",
        "config_schema": {...},
        "instrument_schemas": [
          {"type": "card_payment_instrument"}
        ],
        "tokenization": {
          "type": "PUSH",
          "gateway": "stripe",
          "gateway_merchant_id": "acct_xxx"
        }
      }
    ]
  }
}
```

### Google Pay Handler Example

```json
{
  "id": "com.google.pay",
  "version": "2026-01-23",
  "config": {
    "api_version": 2,
    "api_version_minor": 0,
    "environment": "PRODUCTION",
    "merchant_info": {
      "merchant_name": "Example Store",
      "merchant_id": "BCR2DN4T...",
      "merchant_origin": "https://merchant.example.com"
    },
    "allowed_payment_methods": [
      {
        "type": "CARD",
        "parameters": {
          "allowed_auth_methods": ["PAN_ONLY", "CRYPTOGRAM_3DS"],
          "allowed_card_networks": ["VISA", "MASTERCARD"]
        },
        "tokenization_specification": {
          "type": "PAYMENT_GATEWAY",
          "parameters": {
            "gateway": "stripe",
            "gateway_merchant_id": "acct_xxx"
          }
        }
      }
    ]
  }
}
```

---

## Merchello Compatibility Assessment

### High Compatibility

| UCP Concept | Merchello Equivalent | Notes |
|-------------|---------------------|-------|
| Checkout session | `CheckoutSession` + `Basket` | Similar session-based model |
| Line items | `Basket.LineItems` | Direct mapping |
| Buyer info | `CheckoutSession` addresses | Same data structure |
| Discounts | `IDiscountEngine` | Codes and automatic discounts |
| Fulfillment | `IShippingService` | Warehouse-based shipping groups |
| Order lifecycle | Invoice + Notifications | Event system exists |
| Totals structure | `CheckoutTotalsDto` | Same breakdown pattern |

### Requires New Implementation

| UCP Concept | Status | Notes |
|-------------|--------|-------|
| `/.well-known/ucp` manifest | Not implemented | Needs new endpoint |
| Payment handlers | Partial | Different model than payment providers |
| Capability negotiation | Not implemented | Server-selects model |
| Agent authentication | Not implemented | `UCP-Agent` header parsing |
| Request signatures | Not implemented | JWT signing/verification |
| Identity linking | Not implemented | OAuth 2.0 integration |

---

## Implementation Strategy

Merchello adopts a **foundation-first approach** - building extensibility infrastructure that:

1. Benefits Merchello regardless of UCP adoption
2. Makes future UCP integration straightforward
3. Avoids wasted effort if the UCP spec evolves

When UCP stabilizes, full implementation requires only:
- Creating protocol-specific adapter classes
- Adding UCP DTOs and mapping
- Registering in dependency injection

---

## Architecture

### Protocol Adapter Pattern

```
                    ┌─────────────────────────────────────┐
                    │     External Protocol Request        │
                    │    (UCP, future protocols)           │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────▼───────────────────┐
                    │    AgentAuthenticationMiddleware     │
                    │    (validates agent identity)        │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────▼───────────────────┐
                    │    CommerceProtocolManager           │
                    │    (routes to correct adapter)       │
                    └─────────────────┬───────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
┌─────────▼─────────┐     ┌──────────▼──────────┐     ┌─────────▼─────────┐
│ UCPProtocolAdapter │     │  FutureProtocol     │     │  AnotherProtocol  │
│ (when implemented) │     │      Adapter        │     │      Adapter      │
└─────────┬─────────┘     └──────────┬──────────┘     └─────────┬─────────┘
          │                           │                           │
          └───────────────────────────┼───────────────────────────┘
                                      │
                    ┌─────────────────▼───────────────────┐
                    │   CheckoutSessionState (shared)      │
                    │   Protocol-agnostic model            │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────▼───────────────────┐
                    │        CheckoutService               │
                    │   (existing Merchello service)       │
                    └─────────────────────────────────────┘
```

### ExtensionManager Integration

Protocol adapters are discovered using Merchello's existing `ExtensionManager` pattern:

```csharp
// Discovery flow (consistent with other providers)
ExtensionManager → scan assemblies → discover ICommerceProtocolAdapter → DI create → cache

// Similar to existing patterns:
// - IShippingProvider → ShippingProviderManager
// - IPaymentProvider → PaymentProviderManager
// - ITaxProvider → TaxProviderManager
// - ICommerceProtocolAdapter → CommerceProtocolManager
```

### File Structure

```
src/Merchello.Core/Protocols/
├── Interfaces/
│   ├── ICommerceProtocolAdapter.cs      # Protocol adapter contract
│   ├── ICommerceProtocolManager.cs      # Adapter registry contract
│   ├── IAgentAuthenticator.cs           # Agent auth contract
│   └── IWebhookSigner.cs                # Webhook signing contract
├── CommerceProtocolManager.cs           # Adapter registry implementation
├── CommerceProtocolAdapterMetadata.cs   # Provider metadata
├── ProtocolConstants.cs                 # Well-known paths, capability names
├── ProtocolResponse.cs                  # Standardized API responses
├── Models/
│   ├── CheckoutSessionState.cs          # Protocol-agnostic session
│   ├── CheckoutLineItemState.cs         # Line item representation
│   ├── CheckoutAddressState.cs          # Address representation
│   ├── CheckoutTotalsState.cs           # Totals representation
│   ├── CheckoutDiscountState.cs         # Discount representation
│   ├── CheckoutFulfillmentState.cs      # Fulfillment representation
│   ├── CheckoutMessageState.cs          # Validation messages
│   ├── ProtocolCapability.cs            # Capability declaration
│   ├── ProtocolPaymentHandler.cs        # Payment handler info
│   └── ProtocolSettings.cs              # Protocol configuration
├── Authentication/
│   ├── AgentAuthenticationResult.cs     # Auth result model
│   ├── AgentIdentity.cs                 # Authenticated agent info
│   └── UcpAgentHeaderParser.cs          # UCP-Agent header parser (RFC 8941, uses StructuredFieldValues)
├── Payments/
│   ├── IPaymentHandlerExporter.cs       # Payment export contract
│   └── PaymentHandlerExporter.cs        # Export implementation
├── Webhooks/
│   ├── ISigningKeyStore.cs              # Signing key storage contract
│   ├── IWebhookSigner.cs                # Webhook signing contract
│   ├── SigningKeyStore.cs               # P-256 ECDSA key management (DB-backed)
│   ├── WebhookSigner.cs                 # RFC 7797 detached JWT signing
│   ├── Models/
│   │   └── SigningKey.cs                # EF Core entity for key persistence
│   └── Mapping/
│       └── SigningKeyDbMapping.cs       # EF Core configuration
├── UCP/
│   └── UCPProtocolAdapter.cs            # UCP protocol implementation
└── Notifications/
    ├── AgentAuthenticatingNotification.cs
    ├── AgentAuthenticatedNotification.cs
    ├── ProtocolSessionCreatingNotification.cs
    ├── ProtocolSessionCreatedNotification.cs
    ├── ProtocolSessionUpdatingNotification.cs
    ├── ProtocolSessionUpdatedNotification.cs
    ├── ProtocolSessionCompletingNotification.cs
    ├── ProtocolSessionCompletedNotification.cs
    ├── ProtocolWebhookSendingNotification.cs
    └── ProtocolWebhookSentNotification.cs

src/Merchello/
├── Controllers/
│   ├── WellKnownController.cs           # /.well-known/{protocol} endpoint
│   ├── UcpCheckoutSessionsController.cs # /api/v1/checkout-sessions endpoints
│   └── UcpOrdersController.cs           # /api/v1/orders endpoints
└── Middleware/
    └── AgentAuthenticationMiddleware.cs # Request authentication
```

---

## Integration with Merchello Providers

The protocol adapter infrastructure sits **above** existing services. It does **not** replace providers - it exposes them to external protocols.

### Provider Architecture Overview

```
                    ┌─────────────────────────────────────┐
                    │     External Protocol Request        │
                    │         (e.g., UCP Agent)            │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────▼───────────────────┐
                    │    ICommerceProtocolAdapter          │
                    │    (translates protocol format)      │
                    └─────────────────┬───────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
┌─────────▼─────────┐     ┌──────────▼──────────┐     ┌─────────▼─────────┐
│  IPaymentProvider  │     │ IShippingProvider   │     │   ITaxProvider    │
│      Manager       │     │      Manager        │     │      Manager      │
└─────────┬─────────┘     └──────────┬──────────┘     └─────────┬─────────┘
          │                           │                           │
          ▼                           ▼                           ▼
┌─────────────────┐       ┌──────────────────┐       ┌───────────────────┐
│ Stripe, Braintree│       │ FedEx, UPS, etc. │       │ Manual, Avalara   │
│ PayPal, Manual   │       │ Flat-rate, Table │       │ TaxJar, etc.      │
└─────────────────┘       └──────────────────┘       └───────────────────┘
```

### Payment Provider Export

UCP's "payment handler" model differs from Merchello's payment provider model. The `IPaymentHandlerExporter` bridges this gap:

**Merchello Model:**
- Providers (Stripe, Braintree) contain multiple payment methods
- Each method has an `IntegrationType` (Redirect, HostedFields, ExpressCheckout)
- Configuration is provider-level

**UCP Model:**
- Payment handlers are specifications (how to process an instrument)
- Instruments are payment methods (credit card, Apple Pay)
- Handlers are advertised per checkout session

**Mapping:**

```csharp
public class PaymentHandlerExporter : IPaymentHandlerExporter
{
    private readonly IPaymentProviderManager _paymentProviderManager;

    public async Task<IReadOnlyList<ProtocolPaymentHandler>> ExportHandlersAsync(
        string protocolName,
        CancellationToken ct)
    {
        if (protocolName != "ucp") return [];

        var handlers = new List<ProtocolPaymentHandler>();

        foreach (var provider in _paymentProviderManager.GetEnabledProviders())
        {
            foreach (var method in provider.GetAvailablePaymentMethods())
            {
                handlers.Add(new ProtocolPaymentHandler
                {
                    HandlerId = $"{provider.Metadata.Alias}:{method.Alias}",
                    Name = method.Name,
                    Type = MapIntegrationType(method.IntegrationType),
                    SupportsExpressCheckout = method.SupportsExpressCheckout,
                    InstrumentSchemas = MapInstruments(method)
                });
            }
        }

        return handlers;
    }

    private static string MapIntegrationType(PaymentIntegrationType type) => type switch
    {
        PaymentIntegrationType.Redirect => "redirect",
        PaymentIntegrationType.HostedFields => "tokenized",
        PaymentIntegrationType.ExpressCheckout => "wallet",
        PaymentIntegrationType.DirectForm => "form",
        _ => "unknown"
    };
}
```

### Shipping Provider Export

Protocol adapters expose shipping options calculated by Merchello's shipping providers:

```csharp
public class ShippingOptionExporter
{
    private readonly IShippingService _shippingService;

    public async Task<CheckoutFulfillmentState> GetFulfillmentStateAsync(
        CheckoutSessionState session,
        CancellationToken ct)
    {
        var result = await _shippingService.GetShippingOptionsForBasket(
            basketId: Guid.Parse(session.SessionId),
            shippingAddress: MapAddress(session.ShippingAddress),
            ct);

        return new CheckoutFulfillmentState
        {
            Methods =
            [
                new FulfillmentMethodState
                {
                    Type = "shipping",
                    LineItemIds = session.LineItems.Select(li => li.LineItemId).ToList(),
                    Groups = result.WarehouseGroups.Select(g => new FulfillmentGroupState
                    {
                        GroupId = g.WarehouseId.ToString(),
                        GroupName = g.WarehouseName,
                        LineItemIds = g.LineItems.Select(li => li.Id.ToString()).ToList(),
                        Options = g.AvailableShippingOptions.Select(opt => new FulfillmentOptionState
                        {
                            OptionId = opt.ShippingOptionId.ToString(),
                            Title = opt.Name,
                            Description = opt.Description,
                            Amount = opt.Cost,
                            Currency = session.Currency,
                            EstimatedDeliveryDays = opt.EstimatedDeliveryDays
                        }).ToList()
                    }).ToList()
                }
            ]
        };
    }
}
```

### Tax Provider Integration

Tax calculation is handled transparently - the protocol adapter uses `CheckoutService` which internally calls the configured `ITaxProvider`:

```csharp
// In UCPProtocolAdapter (future implementation)
public async Task<ProtocolResponse> UpdateSessionAsync(
    string sessionId,
    object request,
    AgentIdentity? agent,
    CancellationToken ct)
{
    var ucpRequest = (UCPUpdateSessionRequest)request;

    // Save addresses via CheckoutService
    // (internally calculates tax using configured ITaxProvider)
    var result = await _checkoutService.SaveAddressesAsync(new SaveAddressesParameters
    {
        BasketId = Guid.Parse(sessionId),
        BillingAddress = MapAddress(ucpRequest.BuyerInfo.BillingAddress),
        ShippingAddress = MapAddress(ucpRequest.BuyerInfo.ShippingAddress),
        ShippingSameAsBilling = ucpRequest.BuyerInfo.ShippingSameAsBilling
    }, ct);

    var state = await _checkoutService.GetSessionStateAsync(Guid.Parse(sessionId), ct);

    return ProtocolResponse.Ok(MapToUCPSession(state));
}
```

---

## Core Interfaces

### ICommerceProtocolAdapter

```csharp
namespace Merchello.Core.Protocols.Interfaces;

/// <summary>
/// Adapter for translating between external commerce protocols and Merchello's internal models.
/// Implement this interface for each protocol (UCP, etc.) to enable agent-based commerce.
/// </summary>
public interface ICommerceProtocolAdapter
{
    /// <summary>
    /// Provider metadata for ExtensionManager discovery.
    /// Contains Alias, DisplayName, Version, and capability flags.
    /// </summary>
    CommerceProtocolAdapterMetadata Metadata { get; }

    /// <summary>
    /// Whether this adapter is enabled and ready to handle requests.
    /// </summary>
    bool IsEnabled { get; }

    /// <summary>
    /// Generates the protocol manifest/profile for discovery.
    /// For UCP: Returns the /.well-known/ucp profile JSON.
    /// </summary>
    Task<object> GenerateManifestAsync(CancellationToken ct = default);

    /// <summary>
    /// Creates a new checkout session from a protocol-specific request.
    /// </summary>
    Task<ProtocolResponse> CreateSessionAsync(
        object request,
        AgentIdentity? agentIdentity,
        CancellationToken ct = default);

    /// <summary>
    /// Retrieves a checkout session in protocol-specific format.
    /// </summary>
    Task<ProtocolResponse> GetSessionAsync(
        string sessionId,
        AgentIdentity? agentIdentity,
        CancellationToken ct = default);

    /// <summary>
    /// Updates a checkout session from a protocol-specific request.
    /// </summary>
    Task<ProtocolResponse> UpdateSessionAsync(
        string sessionId,
        object request,
        AgentIdentity? agentIdentity,
        CancellationToken ct = default);

    /// <summary>
    /// Completes a checkout session (payment processing).
    /// </summary>
    Task<ProtocolResponse> CompleteSessionAsync(
        string sessionId,
        object paymentData,
        AgentIdentity? agentIdentity,
        CancellationToken ct = default);

    /// <summary>
    /// Cancels a checkout session.
    /// </summary>
    Task<ProtocolResponse> CancelSessionAsync(
        string sessionId,
        AgentIdentity? agentIdentity,
        CancellationToken ct = default);

    /// <summary>
    /// Retrieves an order in protocol-specific format.
    /// </summary>
    Task<ProtocolResponse> GetOrderAsync(
        string orderId,
        AgentIdentity? agentIdentity,
        CancellationToken ct = default);

    /// <summary>
    /// Gets available payment handlers in protocol-specific format.
    /// </summary>
    Task<object> GetPaymentHandlersAsync(
        string? sessionId,
        CancellationToken ct = default);

    /// <summary>
    /// Filters the manifest to the intersection of agent and business capabilities.
    /// Implements UCP's "server-selects" negotiation model where the business
    /// returns only capabilities both parties support.
    /// Returns null if no common capabilities exist.
    /// </summary>
    Task<object?> NegotiateCapabilitiesAsync(
        object fullManifest,
        IReadOnlyList<string> agentCapabilities,
        CancellationToken ct = default);
}
```

### CommerceProtocolAdapterMetadata

```csharp
namespace Merchello.Core.Protocols;

/// <summary>
/// Metadata describing a protocol adapter.
/// Follows existing provider patterns (TaxProviderMetadata, PaymentProviderMetadata).
/// </summary>
public record CommerceProtocolAdapterMetadata(
    /// <summary>
    /// Unique identifier for the protocol (e.g., "ucp").
    /// Case-insensitive, used for routing and configuration.
    /// </summary>
    string Alias,

    /// <summary>
    /// Human-readable name for the protocol.
    /// </summary>
    string DisplayName,

    /// <summary>
    /// Protocol version this adapter implements (YYYY-MM-DD format).
    /// </summary>
    string Version,

    /// <summary>
    /// Optional icon for backoffice display.
    /// </summary>
    string? Icon = null,

    /// <summary>
    /// Optional description of the protocol.
    /// </summary>
    string? Description = null,

    /// <summary>
    /// Whether this adapter supports the Identity Linking capability.
    /// </summary>
    bool SupportsIdentityLinking = false,

    /// <summary>
    /// Whether this adapter supports Order lifecycle webhooks.
    /// </summary>
    bool SupportsOrderWebhooks = false,

    /// <summary>
    /// Setup instructions for backoffice display.
    /// </summary>
    string? SetupInstructions = null
);
```

### ICommerceProtocolManager

```csharp
namespace Merchello.Core.Protocols.Interfaces;

/// <summary>
/// Manages registration and resolution of commerce protocol adapters.
/// Uses ExtensionManager pattern for discovery.
/// </summary>
public interface ICommerceProtocolManager
{
    /// <summary>
    /// Gets all registered protocol adapters (cached).
    /// Use GetAdaptersAsync() for initial load.
    /// </summary>
    IReadOnlyList<ICommerceProtocolAdapter> Adapters { get; }

    /// <summary>
    /// Loads all protocol adapters asynchronously.
    /// Call during startup; results are cached in Adapters property.
    /// </summary>
    Task<IReadOnlyList<ICommerceProtocolAdapter>> GetAdaptersAsync(CancellationToken ct = default);

    /// <summary>
    /// Gets an adapter by alias (case-insensitive).
    /// </summary>
    ICommerceProtocolAdapter? GetAdapter(string alias);

    /// <summary>
    /// Checks if a protocol alias is supported.
    /// </summary>
    bool IsProtocolSupported(string alias);

    /// <summary>
    /// Gets all enabled protocol aliases.
    /// </summary>
    IReadOnlyList<string> GetEnabledProtocols();

    /// <summary>
    /// Gets cached manifest for a protocol (full, unfiltered).
    /// </summary>
    Task<object?> GetCachedManifestAsync(string alias, CancellationToken ct = default);

    /// <summary>
    /// Gets manifest filtered to the intersection of agent and business capabilities.
    /// Implements UCP's "server-selects" negotiation model.
    /// </summary>
    Task<object?> GetNegotiatedManifestAsync(
        string alias,
        AgentIdentity? agent,
        CancellationToken ct = default);
}
```

### IAgentAuthenticator

```csharp
namespace Merchello.Core.Protocols.Authentication;

/// <summary>
/// Authenticates external agents making protocol requests.
/// </summary>
public interface IAgentAuthenticator
{
    /// <summary>
    /// Protocol alias this authenticator handles (e.g., "ucp").
    /// </summary>
    string Alias { get; }

    /// <summary>
    /// Authenticates an incoming request.
    /// For UCP: Parses UCP-Agent header (RFC 8941 Dictionary Structured Field), validates signatures.
    /// </summary>
    Task<AgentAuthenticationResult> AuthenticateAsync(
        HttpRequest request,
        CancellationToken ct = default);
}
```

### IWebhookSigner

```csharp
namespace Merchello.Core.Protocols.Webhooks;

/// <summary>
/// Signs and verifies webhook payloads using detached JWT (RFC 7797).
/// </summary>
public interface IWebhookSigner
{
    /// <summary>
    /// Signs a webhook payload.
    /// </summary>
    /// <param name="payload">JSON payload to sign</param>
    /// <param name="keyId">Key ID from signing_keys</param>
    /// <returns>Detached JWT signature</returns>
    string Sign(string payload, string keyId);

    /// <summary>
    /// Verifies a webhook signature.
    /// </summary>
    /// <param name="payload">JSON payload</param>
    /// <param name="signature">Request-Signature header value</param>
    /// <param name="signingKeys">Public keys from /.well-known/ucp</param>
    bool Verify(string payload, string signature, IReadOnlyList<JsonWebKey> signingKeys);
}
```

---

## Protocol-Agnostic Models

### CheckoutSessionState

```csharp
namespace Merchello.Core.Protocols.Models;

/// <summary>
/// Protocol-agnostic representation of a checkout session.
/// </summary>
public class CheckoutSessionState
{
    public required string SessionId { get; init; }

    /// <summary>
    /// Session status: incomplete, requires_escalation, ready_for_complete,
    /// complete_in_progress, completed, canceled
    /// </summary>
    public required string Status { get; init; }

    public required DateTimeOffset CreatedAt { get; init; }
    public required DateTimeOffset UpdatedAt { get; init; }
    public DateTimeOffset? ExpiresAt { get; init; }

    /// <summary>
    /// ISO 4217 currency code.
    /// </summary>
    public required string Currency { get; init; }

    public required IReadOnlyList<CheckoutLineItemState> LineItems { get; init; }
    public CheckoutAddressState? BillingAddress { get; init; }
    public CheckoutAddressState? ShippingAddress { get; init; }
    public bool ShippingSameAsBilling { get; init; }

    public IReadOnlyList<CheckoutDiscountState> Discounts { get; init; } = [];
    public CheckoutFulfillmentState? Fulfillment { get; init; }
    public required CheckoutTotalsState Totals { get; init; }

    /// <summary>
    /// Validation messages (errors, warnings, info).
    /// </summary>
    public IReadOnlyList<CheckoutMessageState> Messages { get; init; } = [];

    /// <summary>
    /// URL for escalation handoff when status is requires_escalation.
    /// </summary>
    public string? ContinueUrl { get; init; }

    /// <summary>
    /// Available payment handlers.
    /// </summary>
    public IReadOnlyList<ProtocolPaymentHandler> PaymentHandlers { get; init; } = [];

    public string? BuyerEmail { get; init; }
    public IReadOnlyDictionary<string, object>? Metadata { get; init; }
}
```

### CheckoutLineItemState

```csharp
namespace Merchello.Core.Protocols.Models;

public class CheckoutLineItemState
{
    public required string LineItemId { get; init; }
    public string? ProductId { get; init; }
    public string? VariantId { get; init; }
    public required string Sku { get; init; }
    public required string Name { get; init; }
    public string? Description { get; init; }
    public required int Quantity { get; init; }

    /// <summary>
    /// Unit price in minor units (cents).
    /// </summary>
    public required long UnitPrice { get; init; }

    /// <summary>
    /// Line total in minor units (quantity * unit price).
    /// </summary>
    public required long LineTotal { get; init; }

    public long DiscountAmount { get; init; }
    public long TaxAmount { get; init; }
    public required long FinalTotal { get; init; }
    public bool RequiresShipping { get; init; } = true;
    public string? ImageUrl { get; init; }
    public string? ProductUrl { get; init; }
    public IReadOnlyList<CheckoutLineItemOption>? SelectedOptions { get; init; }
}

public class CheckoutLineItemOption
{
    public required string Name { get; init; }
    public required string Value { get; init; }
}
```

### CheckoutTotalsState

```csharp
namespace Merchello.Core.Protocols.Models;

public class CheckoutTotalsState
{
    /// <summary>
    /// All amounts in minor units (cents).
    /// </summary>
    public required long Subtotal { get; init; }
    public long ItemsDiscount { get; init; }
    public long Discount { get; init; }
    public long Fulfillment { get; init; }
    public long Tax { get; init; }
    public required long Total { get; init; }
    public required string Currency { get; init; }

    public IReadOnlyList<CheckoutTotalBreakdown>? Breakdown { get; init; }
}

public class CheckoutTotalBreakdown
{
    public required string Label { get; init; }
    public required long Amount { get; init; }

    /// <summary>
    /// Type: items_discount, subtotal, discount, fulfillment, tax, fee, total
    /// </summary>
    public required string Type { get; init; }
}
```

### CheckoutAddressState

```csharp
namespace Merchello.Core.Protocols.Models;

public class CheckoutAddressState
{
    public string? FirstName { get; init; }
    public string? LastName { get; init; }
    public string? Company { get; init; }
    public string? Address1 { get; init; }
    public string? Address2 { get; init; }
    public string? City { get; init; }

    /// <summary>
    /// State/Province name.
    /// </summary>
    public string? Region { get; init; }

    /// <summary>
    /// State/Province code.
    /// </summary>
    public string? RegionCode { get; init; }

    public string? PostalCode { get; init; }
    public string? Country { get; init; }

    /// <summary>
    /// ISO 3166-1 alpha-2 country code.
    /// </summary>
    public string? CountryCode { get; init; }

    /// <summary>
    /// E.164 format phone number.
    /// </summary>
    public string? Phone { get; init; }

    public string? Email { get; init; }
}
```

### CheckoutDiscountState

```csharp
namespace Merchello.Core.Protocols.Models;

public class CheckoutDiscountState
{
    public required string DiscountId { get; init; }
    public string? Code { get; init; }
    public required string Name { get; init; }

    /// <summary>
    /// Type: percentage, fixed_amount, free_shipping, buy_x_get_y
    /// </summary>
    public required string Type { get; init; }

    /// <summary>
    /// Amount in minor units (cents).
    /// </summary>
    public required long Amount { get; init; }

    public bool IsAutomatic { get; init; }

    /// <summary>
    /// Allocation method: each, across
    /// </summary>
    public string? Method { get; init; }

    public int? Priority { get; init; }
    public IReadOnlyList<DiscountAllocation>? Allocation { get; init; }
}

public class DiscountAllocation
{
    /// <summary>
    /// JSONPath target (e.g., $.line_items[0])
    /// </summary>
    public required string Target { get; init; }

    public required long Amount { get; init; }
}
```

### CheckoutFulfillmentState

```csharp
namespace Merchello.Core.Protocols.Models;

public class CheckoutFulfillmentState
{
    public required IReadOnlyList<FulfillmentMethodState> Methods { get; init; }
}

public class FulfillmentMethodState
{
    /// <summary>
    /// Type: shipping, pickup
    /// </summary>
    public required string Type { get; init; }

    public required IReadOnlyList<string> LineItemIds { get; init; }
    public IReadOnlyList<FulfillmentDestinationState>? Destinations { get; init; }
    public required IReadOnlyList<FulfillmentGroupState> Groups { get; init; }
}

public class FulfillmentGroupState
{
    public required string GroupId { get; init; }
    public string? GroupName { get; init; }
    public required IReadOnlyList<string> LineItemIds { get; init; }
    public string? SelectedOptionId { get; init; }
    public required IReadOnlyList<FulfillmentOptionState> Options { get; init; }
}

public class FulfillmentOptionState
{
    public required string OptionId { get; init; }
    public required string Title { get; init; }
    public string? Description { get; init; }

    /// <summary>
    /// Amount in minor units (cents).
    /// </summary>
    public required long Amount { get; init; }

    public required string Currency { get; init; }
    public string? EarliestFulfillmentTime { get; init; }
    public string? LatestFulfillmentTime { get; init; }
    public int? EstimatedDeliveryDays { get; init; }
}

public class FulfillmentDestinationState
{
    /// <summary>
    /// Type: postal_address, retail_location
    /// </summary>
    public required string Type { get; init; }

    public CheckoutAddressState? Address { get; init; }
    public RetailLocationState? RetailLocation { get; init; }
}

public class RetailLocationState
{
    public required string LocationId { get; init; }
    public required string Name { get; init; }
    public CheckoutAddressState? Address { get; init; }
}
```

### CheckoutMessageState

```csharp
namespace Merchello.Core.Protocols.Models;

public class CheckoutMessageState
{
    /// <summary>
    /// Type: error, warning, info
    /// </summary>
    public required string Type { get; init; }

    /// <summary>
    /// Error code: missing, invalid, out_of_stock, payment_declined, etc.
    /// </summary>
    public required string Code { get; init; }

    /// <summary>
    /// JSONPath to affected field (e.g., $.buyer.email)
    /// </summary>
    public string? Path { get; init; }

    public required string Content { get; init; }

    /// <summary>
    /// Severity: recoverable, requires_buyer_input, requires_buyer_review
    /// </summary>
    public string? Severity { get; init; }
}
```

---

## Authentication Models

### AgentAuthenticationResult

```csharp
namespace Merchello.Core.Protocols.Authentication;

public class AgentAuthenticationResult
{
    public required bool IsAuthenticated { get; init; }
    public AgentIdentity? Identity { get; init; }
    public string? ErrorMessage { get; init; }
    public string? ErrorCode { get; init; }

    public static AgentAuthenticationResult Success(AgentIdentity identity) => new()
    {
        IsAuthenticated = true,
        Identity = identity
    };

    public static AgentAuthenticationResult Failure(string message, string? code = null) => new()
    {
        IsAuthenticated = false,
        ErrorMessage = message,
        ErrorCode = code
    };

    public static AgentAuthenticationResult Anonymous() => new()
    {
        IsAuthenticated = false
    };
}
```

### AgentIdentity

```csharp
namespace Merchello.Core.Protocols.Authentication;

public class AgentIdentity
{
    /// <summary>
    /// Unique agent identifier.
    /// </summary>
    public required string AgentId { get; init; }

    /// <summary>
    /// Agent profile URI (from UCP-Agent header).
    /// </summary>
    public string? ProfileUri { get; init; }

    public required string Protocol { get; init; }
    public IReadOnlyList<string> Capabilities { get; init; } = [];
    public DateTimeOffset? ExpiresAt { get; init; }
    public IReadOnlyDictionary<string, object>? Claims { get; init; }
}
```

### UCP-Agent Header Parsing

UCP requires parsing the `UCP-Agent` header as an RFC 8941 Dictionary Structured Field:

```http
UCP-Agent: profile="https://platform.example/profile"
```

**Required Package:** [StructuredFieldValues](https://www.nuget.org/packages/StructuredFieldValues) (RFC 8941 compliant parser)

```bash
dotnet add package StructuredFieldValues
```

**Implementation:**

```csharp
using StructuredFieldValues;

public static class UcpAgentHeaderParser
{
    /// <summary>
    /// Parses RFC 8941 Dictionary Structured Field from UCP-Agent header.
    /// Uses StructuredFieldValues NuGet for full RFC 8941 compliance.
    /// </summary>
    public static Dictionary<string, string> Parse(string headerValue)
    {
        if (string.IsNullOrWhiteSpace(headerValue))
            return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        var error = SfvParser.ParseDictionary(headerValue, out var dictionary);
        if (error != null)
            return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var (key, parsedItem) in dictionary)
        {
            var stringValue = ConvertToString(parsedItem.Value);
            if (stringValue != null)
                result[key] = stringValue;
        }
        return result;
    }

    /// <summary>
    /// Extracts agent profile URI from UCP-Agent header.
    /// </summary>
    public static string? GetProfileUri(string headerValue)
    {
        var parsed = Parse(headerValue);
        return parsed.TryGetValue("profile", out var profile) ? profile : null;
    }

    /// <summary>
    /// Validates and extracts all UCP-Agent parameters.
    /// </summary>
    public static UcpAgentInfo? ParseAgentInfo(string headerValue)
    {
        var parsed = Parse(headerValue);
        if (!parsed.TryGetValue("profile", out var profile) || string.IsNullOrEmpty(profile))
            return null;

        return new UcpAgentInfo
        {
            ProfileUri = profile,
            Version = parsed.TryGetValue("version", out var version) ? version : null
        };
    }

    private static string? ConvertToString(object? value) => value switch
    {
        string s => s,
        Token t => t.ToString(),
        long l => l.ToString(),
        decimal d => d.ToString(System.Globalization.CultureInfo.InvariantCulture),
        bool b => b ? "?1" : "?0",
        ReadOnlyMemory<byte> bytes => Convert.ToBase64String(bytes.Span),
        DateTime dt => dt.ToString("O"),
        DisplayString ds => ds.ToString(),
        null => null,
        _ => value.ToString()
    };
}

public class UcpAgentInfo
{
    public required string ProfileUri { get; init; }
    public string? Version { get; init; }
}
```

---

## Protocol Response

```csharp
namespace Merchello.Core.Protocols;

public class ProtocolResponse
{
    public required bool Success { get; init; }
    public required int StatusCode { get; init; }
    public object? Data { get; init; }
    public ProtocolError? Error { get; init; }

    public static ProtocolResponse Ok(object data) => new()
    {
        Success = true,
        StatusCode = 200,
        Data = data
    };

    public static ProtocolResponse Created(object data) => new()
    {
        Success = true,
        StatusCode = 201,
        Data = data
    };

    public static ProtocolResponse NotFound(string message) => new()
    {
        Success = false,
        StatusCode = 404,
        Error = new ProtocolError { Code = "not_found", Message = message }
    };

    public static ProtocolResponse BadRequest(string message, string? code = null) => new()
    {
        Success = false,
        StatusCode = 400,
        Error = new ProtocolError { Code = code ?? "bad_request", Message = message }
    };

    public static ProtocolResponse Unauthorized(string message) => new()
    {
        Success = false,
        StatusCode = 401,
        Error = new ProtocolError { Code = "unauthorized", Message = message }
    };

    public static ProtocolResponse Conflict(string message) => new()
    {
        Success = false,
        StatusCode = 409,
        Error = new ProtocolError { Code = "conflict", Message = message }
    };

    /// <summary>
    /// Returns version_unsupported error per UCP spec when platform version > business version.
    /// </summary>
    public static ProtocolResponse VersionUnsupported(string requestedVersion, string supportedVersion) => new()
    {
        Success = false,
        StatusCode = 400,
        Error = new ProtocolError
        {
            Code = "version_unsupported",
            Message = $"Protocol version '{requestedVersion}' is not supported. Maximum supported version: '{supportedVersion}'."
        }
    };
}

public class ProtocolError
{
    public required string Code { get; init; }
    public required string Message { get; init; }
    public IReadOnlyDictionary<string, string[]>? Details { get; init; }
}

/// <summary>
/// UCP spec requires every response to include version and active capabilities.
/// Wrap all protocol responses in this envelope.
/// </summary>
/// <summary>
/// UCP metadata included in every response per spec requirement.
/// </summary>
public class UcpMetadata
{
    /// <summary>
    /// Protocol version (YYYY-MM-DD format).
    /// </summary>
    public required string Version { get; init; }

    /// <summary>
    /// Active capabilities for this session as an array of name/version objects.
    /// </summary>
    public required IReadOnlyList<UcpResponseCapability> Capabilities { get; init; }

    [JsonPropertyName("payment_handlers")]
    public IReadOnlyList<ProtocolPaymentHandler>? PaymentHandlers { get; init; }
}

/// <summary>
/// A single capability entry in UCP response metadata.
/// </summary>
public record UcpResponseCapability
{
    public required string Name { get; init; }
    public required string Version { get; init; }
}
```

---

## Notification Events

Protocol events integrate with Merchello's notification system for extensibility.

| Notification | Cancelable | Handler Priority | Use Case |
|-------------|------------|------------------|----------|
| `AgentAuthenticatingNotification` | Yes | 100 | Validate/block agents |
| `AgentAuthenticatedNotification` | No | 1000 | Audit logging |
| `ProtocolSessionCreatingNotification` | Yes | 100 | Pre-creation validation |
| `ProtocolSessionCreatedNotification` | No | 1000 | External integrations |
| `ProtocolSessionUpdatingNotification` | Yes | 100 | Validation hooks |
| `ProtocolSessionUpdatedNotification` | No | 1000 | State sync |
| `ProtocolSessionCompletingNotification` | Yes | 100 | Pre-complete validation |
| `ProtocolSessionCompletedNotification` | No | 2000 | Post-checkout processing |
| `ProtocolWebhookSendingNotification` | Yes | 100 | Filter/modify payloads |
| `ProtocolWebhookSentNotification` | No | 1000 | Delivery logging |

**Example Handler:**

```csharp
[NotificationHandlerPriority(100)]
public class AgentBlocklistHandler : INotificationAsyncHandler<AgentAuthenticatingNotification>
{
    private readonly IAgentBlocklistService _blocklist;

    public async Task HandleAsync(AgentAuthenticatingNotification notification, CancellationToken ct)
    {
        if (await _blocklist.IsBlockedAsync(notification.AgentId, ct))
        {
            notification.CancelOperation("Agent is blocked");
        }
    }
}
```

---

## Caching Strategy

Protocol manifests and capabilities are cached for performance:

| Cache Key | TTL | Purpose |
|-----------|-----|---------|
| `merchello:protocols:manifest:{protocolName}` | 60 min | Generated manifest JSON |
| `merchello:protocols:capabilities:{protocolName}` | 60 min | Capability intersection |
| `merchello:protocols:signing-keys` | 24 hr | JWK signing keys |

### Server-Selects Capability Negotiation

UCP uses a **server-selects** model where the business (merchant) returns the intersection of:
1. Capabilities the platform (agent) advertises support for
2. Capabilities the business has implemented and enabled

This means the manifest returned may need to be dynamically filtered per-request based on the requesting agent's profile. For static manifests (no per-agent customization), caching works directly. For dynamic scenarios, cache the full manifest and filter at request time.

**Implementation:**

```csharp
public class CommerceProtocolManager : ICommerceProtocolManager
{
    private readonly ICacheService _cache;

    /// <summary>
    /// Gets the full cached manifest. For server-selects negotiation,
    /// use GetNegotiatedManifestAsync to filter based on agent capabilities.
    /// </summary>
    public async Task<object?> GetCachedManifestAsync(string protocolName, CancellationToken ct)
    {
        var cacheKey = $"merchello:protocols:manifest:{protocolName}";

        return await _cache.GetOrCreateAsync(cacheKey, async () =>
        {
            var adapter = GetAdapter(protocolName);
            return adapter != null ? await adapter.GenerateManifestAsync(ct) : null;
        }, TimeSpan.FromMinutes(60), ["protocols"]);
    }

    /// <summary>
    /// Returns manifest filtered to the intersection of agent and business capabilities.
    /// Per UCP spec, the business (server) selects from the intersection.
    /// </summary>
    public async Task<object?> GetNegotiatedManifestAsync(
        string protocolName,
        AgentIdentity? agent,
        CancellationToken ct)
    {
        var fullManifest = await GetCachedManifestAsync(protocolName, ct);
        if (fullManifest == null || agent?.Capabilities == null || agent.Capabilities.Count == 0)
            return fullManifest;

        var adapter = GetAdapter(protocolName);
        if (adapter == null)
            return fullManifest;

        // Filter manifest to intersection of capabilities
        return await adapter.NegotiateCapabilitiesAsync(fullManifest, agent.Capabilities, ct);
    }
}
```

---

## Webhook Security

### Signing Requirements

UCP requires all outbound webhooks to be signed using detached JWT (RFC 7797).

**Required Package:** [jose-jwt](https://www.nuget.org/packages/jose-jwt/) (RFC 7797 compliant implementation)

```bash
dotnet add package jose-jwt
```

**RFC 7797 Key Points:**
- The `b64` header parameter set to `false` indicates unencoded payload
- The `crit` header MUST include `b64` to ensure non-compliant implementations reject the JWS
- Detached mode omits the payload from the token; it's transmitted separately

**Implementation:**

```csharp
using Jose;
using System.Security.Cryptography;

public class WebhookSigner : IWebhookSigner
{
    private readonly ISigningKeyStore _keyStore;

    /// <summary>
    /// Signs a webhook payload using RFC 7797 detached JWT.
    /// The payload is not base64url-encoded and is detached from the token.
    /// </summary>
    public string Sign(string payload, string keyId)
    {
        var key = _keyStore.GetEcdsaPrivateKey(keyId);

        // RFC 7797: Detached signature with unencoded payload
        // The "crit" header MUST include "b64" per RFC 7797 Section 7
        var extraHeaders = new Dictionary<string, object>
        {
            ["kid"] = keyId,
            ["b64"] = false,
            ["crit"] = new[] { "b64" }
        };

        // jose-jwt handles RFC 7797 detached signatures natively
        var token = JWT.Encode(
            payload,
            key,
            JwsAlgorithm.ES256,
            extraHeaders: extraHeaders,
            options: new JwtOptions
            {
                DetachPayload = true,
                EncodePayload = false  // RFC 7797: b64=false
            });

        return token;
    }

    /// <summary>
    /// Verifies a detached JWT signature against the webhook payload.
    /// </summary>
    public bool Verify(string payload, string signature, IReadOnlyList<JsonWebKey> signingKeys)
    {
        try
        {
            // Extract kid from unverified header to find the right key
            var headers = JWT.Headers(signature);
            if (!headers.TryGetValue("kid", out var kidObj) || kidObj is not string keyId)
                return false;

            var jwk = signingKeys.FirstOrDefault(k => k.Kid == keyId);
            if (jwk == null)
                return false;

            var key = ConvertJwkToEcdsa(jwk);

            // Verify with detached payload
            JWT.Decode(
                signature,
                key,
                JwsAlgorithm.ES256,
                settings: new JwtSettings(),
                payload: Encoding.UTF8.GetBytes(payload));

            return true;
        }
        catch (IntegrityException)
        {
            return false;
        }
        catch (Exception)
        {
            return false;
        }
    }

    private static ECDsa ConvertJwkToEcdsa(JsonWebKey jwk)
    {
        var ecdsa = ECDsa.Create(new ECParameters
        {
            Curve = ECCurve.NamedCurves.nistP256,
            Q = new ECPoint
            {
                X = Base64UrlDecode(jwk.X!),
                Y = Base64UrlDecode(jwk.Y!)
            }
        });
        return ecdsa;
    }

    private static byte[] Base64UrlDecode(string input)
    {
        var padded = input.Replace('-', '+').Replace('_', '/');
        switch (padded.Length % 4)
        {
            case 2: padded += "=="; break;
            case 3: padded += "="; break;
        }
        return Convert.FromBase64String(padded);
    }
}
```

**Detached JWT Format:**

A detached JWT has the format `header..signature` (note the empty payload section between dots):

```
eyJhbGciOiJFUzI1NiIsImtpZCI6ImtleS0yMDI2LTAxIiwiYjY0IjpmYWxzZSwiY3JpdCI6WyJiNjQiXX0..MEUCIQCz8...
```

The actual payload is transmitted in the HTTP body, and the signature covers the raw (unencoded) payload bytes.

### Request-Signature Header

Outbound webhooks include:

```http
POST /webhooks/partners/{partner_id}/events/order HTTP/1.1
Host: platform.example.com
Content-Type: application/json
Request-Signature: eyJhbGciOiJFUzI1NiIsImtpZCI6ImtleS0yMDI2LTAxIn0...

{
  "id": "ord_123",
  "checkout_id": "chk_456",
  ...
}
```

---

## Configuration

```json
{
  "Merchello": {
    "Protocols": {
      "PublicBaseUrl": null,
      "ManifestCacheDurationMinutes": 60,
      "RequireHttps": true,
      "MinimumTlsVersion": "1.3",
      "Ucp": {
        "Version": "2026-01-23",
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

---

## Implementation Tasks

### Phase 1: Core Infrastructure

1. Create `Protocols` folder structure in `Merchello.Core`
2. Implement `ICommerceProtocolAdapter` interface
3. Implement `CommerceProtocolManager` using ExtensionManager pattern
4. Create `CommerceProtocolAdapterMetadata` class
5. Create protocol-agnostic models
6. Add protocol notifications
7. Register services in DI
8. Add caching for manifests

### Phase 2: Authentication Infrastructure

1. Implement `IAgentAuthenticator` interface
2. Create `AgentAuthenticationMiddleware`
3. Add UCP-Agent header parsing (Dictionary Structured Field)
4. Implement request signature validation
5. Add notification hooks for auth events

### Phase 3: Well-Known Endpoint

1. Create `WellKnownController`
2. Route `/.well-known/{protocol}` to protocol adapters
3. Return 404 when no adapter registered
4. Add caching headers

### Phase 4: Checkout Service Extensions

1. Add `GetSessionStateAsync` method to `ICheckoutService`
2. Add `GetMessagesAsync` for validation messages
3. Implement mapping from `Basket`/`CheckoutSession` to `CheckoutSessionState`
4. Add fulfillment state mapping
5. Add discount state mapping
6. Add unit tests for mapping

### Phase 5: Payment Handler Export

1. Implement `IPaymentHandlerExporter`
2. Add Google Pay handler support
3. Add tokenization type mapping
4. Support protocol-specific formatting

### Phase 6: Webhook Infrastructure

1. Implement `IWebhookSigner`
2. Add JWK key management and rotation
3. Add signature verification middleware
4. Implement order event webhooks

---

## UCP Implementation Status

UCP checkout capability and Order capability (webhooks) are fully implemented.

### Reference: UCP-specific Implementation Details

### New Files

```
src/Merchello.Core/Protocols/UCP/
|- UCPProtocolAdapter.cs           # ICommerceProtocolAdapter implementation
|- Dtos/                           # UCP request/response DTOs
|- Handlers/UcpOrderWebhookHandler.cs   # Order lifecycle webhook handler
|- Models/UcpAgentProfile.cs            # Agent profile models
|- Services/IUcpAgentProfileService.cs  # Agent profile service interface
|- Services/UcpAgentProfileService.cs   # Agent profile fetcher/cache

src/Merchello/Middleware/
|- AgentAuthenticationMiddleware.cs     # UCP-Agent parsing + auth checks

src/Merchello/Controllers/
|- WellKnownController.cs               # /.well-known/ucp
|- UcpCheckoutSessionsController.cs     # /api/v1/checkout-sessions

src/Merchello.Core/Protocols/Payments/
|- PaymentHandlerExporter.cs            # Exposes payment handlers to UCP

Note: Checkout session mapping lives in CheckoutService.GetSessionStateAsync
and UCPProtocolAdapter response mapping helpers (no separate UCPMapper.cs).
```


### Registration

```csharp
// In Startup/DI configuration
services.AddScoped<ICommerceProtocolManager, CommerceProtocolManager>();
services.AddScoped<ISigningKeyStore, SigningKeyStore>();
services.AddScoped<IWebhookSigner, WebhookSigner>();
services.AddScoped<IUcpAgentProfileService, UcpAgentProfileService>();
// UCPProtocolAdapter is auto-discovered by ExtensionManager (implements ICommerceProtocolAdapter)

// Notification handlers for UCP order webhooks
builder.AddNotificationAsyncHandler<OrderStatusChangedNotification, UcpOrderWebhookHandler>();
builder.AddNotificationAsyncHandler<ShipmentCreatedNotification, UcpOrderWebhookHandler>();
builder.AddNotificationAsyncHandler<ShipmentSavedNotification, UcpOrderWebhookHandler>();
```

### UCP-Specific Features

1. **Capability Negotiation** - Server-selects model per UCP spec
2. **Payment Handler Format** - UCP's instrument/handler separation
3. **Extension Schema Composition** - `allOf` JSON Schema composition
4. **AP2 Mandates** - Cryptographic authorization proof (optional)
5. **Identity Linking** - OAuth 2.0 integration

---

## UCP Order Webhooks Implementation

**Status**: IMPLEMENTED

### Implementation Overview

UCP order lifecycle webhooks are fully implemented. When an order status changes, Merchello sends signed webhooks to the UCP agent's configured webhook URL.

| Component | Status |
|-----------|--------|
| Checkout sessions (create/get/update/complete) | Implemented |
| Order retrieval (`GetOrderAsync`) | Implemented |
| Order webhooks (outbound to platforms) | Implemented |

### Key Architecture: Invoice vs Order for UCP

**Critical mapping:**
- UCP "order" = Merchello **Invoice** (1:1)
- Merchello Order = warehouse-level (N per Invoice)
- UCP expects ONE order per checkout session

`GetOrderAsync` aggregates multiple Merchello Orders into a single UCP response at the Invoice level. Webhooks do the same - aggregating at the Invoice level.

### Webhook URL Discovery Flow

The webhook URL comes from the **agent's profile capability config**:

1. Agent sends `UCP-Agent` header with profile URI during checkout
2. At checkout completion, Merchello fetches the agent's profile (cached for 30 minutes)
3. Profile contains `capabilities[name="dev.ucp.shopping.order"].config.webhook_url`
4. Webhook URL is stored in `Invoice.Source.Metadata["WebhookUrl"]`

### Implementation Components

| File | Purpose |
|------|---------|
| `IUcpAgentProfileService.cs` | Interface for fetching and caching agent profiles |
| `UcpAgentProfileService.cs` | Implementation that fetches profiles via HTTP |
| `UcpAgentProfile.cs` | Model representing the agent profile structure |
| `UcpOrderWebhookHandler.cs` | Notification handler for order events |
| `Constants.UcpMetadataKeys` | Keys for `Invoice.Source.Metadata` storage |

### Data Flow

```
1. Checkout Completion (UCPProtocolAdapter.CompleteSessionAsync)
   ├── Fetch agent profile from ProfileUri (via IUcpAgentProfileService)
   ├── Extract webhook_url from Order capability config
   ├── Store in InvoiceSource.Metadata["WebhookUrl"]
   └── Create Invoice with source metadata

2. Order Status Change
   ├── OrderStatusChangedNotification fired
   ├── UcpOrderWebhookHandler handles notification
   ├── Check Invoice.Source.Type == "ucp"
   ├── Get webhook URL from Invoice.Source.Metadata
   ├── Build UCP order payload (aggregated at Invoice level)
   ├── Sign payload with ES256 (RFC 7797 detached JWT)
   └── POST to webhook URL with Request-Signature header
```

### Order Event Types

| UCP Event | Merchello Trigger |
|-----------|-------------------|
| `order.processing` | Order status → Processing |
| `order.shipped` | Order status → Shipped |
| `order.delivered` | Order status → Completed or Shipment delivered |
| `order.cancelled` | Order status → Cancelled |
| `order.updated` | Any other status change |

### Signing

UCP webhooks are signed with RFC 7797 detached JWTs:
- **Algorithm**: ES256 (ECDSA with P-256 and SHA-256)
- **Format**: Detached payload (`header..signature`)
- **Header**: `Request-Signature`
- **Key rotation**: Automatic via `ISigningKeyStore`
- **Public keys**: Available at `/.well-known/ucp` in `signing_keys` array

### Webhook Payload Example

```json
{
  "ucp": {
    "version": "2026-01-23",
    "capabilities": [{"name": "dev.ucp.shopping.order", "version": "2026-01-23"}]
  },
  "event_id": "a3f1c2d4-e5b6-7890-abcd-ef1234567890",
  "created_time": "2026-01-21T10:30:00.0000000+00:00",
  "event": "order.shipped",
  "id": "invoice-guid",
  "checkout_id": "session-id",
  "line_items": [
    {
      "id": "line-item-guid",
      "product_id": "product-guid",
      "sku": "SKU-123",
      "name": "Product Name",
      "quantity": { "total": 2, "fulfilled": 2 },
      "totals": { "subtotal": 1999, "total": 1999 },
      "status": "fulfilled"
    }
  ],
  "totals": {
    "subtotal": 1999,
    "tax": 200,
    "total": 2199
  },
  "fulfillment": {
    "status": "fulfilled",
    "events": [
      {
        "occurred_at": "2026-01-21T10:30:00Z",
        "type": "shipped",
        "tracking": {
          "number": "1Z999AA10123456784",
          "url": "https://tracking.example.com/..."
        }
      }
    ]
  },
  "payment_status": "paid"
}
```

### Configuration

Webhook behavior is controlled via `ProtocolSettings.Ucp`:

```json
{
  "Merchello": {
    "Protocols": {
      "Enabled": true,
      "Ucp": {
        "Enabled": true,
        "Capabilities": {
          "Order": true
        },
        "WebhookTimeoutSeconds": 30,
        "WebhookRetryCount": 3
      }
    }
  }
}
```

---

## Testing Strategy

### Unit Tests

1. `CommerceProtocolManagerTests` - Adapter registration/resolution
2. `CheckoutSessionStateMappingTests` - Model mapping accuracy
3. `AgentAuthenticationTests` - Auth success/failure scenarios
4. `PaymentHandlerExporterTests` - Export formatting
5. `WebhookSignerTests` - JWT signing/verification
6. `ProtocolNotificationTests` - Notification dispatch

### Integration Tests

1. `WellKnownEndpointTests` - Returns 404 when no adapter, correct manifest when present
2. `ProtocolCheckoutFlowTests` - End-to-end session lifecycle
3. `WebhookDeliveryTests` - Signed webhook delivery
4. Existing checkout tests pass (no regression)

---

## Post-Implementation Tasks

When the protocol infrastructure is implemented, the following documentation updates are required:

- [ ] **Update `docs/Architecture-Diagrams.md`** - Add Protocol Systems section documenting:
  - `ICommerceProtocolAdapter` interface and `CommerceProtocolManager`
  - Protocol notification events (Authenticating/Authenticated, SessionCreating/Created, etc.)
  - Integration with existing services (CheckoutService, IPaymentProviderManager, IShippingService)
  - Caching prefixes (`merchello:protocols:*`)
  - Add to Extension Points section: `Protocol:ICommerceProtocolAdapter→CommerceProtocolManager`

---

## Glossary

| Term | Definition |
|------|------------|
| **Agent** | An AI or software system acting on behalf of a user (e.g., Google Gemini, ChatGPT) |
| **Capability** | A major functional area a merchant supports (e.g., Checkout, Order) |
| **Extension** | An optional enhancement to a capability (e.g., Discounts extend Checkout) |
| **Handler** | A payment processing specification (how to process a payment instrument) |
| **Instrument** | A payment method (credit card, Apple Pay, Google Pay) |
| **Manifest** | A JSON document at `/.well-known/ucp` describing capabilities |
| **Platform** | The consumer surface hosting the agent (Google AI Mode, Gemini app) |
| **Protocol** | A standardized communication format (UCP, future standards) |
| **Session** | A stateful checkout interaction between agent and merchant |
| **Escalation** | Handoff to merchant checkout when agent cannot complete programmatically |

---

## Document Review Summary

*Reviewed: 2026-01-15 against UCP spec v2026-01-23*

### Compliance Status

| Area | Status |
|------|--------|
| UCP Specification | Compliant |
| Architecture Alignment | Excellent |
| Provider Pattern Consistency | Consistent |
| Notification Naming | Consistent |

### Key Design Decisions

1. **Foundation-first approach** - Build extensibility infrastructure before full UCP implementation, allowing the spec to stabilize while providing immediate benefits to Merchello.

2. **Protocol adapter pattern** - Adapters sit above existing services (`CheckoutService`, `IShippingService`, `IPaymentProviderManager`), translating between external protocols and internal models without replacing existing functionality.

3. **ExtensionManager integration** - Protocol adapters use the same discovery pattern as other providers, ensuring consistency and enabling third-party protocol implementations.

4. **Notification system integration** - Protocol events use existing `MerchelloNotification` and `MerchelloCancelableNotification<T>` base classes, maintaining consistency with established patterns.

### Invoice Source Tracking

UCP orders are tracked via the `Invoice.Source` property, which records where the order originated. This enables analytics, reporting, and filtering by source.

**UCP Source Data:**

| Field | UCP Value | Description |
|-------|-----------|-------------|
| `Type` | `"ucp"` | Source type identifier |
| `SourceId` | Agent ID | From UCP-Agent header profile |
| `SourceName` | Agent name | Display name for reporting |
| `ProfileUri` | Profile URL | Full UCP-Agent profile URI |
| `ProtocolVersion` | `"2026-01-23"` | UCP spec version |
| `SessionId` | Basket ID | Links to checkout session |

**Querying UCP Orders:**

```csharp
// Query all UCP orders
var ucpOrders = await invoiceService.QueryInvoices(new InvoiceQueryParameters
{
    SourceType = Constants.InvoiceSources.Ucp
});

// Check if an invoice came from UCP
if (invoice.Source?.Type == Constants.InvoiceSources.Ucp)
{
    var agentId = invoice.Source.SourceId; // e.g., "google-gemini"
    var protocolVersion = invoice.Source.ProtocolVersion;
}
```

**Supported Source Types:**

| Source Type | Description |
|-------------|-------------|
| `web` | Traditional web checkout (default) |
| `ucp` | Universal Commerce Protocol (AI agents) |
| `api` | Direct API integration |
| `pos` | Point of sale |
| `mobile` | Mobile application |
| `draft` | Admin-created draft orders |
| `import` | Imported from external system |

---

### Spec Compliance Checklist

- [x] Manifest at `/.well-known/ucp` with capabilities and payment handlers
- [x] REST endpoints: Create, Get, Update, Complete, Cancel
- [x] Checkout session states (incomplete, requires_escalation, ready_for_complete, etc.)
- [x] Minor units for all monetary amounts
- [x] ISO formats (country: alpha-2, currency: 4217, phone: E.164)
- [x] Payment handler model with instrument/handler separation
- [x] Capability namespaces (`dev.ucp.*`)
- [x] Discount extension with allocation methods
- [x] Fulfillment extension with shipping groups
- [x] Order capability with webhook signatures
- [x] TLS 1.3 minimum requirement
- [x] `ucp` field merged at root level in all responses (flat JSON — no `data` wrapper)
- [x] Version negotiation error handling (`version_unsupported`)
- [x] UCP-Agent header parsing (RFC 8941)

### Architecture Alignment

The protocol infrastructure correctly:
- Uses services layer for business logic (never direct DbContext access)
- Delegates to factories for object creation
- Maps warehouse groups to fulfillment groups
- Exposes existing providers to external protocols
- Integrates with caching via `ICacheService`

---

## References

- [UCP Official Site](https://ucp.dev/)
- [UCP Specification Overview](https://ucp.dev/specification/overview/)
- [HTTP/REST Binding](https://ucp.dev/specification/checkout-rest/)
- [Discount Extension](https://ucp.dev/specification/discount/)
- [Fulfillment Extension](https://ucp.dev/specification/fulfillment/)
- [Order Capability](https://ucp.dev/specification/order/)
- [Identity Linking](https://ucp.dev/specification/identity-linking/)
- [Google Merchant UCP Guide](https://developers.google.com/merchant/ucp)
- [Google Pay Payment Handler](https://developers.google.com/merchant/ucp/guides/google-pay-payment-handler)
- [Business Profile Guide](https://developers.google.com/merchant/ucp/guides/business-profile)
- [Order Lifecycle Guide](https://developers.google.com/merchant/ucp/guides/orders)
- [Identity Linking Guide](https://developers.google.com/merchant/ucp/guides/identity-linking)
- [UCP GitHub - Specification](https://github.com/Universal-Commerce-Protocol/ucp)
- [UCP GitHub - Samples](https://github.com/Universal-Commerce-Protocol/samples)
- [Google Developers Blog - UCP](https://developers.googleblog.com/under-the-hood-universal-commerce-protocol-ucp/)
- [Shopify Engineering - Building UCP](https://shopify.engineering/ucp)
- [Google Blog - Agentic Commerce](https://blog.google/products/ads-commerce/agentic-commerce-ai-tools-protocol-retailers-platforms/)


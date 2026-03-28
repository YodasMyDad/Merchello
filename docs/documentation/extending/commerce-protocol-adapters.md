# Creating Commerce Protocol Adapters

Commerce protocol adapters translate between external commerce protocols and Merchello's internal models. The primary use case is UCP (Universal Commerce Protocol), which enables AI agents and external systems to interact with your store programmatically.

## What Is a Protocol Adapter?

A protocol adapter is a bridge between an external protocol's data format and Merchello's checkout, catalog, and order systems. Think of it as a translator:

```
External Agent (AI shopping bot, marketplace, etc.)
    -> Sends protocol-specific request (e.g., UCP JSON)
    -> Protocol Adapter translates to Merchello models
    -> Merchello processes the request (checkout, catalog search, etc.)
    -> Protocol Adapter translates response back to protocol format
    -> External Agent receives protocol-specific response
```

## Quick Overview

To create a protocol adapter:

1. Create a class that implements `ICommerceProtocolAdapter`
2. Implement `Metadata`, session management, and at least one capability
3. Merchello discovers it automatically via `ExtensionManager`

## The Interface

```csharp
public interface ICommerceProtocolAdapter
{
    // Identity and capabilities
    CommerceProtocolAdapterMetadata Metadata { get; }
    bool IsEnabled { get; }

    // Discovery
    Task<object> GenerateManifestAsync(CancellationToken ct = default);

    // Checkout session lifecycle
    Task<ProtocolResponse> CreateSessionAsync(object request, AgentIdentity? agent, CancellationToken ct = default);
    Task<ProtocolResponse> GetSessionAsync(string sessionId, AgentIdentity? agent, CancellationToken ct = default);
    Task<ProtocolResponse> UpdateSessionAsync(string sessionId, object request, AgentIdentity? agent, CancellationToken ct = default);
    Task<ProtocolResponse> CompleteSessionAsync(string sessionId, object paymentData, AgentIdentity? agent, CancellationToken ct = default);
    Task<ProtocolResponse> CancelSessionAsync(string sessionId, AgentIdentity? agent, CancellationToken ct = default);

    // Orders
    Task<ProtocolResponse> GetOrderAsync(string orderId, AgentIdentity? agent, CancellationToken ct = default);

    // Payment handlers
    Task<object> GetPaymentHandlersAsync(string? sessionId, CancellationToken ct = default);

    // Cart (draft spec)
    Task<ProtocolResponse> CreateCartAsync(object request, AgentIdentity? agent, CancellationToken ct = default);
    Task<ProtocolResponse> GetCartAsync(string cartId, AgentIdentity? agent, CancellationToken ct = default);
    Task<ProtocolResponse> UpdateCartAsync(string cartId, object request, AgentIdentity? agent, CancellationToken ct = default);
    Task<ProtocolResponse> CancelCartAsync(string cartId, AgentIdentity? agent, CancellationToken ct = default);

    // Catalog (draft spec)
    Task<ProtocolResponse> SearchCatalogAsync(object request, AgentIdentity? agent, CancellationToken ct = default);
    Task<ProtocolResponse> LookupCatalogItemAsync(string itemId, AgentIdentity? agent, CancellationToken ct = default);

    // Capability negotiation
    Task<object?> NegotiateCapabilitiesAsync(object fullManifest, IReadOnlyList<string> agentCapabilities, CancellationToken ct = default);
}
```

## Metadata

```csharp
public record CommerceProtocolAdapterMetadata(
    string Alias,                    // e.g., "ucp", "shopify-api"
    string DisplayName,              // e.g., "Universal Commerce Protocol"
    string Version,                  // Protocol version (YYYY-MM-DD format)
    string? Icon = null,
    string? Description = null,
    bool SupportsIdentityLinking = false,  // Can link agent identity to customers?
    bool SupportsOrderWebhooks = false,    // Can send order lifecycle webhooks?
    string? SetupInstructions = null
);
```

## Example: Minimal Adapter

Here's a skeleton adapter for a hypothetical "SimpleCommerce" protocol:

```csharp
using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Authentication;
using Merchello.Core.Protocols.Interfaces;
using Microsoft.Extensions.Options;

public class SimpleCommerceAdapter(
    ICheckoutService checkoutService,
    IProductService productService,
    ILogger<SimpleCommerceAdapter> logger,
    IOptions<ProtocolSettings> settings) : ICommerceProtocolAdapter
{
    private readonly ProtocolSettings _settings = settings.Value;

    public CommerceProtocolAdapterMetadata Metadata => new(
        Alias: "simple-commerce",
        DisplayName: "Simple Commerce Protocol",
        Version: "2025-01-01",
        Description: "A minimal commerce protocol for basic integrations"
    );

    public bool IsEnabled => _settings.EnabledProtocols?.Contains("simple-commerce") ?? false;

    // Generate a discovery manifest describing your store's capabilities
    public async Task<object> GenerateManifestAsync(CancellationToken ct = default)
    {
        return new
        {
            protocol = "simple-commerce",
            version = Metadata.Version,
            capabilities = new[] { "checkout", "catalog" },
            endpoints = new
            {
                sessions = "/api/simple-commerce/sessions",
                catalog = "/api/simple-commerce/catalog"
            }
        };
    }

    // Create a checkout session
    public async Task<ProtocolResponse> CreateSessionAsync(
        object request, AgentIdentity? agent, CancellationToken ct = default)
    {
        // Parse the protocol-specific request
        // Translate to Merchello's checkout models
        // Create a checkout session
        // Return the session in protocol format

        return ProtocolResponse.Success(new { sessionId = "..." });
    }

    // ... implement other methods ...
}
```

## Capability Negotiation

The `NegotiateCapabilitiesAsync` method implements a "server-selects" model. When an agent connects, it declares what it supports. Your adapter returns the intersection of agent and store capabilities:

```csharp
public async Task<object?> NegotiateCapabilitiesAsync(
    object fullManifest,
    IReadOnlyList<string> agentCapabilities,
    CancellationToken ct = default)
{
    // Agent says it supports: ["checkout", "catalog", "payments"]
    // Your store supports: ["checkout", "catalog"]
    // Return manifest filtered to: ["checkout", "catalog"]

    var storeCapabilities = new HashSet<string> { "checkout", "catalog" };
    var common = agentCapabilities
        .Where(c => storeCapabilities.Contains(c))
        .ToList();

    if (common.Count == 0)
        return null; // No common capabilities

    // Return a filtered manifest
    return new { capabilities = common };
}
```

## Agent Identity

Every request includes an optional `AgentIdentity` which identifies the calling agent:

```csharp
public class AgentIdentity
{
    public string AgentId { get; set; }     // Unique agent identifier
    public string? AgentName { get; set; }  // Human-readable name
    public string? OrganizationId { get; set; }
}
```

Use this for:
- Access control (which agents can access which features)
- Audit logging (who initiated the transaction)
- Rate limiting (per-agent throttling)

## Webhook Signing

If your protocol needs to send webhooks to external agents, use `IWebhookSigner`:

```csharp
public class SimpleCommerceAdapter(
    IWebhookSigner webhookSigner,
    // ... other deps
) : ICommerceProtocolAdapter
{
    private async Task SendWebhookAsync(string url, object payload, CancellationToken ct)
    {
        var json = JsonSerializer.Serialize(payload);
        var signature = await webhookSigner.SignAsync(json, signingKeyId, ct);

        // Send with signature header
        var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Content = new StringContent(json, Encoding.UTF8, "application/json");
        request.Headers.Add("X-Webhook-Signature", signature);
    }
}
```

## The Protocol Manager

Your adapter is managed by `ICommerceProtocolManager`, which handles:

- Discovery via `ExtensionManager`
- Caching manifests
- Routing requests to the correct adapter by alias
- Capability negotiation between agents and adapters

```csharp
public interface ICommerceProtocolManager
{
    IReadOnlyList<ICommerceProtocolAdapter> Adapters { get; }
    Task<IReadOnlyList<ICommerceProtocolAdapter>> GetAdaptersAsync(CancellationToken ct = default);
    ICommerceProtocolAdapter? GetAdapter(string alias);
    bool IsProtocolSupported(string alias);
    IReadOnlyList<string> GetEnabledProtocols();
    Task<object?> GetCachedManifestAsync(string alias, CancellationToken ct = default);
    Task<object?> GetNegotiatedManifestAsync(string alias, AgentIdentity? agent, CancellationToken ct = default);
}
```

> **Warning:** You must call `GetAdaptersAsync()` before using `Adapters`, `GetAdapter()`, `IsProtocolSupported()`, or `GetEnabledProtocols()`. These synchronous methods throw `InvalidOperationException` if called before initialization.

## Notifications

Protocol adapters have their own notification events:

| Notification | When |
|---|---|
| `ProtocolSessionCreatingNotification` | Before a protocol session is created |
| `ProtocolSessionCreatedNotification` | After a protocol session is created |
| `ProtocolSessionUpdatingNotification` | Before a session update |
| `ProtocolSessionUpdatedNotification` | After a session update |
| `ProtocolSessionCompletingNotification` | Before session completion (payment) |
| `ProtocolSessionCompletedNotification` | After session completion |
| `AgentAuthenticatingNotification` | Before agent authentication |
| `AgentAuthenticatedNotification` | After agent authentication |
| `ProtocolWebhookSendingNotification` | Before sending a protocol webhook |
| `ProtocolWebhookSentNotification` | After sending a protocol webhook |

## Built-in Adapter for Reference

| Adapter | Location | Notes |
|---|---|---|
| UCP | `Protocols/UCP/UCPProtocolAdapter.cs` | Full UCP implementation with checkout, catalog, payments, capability negotiation |

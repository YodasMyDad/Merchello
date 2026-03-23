using Merchello.Core.Protocols.Authentication;

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
    /// Creates a new cart session for pre-checkout exploration (draft spec).
    /// </summary>
    Task<ProtocolResponse> CreateCartAsync(
        object request,
        AgentIdentity? agentIdentity,
        CancellationToken ct = default);

    /// <summary>
    /// Retrieves a cart session in protocol-specific format (draft spec).
    /// </summary>
    Task<ProtocolResponse> GetCartAsync(
        string cartId,
        AgentIdentity? agentIdentity,
        CancellationToken ct = default);

    /// <summary>
    /// Updates a cart session from a protocol-specific request (draft spec).
    /// </summary>
    Task<ProtocolResponse> UpdateCartAsync(
        string cartId,
        object request,
        AgentIdentity? agentIdentity,
        CancellationToken ct = default);

    /// <summary>
    /// Cancels a cart session (draft spec).
    /// </summary>
    Task<ProtocolResponse> CancelCartAsync(
        string cartId,
        AgentIdentity? agentIdentity,
        CancellationToken ct = default);

    /// <summary>
    /// Searches the product catalog (draft spec).
    /// </summary>
    Task<ProtocolResponse> SearchCatalogAsync(
        object request,
        AgentIdentity? agentIdentity,
        CancellationToken ct = default);

    /// <summary>
    /// Looks up a product or variant by identifier (draft spec).
    /// </summary>
    Task<ProtocolResponse> LookupCatalogItemAsync(
        string itemId,
        AgentIdentity? agentIdentity,
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

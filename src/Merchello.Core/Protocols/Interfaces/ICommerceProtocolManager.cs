using Merchello.Core.Protocols.Authentication;

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

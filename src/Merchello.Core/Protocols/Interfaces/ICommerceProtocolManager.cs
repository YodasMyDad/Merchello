using Merchello.Core.Protocols.Authentication;

namespace Merchello.Core.Protocols.Interfaces;

/// <summary>
/// Manages registration and resolution of commerce protocol adapters.
/// Uses ExtensionManager pattern for discovery.
/// </summary>
/// <remarks>
/// <para>
/// IMPORTANT: You must call <see cref="GetAdaptersAsync"/> before accessing the <see cref="Adapters"/>
/// property or using any synchronous methods (<see cref="GetAdapter"/>, <see cref="IsProtocolSupported"/>,
/// <see cref="GetEnabledProtocols"/>). Failure to do so will throw <see cref="InvalidOperationException"/>.
/// </para>
/// <para>
/// The async method triggers ExtensionManager discovery and populates the adapter cache.
/// Synchronous methods are provided for convenience after initialization is complete.
/// </para>
/// </remarks>
public interface ICommerceProtocolManager
{
    /// <summary>
    /// Gets all registered protocol adapters (cached).
    /// </summary>
    /// <exception cref="InvalidOperationException">
    /// Thrown if <see cref="GetAdaptersAsync"/> has not been called first.
    /// </exception>
    IReadOnlyList<ICommerceProtocolAdapter> Adapters { get; }

    /// <summary>
    /// Loads all protocol adapters asynchronously.
    /// Must be called before using any synchronous methods or accessing the <see cref="Adapters"/> property.
    /// Results are cached; subsequent calls return immediately from cache.
    /// </summary>
    Task<IReadOnlyList<ICommerceProtocolAdapter>> GetAdaptersAsync(CancellationToken ct = default);

    /// <summary>
    /// Gets an adapter by alias (case-insensitive).
    /// </summary>
    /// <exception cref="InvalidOperationException">
    /// Thrown if <see cref="GetAdaptersAsync"/> has not been called first.
    /// </exception>
    ICommerceProtocolAdapter? GetAdapter(string alias);

    /// <summary>
    /// Checks if a protocol alias is supported and enabled.
    /// </summary>
    /// <exception cref="InvalidOperationException">
    /// Thrown if <see cref="GetAdaptersAsync"/> has not been called first.
    /// </exception>
    bool IsProtocolSupported(string alias);

    /// <summary>
    /// Gets all enabled protocol aliases.
    /// </summary>
    /// <exception cref="InvalidOperationException">
    /// Thrown if <see cref="GetAdaptersAsync"/> has not been called first.
    /// </exception>
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

namespace Merchello.Core.Protocols.Models;

/// <summary>
/// Declaration of a protocol capability.
/// </summary>
public class ProtocolCapability
{
    /// <summary>
    /// Capability namespace (e.g., "dev.ucp.shopping.checkout").
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Capability version (YYYY-MM-DD format).
    /// </summary>
    public required string Version { get; init; }

    /// <summary>
    /// URL to capability specification.
    /// </summary>
    public string? Spec { get; init; }

    /// <summary>
    /// URL to capability JSON schema.
    /// </summary>
    public string? Schema { get; init; }

    /// <summary>
    /// Parent capability this extends, if any.
    /// </summary>
    public string? Extends { get; init; }
}

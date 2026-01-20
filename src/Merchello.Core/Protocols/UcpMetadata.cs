namespace Merchello.Core.Protocols;

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
    /// Active capabilities for this session (e.g., "dev.ucp.shopping.checkout").
    /// </summary>
    public required IReadOnlyList<string> Capabilities { get; init; }
}

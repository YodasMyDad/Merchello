namespace Merchello.Core.Protocols.Authentication;

/// <summary>
/// Represents an authenticated external agent making protocol requests.
/// </summary>
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

    /// <summary>
    /// Protocol this agent is using (e.g., "ucp").
    /// </summary>
    public required string Protocol { get; init; }

    /// <summary>
    /// Capabilities the agent supports.
    /// </summary>
    public IReadOnlyList<string> Capabilities { get; init; } = [];

    /// <summary>
    /// When this identity expires, if applicable.
    /// </summary>
    public DateTimeOffset? ExpiresAt { get; init; }

    /// <summary>
    /// Additional claims from authentication.
    /// </summary>
    public IReadOnlyDictionary<string, object>? Claims { get; init; }
}

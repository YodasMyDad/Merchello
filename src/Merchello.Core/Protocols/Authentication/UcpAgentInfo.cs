namespace Merchello.Core.Protocols.Authentication;

/// <summary>
/// Information extracted from a UCP-Agent header.
/// </summary>
public class UcpAgentInfo
{
    /// <summary>
    /// The agent's profile URI.
    /// </summary>
    public required string ProfileUri { get; init; }

    /// <summary>
    /// The protocol version the agent supports.
    /// </summary>
    public string? Version { get; init; }
}

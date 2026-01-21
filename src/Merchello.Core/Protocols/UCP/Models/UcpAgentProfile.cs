using System.Text.Json.Serialization;

namespace Merchello.Core.Protocols.UCP.Models;

/// <summary>
/// Represents a UCP agent's profile fetched from their profile URI.
/// Contains the agent's capabilities, webhook URL, and other metadata.
/// </summary>
public class UcpAgentProfile
{
    /// <summary>
    /// Agent's display name.
    /// </summary>
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    /// <summary>
    /// UCP protocol metadata.
    /// </summary>
    [JsonPropertyName("ucp")]
    public UcpAgentProfileMetadata? Ucp { get; set; }
}

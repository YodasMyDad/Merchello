using System.Text.Json.Serialization;

namespace Merchello.Core.Protocols.UCP.Models;

/// <summary>
/// UCP metadata from an agent profile.
/// </summary>
public class UcpAgentProfileMetadata
{
    /// <summary>
    /// Protocol version the agent supports.
    /// </summary>
    [JsonPropertyName("version")]
    public string? Version { get; set; }

    /// <summary>
    /// Capabilities the agent supports.
    /// </summary>
    [JsonPropertyName("capabilities")]
    public List<UcpAgentCapability>? Capabilities { get; set; }

    /// <summary>
    /// Agent public keys used to verify signed transactional API requests.
    /// </summary>
    [JsonPropertyName("signing_keys")]
    public List<UcpSigningKey>? SigningKeys { get; set; }
}

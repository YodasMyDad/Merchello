using System.Text.Json.Serialization;

namespace Merchello.Core.Protocols.UCP.Models;

/// <summary>
/// A capability supported by the agent with its configuration.
/// </summary>
public class UcpAgentCapability
{
    /// <summary>
    /// Capability namespace (e.g., "dev.ucp.shopping.order").
    /// </summary>
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    /// <summary>
    /// Capability version.
    /// </summary>
    [JsonPropertyName("version")]
    public string? Version { get; set; }

    /// <summary>
    /// Capability-specific configuration.
    /// For Order capability, this contains webhook_url.
    /// </summary>
    [JsonPropertyName("config")]
    public UcpAgentCapabilityConfig? Config { get; set; }
}

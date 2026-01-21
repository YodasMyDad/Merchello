using System.Text.Json.Serialization;

namespace Merchello.Core.Protocols.UCP.Models;

/// <summary>
/// Configuration for an agent capability.
/// </summary>
public class UcpAgentCapabilityConfig
{
    /// <summary>
    /// Webhook URL for order lifecycle updates.
    /// </summary>
    [JsonPropertyName("webhook_url")]
    public string? WebhookUrl { get; set; }
}

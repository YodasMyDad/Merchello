namespace Merchello.Core.Protocols.Models;

/// <summary>
/// UCP protocol-specific settings.
/// </summary>
public class UcpSettings
{
    /// <summary>
    /// Whether UCP protocol is enabled.
    /// </summary>
    public bool Enabled { get; set; } = false;

    /// <summary>
    /// UCP protocol version this implementation supports.
    /// </summary>
    public string Version { get; set; } = ProtocolConstants.CurrentUcpVersion;

    /// <summary>
    /// Whether to require agent authentication.
    /// </summary>
    public bool RequireAuthentication { get; set; } = true;

    /// <summary>
    /// Allowed agent profile URIs ("*" for all).
    /// </summary>
    public List<string> AllowedAgents { get; set; } = ["*"];

    /// <summary>
    /// How often to rotate signing keys in days.
    /// </summary>
    public int SigningKeyRotationDays { get; set; } = 90;

    /// <summary>
    /// Webhook delivery timeout in seconds.
    /// </summary>
    public int WebhookTimeoutSeconds { get; set; } = 30;

    /// <summary>
    /// Number of times to retry failed webhooks.
    /// </summary>
    public int WebhookRetryCount { get; set; } = 3;

    /// <summary>
    /// Enabled capabilities.
    /// </summary>
    public UcpCapabilitySettings Capabilities { get; set; } = new();

    /// <summary>
    /// Enabled extensions.
    /// </summary>
    public UcpExtensionSettings Extensions { get; set; } = new();
}

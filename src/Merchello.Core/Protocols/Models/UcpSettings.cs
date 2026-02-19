namespace Merchello.Core.Protocols.Models;

/// <summary>
/// UCP protocol-specific settings.
/// </summary>
public class UcpSettings
{
    /// <summary>
    /// UCP protocol version this implementation supports.
    /// </summary>
    public string Version { get; set; } = ProtocolVersions.CurrentUcpVersion;

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
    /// Enabled capabilities.
    /// </summary>
    public UcpCapabilitySettings Capabilities { get; set; } = new();

    /// <summary>
    /// Enabled extensions.
    /// </summary>
    public UcpExtensionSettings Extensions { get; set; } = new();
}

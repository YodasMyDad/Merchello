namespace Merchello.Core.Protocols.Models;

/// <summary>
/// Configuration settings for protocol infrastructure.
/// </summary>
public class ProtocolSettings
{
    /// <summary>
    /// Whether protocol endpoints are enabled.
    /// </summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// Base path for well-known endpoints.
    /// </summary>
    public string WellKnownPath { get; set; } = "/.well-known";

    /// <summary>
    /// How long to cache manifests in minutes.
    /// </summary>
    public int ManifestCacheDurationMinutes { get; set; } = 60;

    /// <summary>
    /// Whether to require HTTPS for protocol endpoints.
    /// </summary>
    public bool RequireHttps { get; set; } = true;

    /// <summary>
    /// Minimum TLS version required.
    /// </summary>
    public string MinimumTlsVersion { get; set; } = "1.3";

    /// <summary>
    /// UCP-specific settings.
    /// </summary>
    public UcpSettings Ucp { get; set; } = new();
}

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

/// <summary>
/// UCP capability toggles.
/// </summary>
public class UcpCapabilitySettings
{
    /// <summary>
    /// Enable Checkout capability.
    /// </summary>
    public bool Checkout { get; set; } = true;

    /// <summary>
    /// Enable Order capability.
    /// </summary>
    public bool Order { get; set; } = true;

    /// <summary>
    /// Enable Identity Linking capability.
    /// </summary>
    public bool IdentityLinking { get; set; } = false;
}

/// <summary>
/// UCP extension toggles.
/// </summary>
public class UcpExtensionSettings
{
    /// <summary>
    /// Enable Discount extension.
    /// </summary>
    public bool Discount { get; set; } = true;

    /// <summary>
    /// Enable Fulfillment extension.
    /// </summary>
    public bool Fulfillment { get; set; } = true;

    /// <summary>
    /// Enable Buyer Consent extension.
    /// </summary>
    public bool BuyerConsent { get; set; } = false;

    /// <summary>
    /// Enable AP2 Mandates extension.
    /// </summary>
    public bool Ap2Mandates { get; set; } = false;
}

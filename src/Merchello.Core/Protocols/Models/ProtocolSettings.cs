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

namespace Merchello.Core.Accounting.Models;

/// <summary>
/// Tracks the source/origin of an invoice for analytics and auditing.
/// Captures where and how the invoice was created (web checkout, UCP agent, API, POS, etc.).
/// </summary>
public class InvoiceSource
{
    /// <summary>
    /// The source type identifier (e.g., "web", "ucp", "api", "pos", "mobile", "draft").
    /// Use <see cref="Constants.InvoiceSources"/> for well-known values.
    /// </summary>
    public string Type { get; set; } = Constants.InvoiceSources.Web;

    /// <summary>
    /// Human-readable display name for the source (e.g., "Online Store", "UCP Agent", "Point of Sale").
    /// </summary>
    public string? DisplayName { get; set; }

    /// <summary>
    /// Unique identifier for the source instance.
    /// Examples: UCP agent ID, API key ID, POS terminal ID.
    /// </summary>
    public string? SourceId { get; set; }

    /// <summary>
    /// Name/label for the source instance.
    /// Examples: agent name, API key name, terminal name.
    /// </summary>
    public string? SourceName { get; set; }

    /// <summary>
    /// Protocol version if applicable (e.g., UCP version "2026-01-11").
    /// </summary>
    public string? ProtocolVersion { get; set; }

    /// <summary>
    /// Profile URI for external agents (e.g., UCP-Agent profile URL).
    /// </summary>
    public string? ProfileUri { get; set; }

    /// <summary>
    /// Session/transaction ID from the source system.
    /// Examples: basket ID, UCP session ID, POS transaction ID.
    /// </summary>
    public string? SessionId { get; set; }

    /// <summary>
    /// Additional source-specific metadata.
    /// </summary>
    public Dictionary<string, object>? Metadata { get; set; }

    /// <summary>
    /// UTC timestamp when the source was recorded.
    /// </summary>
    public DateTime RecordedAtUtc { get; set; } = DateTime.UtcNow;
}

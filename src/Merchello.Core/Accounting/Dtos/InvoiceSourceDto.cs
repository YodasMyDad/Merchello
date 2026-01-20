namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// DTO for invoice source tracking information.
/// </summary>
public class InvoiceSourceDto
{
    /// <summary>
    /// The source type identifier (e.g., "web", "ucp", "api", "pos").
    /// </summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// Human-readable display name for the source.
    /// </summary>
    public string? DisplayName { get; set; }

    /// <summary>
    /// Unique identifier for the source instance (e.g., agent ID, API key ID).
    /// </summary>
    public string? SourceId { get; set; }

    /// <summary>
    /// Name/label for the source instance.
    /// </summary>
    public string? SourceName { get; set; }

    /// <summary>
    /// Protocol version if applicable (e.g., UCP version).
    /// </summary>
    public string? ProtocolVersion { get; set; }

    /// <summary>
    /// Session/transaction ID from the source system.
    /// </summary>
    public string? SessionId { get; set; }
}

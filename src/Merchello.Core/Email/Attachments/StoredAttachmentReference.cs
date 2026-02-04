namespace Merchello.Core.Email.Attachments;

/// <summary>
/// Reference to an attachment stored as a temp file.
/// Stored in OutboundDelivery.ExtendedData["attachments"] as JSON.
/// </summary>
public class StoredAttachmentReference
{
    /// <summary>
    /// Relative path from the attachment storage root.
    /// Example: "abc123-def456/Invoice-001.pdf"
    /// </summary>
    public required string StoragePath { get; init; }

    /// <summary>
    /// Original filename (e.g., "Invoice-12345.pdf").
    /// </summary>
    public required string FileName { get; init; }

    /// <summary>
    /// MIME content type (e.g., "application/pdf").
    /// </summary>
    public required string ContentType { get; init; }

    /// <summary>
    /// File size in bytes.
    /// </summary>
    public long FileSizeBytes { get; init; }

    /// <summary>
    /// When the file was created (UTC).
    /// </summary>
    public DateTime CreatedUtc { get; init; }
}

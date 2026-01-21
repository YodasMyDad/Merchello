namespace Merchello.Core.Email.Attachments;

/// <summary>
/// The result returned by an attachment generator.
/// </summary>
public class EmailAttachmentResult
{
    /// <summary>
    /// The attachment file content.
    /// </summary>
    public required byte[] Content { get; init; }

    /// <summary>
    /// The filename (e.g., "Invoice-12345.pdf").
    /// </summary>
    public required string FileName { get; init; }

    /// <summary>
    /// MIME content type (e.g., "application/pdf", "text/csv").
    /// Used for logging and validation; Umbraco/MimeKit infers type from file extension.
    /// </summary>
    public required string ContentType { get; init; }
}

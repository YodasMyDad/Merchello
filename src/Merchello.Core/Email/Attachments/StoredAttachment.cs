namespace Merchello.Core.Email.Attachments;

/// <summary>
/// Represents an attachment stored in OutboundDelivery.ExtendedData.
/// Attachments are serialized to JSON and stored as base64-encoded content.
/// </summary>
public class StoredAttachment
{
    /// <summary>
    /// The filename (e.g., "Invoice-12345.pdf").
    /// </summary>
    public required string FileName { get; init; }

    /// <summary>
    /// MIME content type (e.g., "application/pdf").
    /// </summary>
    public required string ContentType { get; init; }

    /// <summary>
    /// Base64-encoded file content.
    /// </summary>
    public required string ContentBase64 { get; init; }

    /// <summary>
    /// Creates a StoredAttachment from an EmailAttachmentResult.
    /// </summary>
    public static StoredAttachment FromResult(EmailAttachmentResult result)
    {
        return new StoredAttachment
        {
            FileName = result.FileName,
            ContentType = result.ContentType,
            ContentBase64 = Convert.ToBase64String(result.Content)
        };
    }

    /// <summary>
    /// Converts back to raw bytes.
    /// </summary>
    /// <exception cref="FormatException">Thrown if ContentBase64 is invalid.</exception>
    public byte[] GetContent() => Convert.FromBase64String(ContentBase64);

    /// <summary>
    /// Attempts to convert back to raw bytes, returning false if base64 is invalid.
    /// </summary>
    /// <param name="content">The decoded content if successful, empty array otherwise.</param>
    /// <returns>True if decoding succeeded, false otherwise.</returns>
    public bool TryGetContent(out byte[] content)
    {
        try
        {
            content = Convert.FromBase64String(ContentBase64);
            return true;
        }
        catch (FormatException)
        {
            content = Array.Empty<byte>();
            return false;
        }
    }
}

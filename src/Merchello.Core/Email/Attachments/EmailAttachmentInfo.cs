namespace Merchello.Core.Email.Attachments;

/// <summary>
/// Metadata about an attachment type for the UI.
/// </summary>
public class EmailAttachmentInfo
{
    /// <summary>
    /// Globally unique alias for the attachment (e.g., "order-invoice-pdf").
    /// </summary>
    public required string Alias { get; init; }

    /// <summary>
    /// Display name shown in the backoffice (e.g., "PDF Invoice").
    /// </summary>
    public required string DisplayName { get; init; }

    /// <summary>
    /// Optional description explaining what the attachment contains.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Optional inline SVG icon for the attachment type.
    /// </summary>
    public string? IconSvg { get; init; }

    /// <summary>
    /// The notification type this attachment supports.
    /// </summary>
    public required Type NotificationType { get; init; }

    /// <summary>
    /// The notification type name (for serialization/display).
    /// </summary>
    public required string NotificationTypeName { get; init; }

    /// <summary>
    /// The email topic this attachment is compatible with.
    /// </summary>
    public required string Topic { get; init; }
}

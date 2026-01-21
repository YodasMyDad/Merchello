namespace Merchello.Core.Email.Dtos;

/// <summary>
/// DTO for an email attachment type.
/// </summary>
public class EmailAttachmentDto
{
    /// <summary>
    /// Unique alias for the attachment (e.g., "order-invoice-pdf").
    /// </summary>
    public required string Alias { get; init; }

    /// <summary>
    /// Display name for the UI (e.g., "PDF Invoice").
    /// </summary>
    public required string DisplayName { get; init; }

    /// <summary>
    /// Optional description.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Optional inline SVG icon.
    /// </summary>
    public string? IconSvg { get; init; }

    /// <summary>
    /// The topic this attachment is compatible with.
    /// </summary>
    public required string Topic { get; init; }
}

namespace Merchello.Core.Email.Dtos;

/// <summary>
/// DTO for a list of email attachments grouped by topic.
/// </summary>
public class EmailAttachmentListDto
{
    /// <summary>
    /// The topic these attachments are for.
    /// </summary>
    public required string Topic { get; init; }

    /// <summary>
    /// Topic display name.
    /// </summary>
    public required string TopicDisplayName { get; init; }

    /// <summary>
    /// Available attachments for this topic.
    /// </summary>
    public required List<EmailAttachmentDto> Attachments { get; init; }
}

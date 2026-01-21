namespace Merchello.Core.Email.Services.Parameters;

/// <summary>
/// Parameters for creating a new email configuration.
/// </summary>
public class CreateEmailConfigurationParameters
{
    /// <summary>
    /// Display name for this email configuration.
    /// </summary>
    public required string Name { get; set; }

    /// <summary>
    /// The notification topic that triggers this email (e.g., "order.created").
    /// </summary>
    public required string Topic { get; set; }

    /// <summary>
    /// Relative path to the Razor template file (e.g., "OrderConfirmation.cshtml").
    /// </summary>
    public required string TemplatePath { get; set; }

    /// <summary>
    /// Expression for the To field. Supports {{token}} syntax.
    /// </summary>
    public required string ToExpression { get; set; }

    /// <summary>
    /// Expression for the email subject. Supports {{token}} syntax.
    /// </summary>
    public required string SubjectExpression { get; set; }

    /// <summary>
    /// Whether this email configuration is active.
    /// </summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// Expression for CC recipients. Supports {{token}} syntax.
    /// </summary>
    public string? CcExpression { get; set; }

    /// <summary>
    /// Expression for BCC recipients. Supports {{token}} syntax.
    /// </summary>
    public string? BccExpression { get; set; }

    /// <summary>
    /// Expression for the From field. Supports {{token}} syntax.
    /// If null/empty, uses default from settings.
    /// </summary>
    public string? FromExpression { get; set; }

    /// <summary>
    /// Optional description for this email configuration.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Attachment aliases to enable for this configuration.
    /// </summary>
    public List<string>? AttachmentAliases { get; set; }
}

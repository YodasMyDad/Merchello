using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Email.Models;

/// <summary>
/// Represents an email configuration that maps a notification topic to an email template.
/// Users create these in the backoffice Email Builder to automate email sending.
/// </summary>
public class EmailConfiguration
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// Display name for this email configuration.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// The notification topic that triggers this email (e.g., "order.created").
    /// </summary>
    public string Topic { get; set; } = string.Empty;

    /// <summary>
    /// Whether this email configuration is active.
    /// </summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// Relative path to the Razor template file (e.g., "OrderConfirmation.cshtml").
    /// </summary>
    public string TemplatePath { get; set; } = string.Empty;

    /// <summary>
    /// Expression for the To field. Supports {{token}} syntax (e.g., "{{order.customerEmail}}").
    /// Can be a fixed email or dynamic expression.
    /// </summary>
    public string ToExpression { get; set; } = string.Empty;

    /// <summary>
    /// Expression for CC recipients. Supports {{token}} syntax.
    /// </summary>
    public string? CcExpression { get; set; }

    /// <summary>
    /// Expression for BCC recipients. Supports {{token}} syntax.
    /// </summary>
    public string? BccExpression { get; set; }

    /// <summary>
    /// Expression for the From field. Supports {{token}} syntax or fixed email.
    /// If null/empty, uses default from settings.
    /// </summary>
    public string? FromExpression { get; set; }

    /// <summary>
    /// Expression for the email subject. Supports {{token}} syntax
    /// (e.g., "Order #{{order.orderNumber}} Confirmed").
    /// </summary>
    public string SubjectExpression { get; set; } = string.Empty;

    /// <summary>
    /// Optional description for this email configuration.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// When this configuration was created.
    /// </summary>
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When this configuration was last modified.
    /// </summary>
    public DateTime DateModified { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Total number of emails successfully sent with this configuration.
    /// </summary>
    public int TotalSent { get; set; }

    /// <summary>
    /// Total number of emails that failed to send.
    /// </summary>
    public int TotalFailed { get; set; }

    /// <summary>
    /// When an email was last successfully sent with this configuration.
    /// </summary>
    public DateTime? LastSentUtc { get; set; }

    /// <summary>
    /// Additional configuration data.
    /// </summary>
    public Dictionary<string, object> ExtendedData { get; set; } = [];
}

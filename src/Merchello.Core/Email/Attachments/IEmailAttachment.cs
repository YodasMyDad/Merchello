using Merchello.Core.Email.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Email.Attachments;

/// <summary>
/// Non-generic base interface for ExtensionManager discovery.
/// </summary>
public interface IEmailAttachment
{
    /// <summary>
    /// Globally unique identifier for this attachment type (e.g., "order-invoice-pdf").
    /// Must be lowercase-kebab-case format.
    /// </summary>
    string Alias { get; }

    /// <summary>
    /// Display name shown in backoffice dropdown.
    /// </summary>
    string DisplayName { get; }

    /// <summary>
    /// Optional description for the UI.
    /// </summary>
    string? Description { get; }

    /// <summary>
    /// Optional inline SVG for visual differentiation in the UI.
    /// If null, a default document icon is shown.
    /// </summary>
    string? IconSvg { get; }

    /// <summary>
    /// The notification type this attachment supports.
    /// Used for filtering in the UI based on selected topic.
    /// </summary>
    Type NotificationType { get; }
}

/// <summary>
/// Generic interface for typed attachment generators.
/// Attachment generators implement this to create attachments for specific notification types.
/// </summary>
/// <typeparam name="TNotification">The notification type this attachment supports.</typeparam>
public interface IEmailAttachment<TNotification> : IEmailAttachment
    where TNotification : MerchelloNotification
{
    /// <summary>
    /// Generates the attachment using the email model data.
    /// Return null to skip the attachment (for conditional attachments).
    /// </summary>
    /// <param name="model">The email model containing notification data and store context.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>The attachment result, or null to skip.</returns>
    Task<EmailAttachmentResult?> GenerateAsync(
        EmailModel<TNotification> model,
        CancellationToken ct = default);
}

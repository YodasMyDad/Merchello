using Merchello.Core.Email.Attachments;
using Merchello.Core.Email.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Email.Interfaces;

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

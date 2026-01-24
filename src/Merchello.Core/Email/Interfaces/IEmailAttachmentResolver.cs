using Merchello.Core.Email.Attachments;
using Merchello.Core.Email.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Email.Interfaces;

/// <summary>
/// Service that resolves and executes attachment generators.
/// </summary>
public interface IEmailAttachmentResolver
{
    /// <summary>
    /// Gets all registered attachment types.
    /// </summary>
    IReadOnlyList<EmailAttachmentInfo> GetAllAttachments();

    /// <summary>
    /// Gets attachment types compatible with a specific notification type.
    /// </summary>
    IReadOnlyList<EmailAttachmentInfo> GetAttachmentsForNotificationType(Type notificationType);

    /// <summary>
    /// Gets attachment types compatible with a topic.
    /// </summary>
    IReadOnlyList<EmailAttachmentInfo> GetAttachmentsForTopic(string topic);

    /// <summary>
    /// Gets an attachment by alias.
    /// </summary>
    EmailAttachmentInfo? GetAttachment(string alias);

    /// <summary>
    /// Validates that attachment aliases exist and are compatible with the topic.
    /// </summary>
    /// <param name="aliases">The aliases to validate.</param>
    /// <param name="topic">The topic to check compatibility with.</param>
    /// <returns>List of invalid aliases (empty if all valid).</returns>
    IReadOnlyList<string> ValidateAliases(IEnumerable<string> aliases, string topic);

    /// <summary>
    /// Generates attachments for an email using the specified attachment aliases.
    /// </summary>
    /// <typeparam name="TNotification">The notification type.</typeparam>
    /// <param name="model">The email model containing notification data.</param>
    /// <param name="attachmentAliases">The aliases of attachments to generate.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>List of generated attachments (failed/skipped attachments are excluded).</returns>
    Task<IReadOnlyList<EmailAttachmentResult>> GenerateAttachmentsAsync<TNotification>(
        EmailModel<TNotification> model,
        IEnumerable<string> attachmentAliases,
        CancellationToken ct = default) where TNotification : MerchelloNotification;
}

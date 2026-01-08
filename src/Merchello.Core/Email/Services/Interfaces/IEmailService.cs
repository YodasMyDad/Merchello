using Merchello.Core.Email.Dtos;
using Merchello.Core.Email.Models;
using Merchello.Core.Notifications.Base;
using Merchello.Core.Webhooks.Models;

namespace Merchello.Core.Email.Services.Interfaces;

/// <summary>
/// Service for sending and managing email deliveries.
/// </summary>
public interface IEmailService
{
    /// <summary>
    /// Queues an email for delivery. Creates an OutboundDelivery record.
    /// </summary>
    /// <typeparam name="TNotification">The notification type.</typeparam>
    /// <param name="config">The email configuration to use.</param>
    /// <param name="notification">The notification that triggered the email.</param>
    /// <param name="entityId">Optional entity ID (e.g., Order ID).</param>
    /// <param name="entityType">Optional entity type name.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>The created OutboundDelivery record.</returns>
    Task<OutboundDelivery> QueueDeliveryAsync<TNotification>(
        EmailConfiguration config,
        TNotification notification,
        Guid? entityId = null,
        string? entityType = null,
        CancellationToken ct = default) where TNotification : MerchelloNotification;

    /// <summary>
    /// Sends an email immediately, bypassing the queue.
    /// Used for time-sensitive emails like password reset.
    /// </summary>
    /// <typeparam name="TNotification">The notification type.</typeparam>
    /// <param name="config">The email configuration to use.</param>
    /// <param name="notification">The notification that triggered the email.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>True if sent successfully, false otherwise.</returns>
    Task<bool> SendImmediateAsync<TNotification>(
        EmailConfiguration config,
        TNotification notification,
        CancellationToken ct = default) where TNotification : MerchelloNotification;

    /// <summary>
    /// Delivers a queued email (processes an OutboundDelivery record).
    /// </summary>
    /// <param name="deliveryId">The delivery ID to process.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>True if delivered successfully, false otherwise.</returns>
    Task<bool> DeliverAsync(Guid deliveryId, CancellationToken ct = default);

    /// <summary>
    /// Renders an email template to HTML.
    /// </summary>
    /// <typeparam name="TNotification">The notification type.</typeparam>
    /// <param name="templatePath">The template path.</param>
    /// <param name="model">The email model.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>The rendered HTML string.</returns>
    Task<string> RenderTemplateAsync<TNotification>(
        string templatePath,
        EmailModel<TNotification> model,
        CancellationToken ct = default) where TNotification : MerchelloNotification;

    /// <summary>
    /// Sends a test email to a specific recipient.
    /// </summary>
    /// <param name="configurationId">The email configuration ID.</param>
    /// <param name="testRecipient">The test recipient email address.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>The result of the test send.</returns>
    Task<EmailSendTestResultDto> SendTestEmailAsync(
        Guid configurationId,
        string testRecipient,
        CancellationToken ct = default);

    /// <summary>
    /// Previews an email without sending.
    /// </summary>
    /// <param name="configurationId">The email configuration ID.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>The preview result with rendered content.</returns>
    Task<EmailPreviewDto> PreviewAsync(Guid configurationId, CancellationToken ct = default);

    /// <summary>
    /// Processes pending email retries.
    /// </summary>
    /// <param name="ct">Cancellation token.</param>
    Task ProcessPendingRetriesAsync(CancellationToken ct = default);

    /// <summary>
    /// Gets the store context for email templates.
    /// </summary>
    /// <returns>The store context.</returns>
    EmailStoreContext GetStoreContext();
}

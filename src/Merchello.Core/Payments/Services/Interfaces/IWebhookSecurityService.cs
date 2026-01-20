using Merchello.Core.Payments.Models;

namespace Merchello.Core.Payments.Services.Interfaces;

/// <summary>
/// Centralized webhook security service providing rate limiting,
/// idempotency tracking, and audit logging for payment webhooks.
///
/// Note: Timestamp/replay attack prevention via signature validation is handled
/// by each provider's ValidateWebhookAsync method, as HMAC signatures inherently
/// include timestamp verification specific to each provider's implementation.
/// </summary>
public interface IWebhookSecurityService
{
    /// <summary>
    /// Checks if the webhook request should be rate limited.
    /// </summary>
    /// <param name="providerAlias">The payment provider alias.</param>
    /// <param name="remoteIpAddress">The remote IP address of the request.</param>
    /// <returns>True if the request should be rejected due to rate limiting.</returns>
    bool IsRateLimited(string providerAlias, string? remoteIpAddress);

    /// <summary>
    /// Records a webhook security event for audit purposes.
    /// </summary>
    /// <param name="eventType">The type of security event.</param>
    /// <param name="providerAlias">The payment provider alias.</param>
    /// <param name="details">Additional details about the event.</param>
    /// <param name="remoteIpAddress">The remote IP address of the request.</param>
    void LogSecurityEvent(
        WebhookSecurityEventType eventType,
        string providerAlias,
        string details,
        string? remoteIpAddress = null);

    /// <summary>
    /// Checks if a webhook has already been processed (idempotency check by event ID).
    /// </summary>
    /// <param name="providerAlias">The payment provider alias.</param>
    /// <param name="webhookEventId">The unique webhook event ID from the provider.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>True if the webhook has already been processed.</returns>
    Task<bool> HasBeenProcessedAsync(string providerAlias, string webhookEventId, CancellationToken ct = default);

    /// <summary>
    /// Atomically attempts to mark a webhook as being processed.
    /// Use this to prevent concurrent duplicate processing.
    /// </summary>
    /// <param name="providerAlias">The payment provider alias.</param>
    /// <param name="webhookEventId">The unique webhook event ID from the provider.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>
    /// True if this call successfully claimed processing rights.
    /// False if the webhook is already being processed or has been processed.
    /// </returns>
    Task<bool> TryMarkAsProcessingAsync(string providerAlias, string webhookEventId, CancellationToken ct = default);

    /// <summary>
    /// Marks a webhook as processed for idempotency tracking.
    /// Call this after successfully processing a webhook.
    /// </summary>
    /// <param name="providerAlias">The payment provider alias.</param>
    /// <param name="webhookEventId">The unique webhook event ID from the provider.</param>
    void MarkAsProcessed(string providerAlias, string webhookEventId);

    /// <summary>
    /// Clears the processing marker if processing fails before calling MarkAsProcessed.
    /// </summary>
    /// <param name="providerAlias">The payment provider alias.</param>
    /// <param name="webhookEventId">The unique webhook event ID from the provider.</param>
    void ClearProcessingMarker(string providerAlias, string webhookEventId);
}

namespace Merchello.Core.Payments.Models;

/// <summary>
/// Types of webhook security events for audit logging.
/// </summary>
public enum WebhookSecurityEventType
{
    /// <summary>
    /// Webhook signature validation failed.
    /// </summary>
    SignatureValidationFailed,

    /// <summary>
    /// Webhook was rejected due to rate limiting.
    /// </summary>
    RateLimited,

    /// <summary>
    /// Duplicate webhook was received (already processed).
    /// </summary>
    DuplicateWebhook,

    /// <summary>
    /// Webhook was processed successfully.
    /// </summary>
    ProcessedSuccessfully,

    /// <summary>
    /// Webhook processing failed.
    /// </summary>
    ProcessingFailed
}

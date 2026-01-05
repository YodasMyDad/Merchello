namespace Merchello.Core.Webhooks.Models.Enums;

/// <summary>
/// Status of a webhook delivery attempt.
/// </summary>
public enum WebhookDeliveryStatus
{
    /// <summary>
    /// Delivery is queued and waiting to be sent.
    /// </summary>
    Pending = 0,

    /// <summary>
    /// Delivery is currently being sent.
    /// </summary>
    Sending = 1,

    /// <summary>
    /// Delivery completed successfully (2xx response).
    /// </summary>
    Succeeded = 2,

    /// <summary>
    /// Delivery failed and may be retried.
    /// </summary>
    Failed = 3,

    /// <summary>
    /// Delivery failed and is scheduled for retry.
    /// </summary>
    Retrying = 4,

    /// <summary>
    /// Delivery failed and max retries exceeded.
    /// </summary>
    Abandoned = 5
}

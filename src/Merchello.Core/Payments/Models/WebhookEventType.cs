namespace Merchello.Core.Payments.Models;

/// <summary>
/// Types of webhook events that can be processed.
/// </summary>
public enum WebhookEventType
{
    /// <summary>
    /// Payment was completed successfully.
    /// </summary>
    PaymentCompleted,

    /// <summary>
    /// Payment failed.
    /// </summary>
    PaymentFailed,

    /// <summary>
    /// Payment was cancelled by the customer.
    /// </summary>
    PaymentCancelled,

    /// <summary>
    /// A refund was processed.
    /// </summary>
    RefundCompleted,

    /// <summary>
    /// A chargeback/dispute was opened.
    /// </summary>
    DisputeOpened,

    /// <summary>
    /// A chargeback/dispute was resolved.
    /// </summary>
    DisputeResolved,

    /// <summary>
    /// Unknown or unhandled event type.
    /// </summary>
    Unknown
}

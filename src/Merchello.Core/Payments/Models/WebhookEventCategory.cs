namespace Merchello.Core.Payments.Models;

/// <summary>
/// Categories for webhook events.
/// </summary>
public enum WebhookEventCategory
{
    /// <summary>
    /// Payment-related events.
    /// </summary>
    Payment,

    /// <summary>
    /// Refund-related events.
    /// </summary>
    Refund,

    /// <summary>
    /// Dispute/chargeback-related events.
    /// </summary>
    Dispute,

    /// <summary>
    /// Other/miscellaneous events.
    /// </summary>
    Other
}

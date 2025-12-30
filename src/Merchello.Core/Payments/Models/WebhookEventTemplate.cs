namespace Merchello.Core.Payments.Models;

/// <summary>
/// Defines a webhook event that can be simulated for testing.
/// </summary>
public class WebhookEventTemplate
{
    /// <summary>
    /// The provider-specific event type string (e.g., "checkout.session.completed" for Stripe).
    /// </summary>
    public required string EventType { get; init; }

    /// <summary>
    /// Human-readable display name for the event.
    /// </summary>
    public required string DisplayName { get; init; }

    /// <summary>
    /// Description of what this event represents.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Category of the event for UI grouping.
    /// </summary>
    public WebhookEventCategory Category { get; init; }

    /// <summary>
    /// The corresponding Merchello event type this maps to.
    /// </summary>
    public WebhookEventType MerchelloEventType { get; init; }
}

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

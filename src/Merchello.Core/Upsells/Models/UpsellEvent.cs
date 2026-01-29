namespace Merchello.Core.Upsells.Models;

/// <summary>
/// An analytics event recorded for an upsell rule (impression, click, or conversion).
/// </summary>
public class UpsellEvent
{
    /// <summary>
    /// Unique identifier for the event.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// The upsell rule that generated this event.
    /// </summary>
    public Guid UpsellRuleId { get; set; }

    /// <summary>
    /// Navigation property to the upsell rule.
    /// </summary>
    public UpsellRule UpsellRule { get; set; } = null!;

    /// <summary>
    /// The type of event (Impression, Click, Conversion).
    /// </summary>
    public UpsellEventType EventType { get; set; }

    /// <summary>
    /// The recommended product interacted with (null for rule-level impressions).
    /// </summary>
    public Guid? ProductId { get; set; }

    /// <summary>
    /// The basket context when the event occurred.
    /// </summary>
    public Guid? BasketId { get; set; }

    /// <summary>
    /// The customer if authenticated.
    /// </summary>
    public Guid? CustomerId { get; set; }

    /// <summary>
    /// The invoice for conversion events.
    /// </summary>
    public Guid? InvoiceId { get; set; }

    /// <summary>
    /// Revenue from conversion events.
    /// </summary>
    public decimal? Amount { get; set; }

    /// <summary>
    /// Where the upsell was displayed when the event occurred.
    /// </summary>
    public UpsellDisplayLocation DisplayLocation { get; set; }

    /// <summary>
    /// When the event was recorded (UTC).
    /// </summary>
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;
}

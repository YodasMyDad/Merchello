using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Checkout.Models;

/// <summary>
/// Represents an abandoned checkout record for tracking and recovery purposes.
/// </summary>
public class AbandonedCheckout
{
    /// <summary>
    /// Unique identifier for the abandoned checkout record.
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// The ID of the basket that was abandoned.
    /// </summary>
    public Guid BasketId { get; set; }

    /// <summary>
    /// The ID of the customer, if known.
    /// </summary>
    public Guid? CustomerId { get; set; }

    /// <summary>
    /// The customer's email address (captured during checkout).
    /// </summary>
    public string? Email { get; set; }

    /// <summary>
    /// Current status of the abandoned checkout.
    /// </summary>
    public AbandonedCheckoutStatus Status { get; set; } = AbandonedCheckoutStatus.Active;

    // Timestamps

    /// <summary>
    /// When the abandoned checkout record was created (first email capture).
    /// </summary>
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Last activity timestamp (updated on each checkout action).
    /// </summary>
    public DateTime LastActivityUtc { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When the checkout was marked as abandoned.
    /// </summary>
    public DateTime? DateAbandoned { get; set; }

    /// <summary>
    /// When the customer returned via recovery link.
    /// </summary>
    public DateTime? DateRecovered { get; set; }

    /// <summary>
    /// When the recovered checkout was converted to an order.
    /// </summary>
    public DateTime? DateConverted { get; set; }

    /// <summary>
    /// When the recovery window expired.
    /// </summary>
    public DateTime? DateExpired { get; set; }

    // Recovery

    /// <summary>
    /// The invoice ID if the checkout was converted to an order.
    /// </summary>
    public Guid? RecoveredInvoiceId { get; set; }

    /// <summary>
    /// Recovery token for the unique recovery link.
    /// </summary>
    public string? RecoveryToken { get; set; }

    /// <summary>
    /// When the recovery token expires.
    /// </summary>
    public DateTime? RecoveryTokenExpiresUtc { get; set; }

    /// <summary>
    /// Number of recovery emails sent.
    /// </summary>
    public int RecoveryEmailsSent { get; set; }

    /// <summary>
    /// When the last recovery email was sent.
    /// </summary>
    public DateTime? LastRecoveryEmailSentUtc { get; set; }

    // Basket snapshot (preserved after basket deletion)

    /// <summary>
    /// Total value of the abandoned basket.
    /// </summary>
    public decimal BasketTotal { get; set; }

    /// <summary>
    /// Currency code of the basket (e.g., "USD", "GBP").
    /// </summary>
    public string? CurrencyCode { get; set; }

    /// <summary>
    /// Currency symbol for the basket (e.g., "$", "£").
    /// </summary>
    public string? CurrencySymbol { get; set; }

    /// <summary>
    /// Number of items in the basket at abandonment.
    /// </summary>
    public int ItemCount { get; set; }

    /// <summary>
    /// Customer name from billing address.
    /// </summary>
    public string? CustomerName { get; set; }

    /// <summary>
    /// Extended data for custom fields.
    /// </summary>
    public Dictionary<string, object> ExtendedData { get; set; } = [];

    // Navigation

    /// <summary>
    /// Navigation property to the basket (may be null after conversion).
    /// </summary>
    public virtual Basket? Basket { get; set; }
}

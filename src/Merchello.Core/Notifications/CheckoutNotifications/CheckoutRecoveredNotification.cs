using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.CheckoutNotifications;

/// <summary>
/// Notification published when a customer returns via a recovery link.
/// Used for analytics and optionally notifying staff.
/// </summary>
public class CheckoutRecoveredNotification(
    Guid abandonedCheckoutId,
    Guid basketId,
    string? customerEmail,
    decimal basketTotal,
    DateTime originalAbandonmentDate) : MerchelloNotification
{
    /// <summary>
    /// The ID of the abandoned checkout record.
    /// </summary>
    public Guid AbandonedCheckoutId { get; } = abandonedCheckoutId;

    /// <summary>
    /// The ID of the basket that was recovered.
    /// </summary>
    public Guid BasketId { get; } = basketId;

    /// <summary>
    /// The customer's email address.
    /// </summary>
    public string? CustomerEmail { get; } = customerEmail;

    /// <summary>
    /// The total value of the recovered basket.
    /// </summary>
    public decimal BasketTotal { get; } = basketTotal;

    /// <summary>
    /// When the checkout was originally abandoned.
    /// </summary>
    public DateTime OriginalAbandonmentDate { get; } = originalAbandonmentDate;

    /// <summary>
    /// When the checkout was recovered.
    /// </summary>
    public DateTime RecoveredDate { get; } = DateTime.UtcNow;

    /// <summary>
    /// How long the checkout was abandoned before recovery.
    /// </summary>
    public TimeSpan TimeToRecovery => RecoveredDate - OriginalAbandonmentDate;
}

using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.CheckoutNotifications;

/// <summary>
/// Notification published when a recovered checkout is converted to an order.
/// Used for analytics and success tracking.
/// </summary>
public class CheckoutRecoveryConvertedNotification(
    Guid abandonedCheckoutId,
    Guid invoiceId,
    string? customerEmail,
    decimal orderTotal,
    DateTime originalAbandonmentDate,
    DateTime recoveredDate) : MerchelloNotification
{
    /// <summary>
    /// The ID of the abandoned checkout record.
    /// </summary>
    public Guid AbandonedCheckoutId { get; } = abandonedCheckoutId;

    /// <summary>
    /// The ID of the created invoice/order.
    /// </summary>
    public Guid InvoiceId { get; } = invoiceId;

    /// <summary>
    /// The customer's email address.
    /// </summary>
    public string? CustomerEmail { get; } = customerEmail;

    /// <summary>
    /// The final order total.
    /// </summary>
    public decimal OrderTotal { get; } = orderTotal;

    /// <summary>
    /// When the checkout was originally abandoned.
    /// </summary>
    public DateTime OriginalAbandonmentDate { get; } = originalAbandonmentDate;

    /// <summary>
    /// When the checkout was recovered.
    /// </summary>
    public DateTime RecoveredDate { get; } = recoveredDate;

    /// <summary>
    /// When the order was placed.
    /// </summary>
    public DateTime ConvertedDate { get; } = DateTime.UtcNow;

    /// <summary>
    /// Total time from abandonment to conversion.
    /// </summary>
    public TimeSpan TimeToConversion => ConvertedDate - OriginalAbandonmentDate;
}

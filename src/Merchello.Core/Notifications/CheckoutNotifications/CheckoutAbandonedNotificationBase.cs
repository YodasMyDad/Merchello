using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.CheckoutNotifications;

/// <summary>
/// Base class for abandoned checkout notifications in the recovery email sequence.
/// </summary>
public abstract class CheckoutAbandonedNotificationBase : MerchelloNotification
{
    /// <summary>
    /// The ID of the abandoned checkout record.
    /// </summary>
    public Guid AbandonedCheckoutId { get; set; }

    /// <summary>
    /// The ID of the abandoned basket.
    /// </summary>
    public Guid BasketId { get; set; }

    /// <summary>
    /// The customer's email address.
    /// </summary>
    public string? CustomerEmail { get; set; }

    /// <summary>
    /// The customer's name.
    /// </summary>
    public string? CustomerName { get; set; }

    /// <summary>
    /// The total value of the abandoned basket.
    /// </summary>
    public decimal BasketTotal { get; set; }

    /// <summary>
    /// The currency code (e.g., "USD", "GBP").
    /// </summary>
    public string? CurrencyCode { get; set; }

    /// <summary>
    /// The currency symbol (e.g., "$", "£").
    /// </summary>
    public string? CurrencySymbol { get; set; }

    /// <summary>
    /// The recovery link to restore the basket.
    /// </summary>
    public string? RecoveryLink { get; set; }

    /// <summary>
    /// Formatted total with currency symbol.
    /// </summary>
    public string FormattedTotal { get; set; } = string.Empty;

    /// <summary>
    /// Which email in the sequence (1 = first, 2 = reminder, 3 = final).
    /// </summary>
    public int EmailSequenceNumber { get; set; }

    /// <summary>
    /// Number of items in the abandoned basket.
    /// </summary>
    public int ItemCount { get; set; }
}

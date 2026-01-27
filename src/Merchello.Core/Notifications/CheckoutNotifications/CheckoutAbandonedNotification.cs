using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.CheckoutNotifications;

/// <summary>
/// Notification published when a checkout is detected as abandoned.
/// Triggered by the abandonment detection background job.
/// </summary>
public class CheckoutAbandonedNotification(
    Guid abandonedCheckoutId,
    Guid? basketId,
    string? customerEmail,
    string? customerName,
    decimal basketTotal,
    string? currencyCode,
    string? recoveryLink) : MerchelloNotification
{
    /// <summary>
    /// The ID of the abandoned checkout record.
    /// </summary>
    public Guid AbandonedCheckoutId { get; } = abandonedCheckoutId;

    /// <summary>
    /// The ID of the basket that was abandoned.
    /// </summary>
    public Guid? BasketId { get; } = basketId;

    /// <summary>
    /// The customer's email address.
    /// </summary>
    public string? CustomerEmail { get; } = customerEmail;

    /// <summary>
    /// The customer's name.
    /// </summary>
    public string? CustomerName { get; } = customerName;

    /// <summary>
    /// The total value of the abandoned basket.
    /// </summary>
    public decimal BasketTotal { get; } = basketTotal;

    /// <summary>
    /// The currency code (e.g., "USD", "GBP").
    /// </summary>
    public string? CurrencyCode { get; } = currencyCode;

    /// <summary>
    /// The recovery link to restore the basket.
    /// </summary>
    public string? RecoveryLink { get; } = recoveryLink;

    /// <summary>
    /// Formatted total with currency (for email templates).
    /// </summary>
    public string FormattedTotal => $"{CurrencyCode} {BasketTotal:N2}";
}

using Merchello.Core.Discounts.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.DiscountNotifications;

/// <summary>
/// Notification published after a Discount's status has changed.
/// </summary>
public class DiscountStatusChangedNotification(
    Discounts.Models.Discount discount,
    DiscountStatus oldStatus,
    DiscountStatus newStatus) : MerchelloNotification
{
    /// <summary>
    /// Gets the discount whose status changed.
    /// </summary>
    public Discounts.Models.Discount Discount { get; } = discount;

    /// <summary>
    /// Gets the previous status before the change.
    /// </summary>
    public DiscountStatus OldStatus { get; } = oldStatus;

    /// <summary>
    /// Gets the new status that was applied.
    /// </summary>
    public DiscountStatus NewStatus { get; } = newStatus;
}

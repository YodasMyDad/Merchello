using Merchello.Core.Discounts.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.DiscountNotifications;

/// <summary>
/// Notification published before a Discount's status changes.
/// Handlers can modify the discount or cancel the status change.
/// </summary>
public class DiscountStatusChangingNotification : MerchelloCancelableNotification<Discounts.Models.Discount>
{
    public DiscountStatusChangingNotification(
        Discounts.Models.Discount discount,
        DiscountStatus oldStatus,
        DiscountStatus newStatus) : base(discount)
    {
        OldStatus = oldStatus;
        NewStatus = newStatus;
    }

    /// <summary>
    /// Gets the discount whose status is changing.
    /// </summary>
    public Discounts.Models.Discount Discount => Entity;

    /// <summary>
    /// Gets the current status before the change.
    /// </summary>
    public DiscountStatus OldStatus { get; }

    /// <summary>
    /// Gets the new status being applied.
    /// </summary>
    public DiscountStatus NewStatus { get; }
}

using Merchello.Core.Discounts.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.DiscountNotifications;

/// <summary>
/// Notification published before a Discount is deleted.
/// Handlers can cancel the operation.
/// </summary>
public class DiscountDeletingNotification(Discounts.Models.Discount discount)
    : MerchelloCancelableNotification<Discounts.Models.Discount>(discount)
{
    /// <summary>
    /// The discount being deleted.
    /// </summary>
    public Discounts.Models.Discount Discount => Entity;
}

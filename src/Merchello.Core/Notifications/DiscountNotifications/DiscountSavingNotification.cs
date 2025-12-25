using Merchello.Core.Discounts.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.DiscountNotifications;

/// <summary>
/// Notification published before a Discount is saved/updated.
/// Handlers can modify the entity or cancel the operation.
/// </summary>
public class DiscountSavingNotification(Discounts.Models.Discount discount)
    : MerchelloCancelableNotification<Discounts.Models.Discount>(discount)
{
    /// <summary>
    /// The discount being saved.
    /// </summary>
    public Discounts.Models.Discount Discount => Entity;
}

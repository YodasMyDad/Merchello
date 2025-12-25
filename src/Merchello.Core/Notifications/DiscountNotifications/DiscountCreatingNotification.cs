using Merchello.Core.Discounts.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.DiscountNotifications;

/// <summary>
/// Notification published before a Discount is created.
/// Handlers can modify the entity or cancel the operation.
/// </summary>
public class DiscountCreatingNotification(Discounts.Models.Discount discount)
    : MerchelloCancelableNotification<Discounts.Models.Discount>(discount)
{
    /// <summary>
    /// The discount being created.
    /// </summary>
    public Discounts.Models.Discount Discount => Entity;
}

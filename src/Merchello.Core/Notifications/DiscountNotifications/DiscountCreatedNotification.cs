using Merchello.Core.Discounts.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.DiscountNotifications;

/// <summary>
/// Notification published after a Discount has been created.
/// </summary>
public class DiscountCreatedNotification(Discounts.Models.Discount discount) : MerchelloNotification
{
    /// <summary>
    /// The discount that was created.
    /// </summary>
    public Discounts.Models.Discount Discount { get; } = discount;
}

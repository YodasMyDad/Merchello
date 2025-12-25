using Merchello.Core.Discounts.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.DiscountNotifications;

/// <summary>
/// Notification published after a Discount has been saved/updated.
/// </summary>
public class DiscountSavedNotification(Discounts.Models.Discount discount) : MerchelloNotification
{
    /// <summary>
    /// The discount that was saved.
    /// </summary>
    public Discounts.Models.Discount Discount { get; } = discount;
}

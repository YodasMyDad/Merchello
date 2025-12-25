using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.BasketNotifications;

/// <summary>
/// Notification published after a basket has been cleared.
/// </summary>
public class BasketClearedNotification(Merchello.Core.Checkout.Models.Basket basket) : MerchelloNotification
{
    /// <summary>
    /// Gets the basket that was cleared.
    /// </summary>
    public Merchello.Core.Checkout.Models.Basket Basket { get; } = basket;
}

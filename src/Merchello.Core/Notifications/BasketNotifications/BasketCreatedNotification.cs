using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.BasketNotifications;

/// <summary>
/// Notification published after a new basket has been created and persisted.
/// </summary>
public class BasketCreatedNotification(Merchello.Core.Checkout.Models.Basket basket) : MerchelloNotification
{
    /// <summary>
    /// Gets the newly created basket.
    /// </summary>
    public Merchello.Core.Checkout.Models.Basket Basket { get; } = basket;
}

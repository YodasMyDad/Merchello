using Merchello.Core.Notifications.Base;
using BasketModel = Merchello.Core.Checkout.Models.Basket;

namespace Merchello.Core.Notifications.BasketNotifications;

/// <summary>
/// Notification published before a basket is cleared.
/// Handlers can cancel the operation.
/// </summary>
public class BasketClearingNotification(BasketModel basket) : MerchelloSimpleCancelableNotification
{
    /// <summary>
    /// Gets the basket being cleared.
    /// </summary>
    public BasketModel Basket { get; } = basket;
}

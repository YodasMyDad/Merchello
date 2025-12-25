using Merchello.Core.Accounting.Models;
using Merchello.Core.Notifications.Base;
using BasketModel = Merchello.Core.Checkout.Models.Basket;

namespace Merchello.Core.Notifications.BasketNotifications;

/// <summary>
/// Notification published after an item has been removed from a basket.
/// </summary>
public class BasketItemRemovedNotification(
    BasketModel basket,
    LineItem lineItem) : MerchelloNotification
{
    /// <summary>
    /// Gets the basket the item was removed from.
    /// </summary>
    public BasketModel Basket { get; } = basket;

    /// <summary>
    /// Gets the line item that was removed.
    /// </summary>
    public LineItem Item { get; } = lineItem;
}

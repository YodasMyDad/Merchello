using Merchello.Core.Accounting.Models;
using Merchello.Core.Notifications.Base;
using BasketModel = Merchello.Core.Checkout.Models.Basket;

namespace Merchello.Core.Notifications.BasketNotifications;

/// <summary>
/// Notification published after a basket item's quantity has changed.
/// </summary>
public class BasketItemQuantityChangedNotification(
    BasketModel basket,
    LineItem lineItem,
    int oldQuantity,
    int newQuantity) : MerchelloNotification
{
    /// <summary>
    /// Gets the basket containing the item.
    /// </summary>
    public BasketModel Basket { get; } = basket;

    /// <summary>
    /// Gets the line item whose quantity changed.
    /// </summary>
    public LineItem Item { get; } = lineItem;

    /// <summary>
    /// Gets the previous quantity before the change.
    /// </summary>
    public int OldQuantity { get; } = oldQuantity;

    /// <summary>
    /// Gets the new quantity that was set.
    /// </summary>
    public int NewQuantity { get; } = newQuantity;
}

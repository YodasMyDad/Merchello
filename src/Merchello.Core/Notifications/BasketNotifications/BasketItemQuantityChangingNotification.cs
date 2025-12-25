using Merchello.Core.Accounting.Models;
using Merchello.Core.Notifications.Base;
using BasketModel = Merchello.Core.Checkout.Models.Basket;

namespace Merchello.Core.Notifications.BasketNotifications;

/// <summary>
/// Notification published before a basket item's quantity changes.
/// Handlers can cancel the operation.
/// </summary>
public class BasketItemQuantityChangingNotification(
    BasketModel basket,
    LineItem lineItem,
    int oldQuantity,
    int newQuantity) : MerchelloSimpleCancelableNotification
{
    /// <summary>
    /// Gets the basket containing the item.
    /// </summary>
    public BasketModel Basket { get; } = basket;

    /// <summary>
    /// Gets the line item whose quantity is changing.
    /// </summary>
    public LineItem Item { get; } = lineItem;

    /// <summary>
    /// Gets the current quantity before the change.
    /// </summary>
    public int OldQuantity { get; } = oldQuantity;

    /// <summary>
    /// Gets the new quantity being set.
    /// </summary>
    public int NewQuantity { get; } = newQuantity;
}

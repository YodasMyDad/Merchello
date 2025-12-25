using Merchello.Core.Accounting.Models;
using Merchello.Core.Notifications.Base;
using BasketModel = Merchello.Core.Checkout.Models.Basket;

namespace Merchello.Core.Notifications.BasketNotifications;

/// <summary>
/// Notification published before an item is removed from a basket.
/// Handlers can cancel the operation.
/// </summary>
public class BasketItemRemovingNotification : MerchelloCancelableNotification<LineItem>
{
    public BasketItemRemovingNotification(
        BasketModel basket,
        LineItem lineItem) : base(lineItem)
    {
        Basket = basket;
    }

    /// <summary>
    /// Gets the basket the item is being removed from.
    /// </summary>
    public BasketModel Basket { get; }

    /// <summary>
    /// Gets the line item being removed.
    /// </summary>
    public LineItem Item => Entity;
}

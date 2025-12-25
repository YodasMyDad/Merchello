using Merchello.Core.Notifications.Base;
using BasketModel = Merchello.Core.Checkout.Models.Basket;
using DiscountModel = Merchello.Core.Discounts.Models.Discount;

namespace Merchello.Core.Notifications.CheckoutNotifications;

/// <summary>
/// Notification published after a discount code has been removed from a basket.
/// </summary>
public class DiscountCodeRemovedNotification(
    BasketModel basket,
    DiscountModel discount) : MerchelloNotification
{
    /// <summary>
    /// Gets the basket the discount was removed from.
    /// </summary>
    public BasketModel Basket { get; } = basket;

    /// <summary>
    /// Gets the discount that was removed.
    /// </summary>
    public DiscountModel Discount { get; } = discount;
}

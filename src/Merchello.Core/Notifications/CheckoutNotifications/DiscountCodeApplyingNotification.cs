using Merchello.Core.Notifications.Base;
using BasketModel = Merchello.Core.Checkout.Models.Basket;

namespace Merchello.Core.Notifications.CheckoutNotifications;

/// <summary>
/// Notification published before a discount code is applied to a basket.
/// Handlers can cancel the operation.
/// </summary>
public class DiscountCodeApplyingNotification(
    BasketModel basket,
    string discountCode) : MerchelloSimpleCancelableNotification
{
    /// <summary>
    /// Gets the basket the discount code is being applied to.
    /// </summary>
    public BasketModel Basket { get; } = basket;

    /// <summary>
    /// Gets the discount code being applied.
    /// </summary>
    public string DiscountCode { get; } = discountCode;
}

using Merchello.Core.Notifications.Base;
using BasketModel = Merchello.Core.Checkout.Models.Basket;

namespace Merchello.Core.Notifications.CheckoutNotifications;

/// <summary>
/// Notification published after shipping selections have been changed.
/// </summary>
public class ShippingSelectionChangedNotification(
    BasketModel basket,
    Dictionary<Guid, Guid> shippingSelections) : MerchelloNotification
{
    /// <summary>
    /// Gets the updated basket.
    /// </summary>
    public BasketModel Basket { get; } = basket;

    /// <summary>
    /// Gets the new shipping selections (GroupId -> ShippingOptionId).
    /// </summary>
    public Dictionary<Guid, Guid> ShippingSelections { get; } = shippingSelections;
}

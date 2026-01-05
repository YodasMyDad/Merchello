using Merchello.Core.Notifications.Base;
using BasketModel = Merchello.Core.Checkout.Models.Basket;

namespace Merchello.Core.Notifications.CheckoutNotifications;

/// <summary>
/// Notification published before shipping selections are changed.
/// Handlers can cancel the operation or modify the selections.
/// </summary>
public class ShippingSelectionChangingNotification(
    BasketModel basket,
    Dictionary<Guid, Guid> shippingSelections) : MerchelloSimpleCancelableNotification
{
    /// <summary>
    /// Gets the basket being updated.
    /// </summary>
    public BasketModel Basket { get; } = basket;

    /// <summary>
    /// Gets or sets the shipping selections (GroupId -> ShippingOptionId).
    /// Handlers can modify this dictionary.
    /// </summary>
    public Dictionary<Guid, Guid> ShippingSelections { get; set; } = shippingSelections;
}

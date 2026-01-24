using Merchello.Core.Notifications.Base;
using BasketModel = Merchello.Core.Checkout.Models.Basket;

namespace Merchello.Core.Notifications.CheckoutNotifications;

/// <summary>
/// Notification published before shipping selections are changed.
/// Handlers can cancel the operation or modify the selections.
/// </summary>
public class ShippingSelectionChangingNotification(
    BasketModel basket,
    Dictionary<Guid, string> shippingSelections) : MerchelloSimpleCancelableNotification
{
    /// <summary>
    /// Gets the basket being updated.
    /// </summary>
    public BasketModel Basket { get; } = basket;

    /// <summary>
    /// Gets or sets the shipping selections (GroupId -> SelectionKey).
    /// Handlers can modify this dictionary.
    /// </summary>
    public Dictionary<Guid, string> ShippingSelections { get; set; } = shippingSelections;
}

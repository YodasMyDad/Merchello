using Merchello.Core.Locality.Models;
using Merchello.Core.Notifications.Base;
using BasketModel = Merchello.Core.Checkout.Models.Basket;

namespace Merchello.Core.Notifications.CheckoutNotifications;

/// <summary>
/// Notification published after checkout addresses have been changed.
/// </summary>
public class CheckoutAddressesChangedNotification(
    BasketModel basket,
    Address billingAddress,
    Address shippingAddress,
    bool shippingSameAsBilling) : MerchelloNotification
{
    /// <summary>
    /// Gets the updated basket.
    /// </summary>
    public BasketModel Basket { get; } = basket;

    /// <summary>
    /// Gets the new billing address.
    /// </summary>
    public Address BillingAddress { get; } = billingAddress;

    /// <summary>
    /// Gets the new shipping address.
    /// </summary>
    public Address ShippingAddress { get; } = shippingAddress;

    /// <summary>
    /// Gets whether shipping is same as billing.
    /// </summary>
    public bool ShippingSameAsBilling { get; } = shippingSameAsBilling;
}

using Merchello.Core.Locality.Models;
using Merchello.Core.Notifications.Base;
using BasketModel = Merchello.Core.Checkout.Models.Basket;

namespace Merchello.Core.Notifications.CheckoutNotifications;

/// <summary>
/// Notification published before checkout addresses are changed.
/// Handlers can cancel the operation or modify the addresses.
/// </summary>
public class CheckoutAddressesChangingNotification(
    BasketModel basket,
    Address billingAddress,
    Address shippingAddress,
    bool shippingSameAsBilling) : MerchelloSimpleCancelableNotification
{
    /// <summary>
    /// Gets the basket being updated.
    /// </summary>
    public BasketModel Basket { get; } = basket;

    /// <summary>
    /// Gets or sets the billing address. Handlers can modify this.
    /// </summary>
    public Address BillingAddress { get; set; } = billingAddress;

    /// <summary>
    /// Gets or sets the shipping address. Handlers can modify this.
    /// </summary>
    public Address ShippingAddress { get; set; } = shippingAddress;

    /// <summary>
    /// Gets whether shipping is same as billing.
    /// </summary>
    public bool ShippingSameAsBilling { get; } = shippingSameAsBilling;
}

using Merchello.Core.Notifications.Base;
using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Notifications.ShippingOptionNotifications;

/// <summary>
/// Notification published before a ShippingOption is saved/updated.
/// Handlers can modify the entity or cancel the operation.
/// </summary>
public class ShippingOptionSavingNotification(Shipping.Models.ShippingOption shippingOption)
    : MerchelloCancelableNotification<Shipping.Models.ShippingOption>(shippingOption)
{
    /// <summary>
    /// The shipping option being saved.
    /// </summary>
    public Shipping.Models.ShippingOption ShippingOption => Entity;
}

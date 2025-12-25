using Merchello.Core.Notifications.Base;
using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Notifications.ShippingOptionNotifications;

/// <summary>
/// Notification published before a ShippingOption is deleted.
/// Handlers can cancel the operation.
/// </summary>
public class ShippingOptionDeletingNotification(Shipping.Models.ShippingOption shippingOption)
    : MerchelloCancelableNotification<Shipping.Models.ShippingOption>(shippingOption)
{
    /// <summary>
    /// The shipping option being deleted.
    /// </summary>
    public Shipping.Models.ShippingOption ShippingOption => Entity;
}

using Merchello.Core.Notifications.Base;
using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Notifications.ShippingOptionNotifications;

/// <summary>
/// Notification published before a ShippingOption is created.
/// Handlers can modify the entity or cancel the operation.
/// </summary>
public class ShippingOptionCreatingNotification(Shipping.Models.ShippingOption shippingOption)
    : MerchelloCancelableNotification<Shipping.Models.ShippingOption>(shippingOption)
{
    /// <summary>
    /// The shipping option being created.
    /// </summary>
    public Shipping.Models.ShippingOption ShippingOption => Entity;
}

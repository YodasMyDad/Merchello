using Merchello.Core.Notifications.Base;
using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Notifications.ShippingOptionNotifications;

/// <summary>
/// Notification published after a ShippingOption has been created.
/// </summary>
public class ShippingOptionCreatedNotification(Shipping.Models.ShippingOption shippingOption) : MerchelloNotification
{
    /// <summary>
    /// The shipping option that was created.
    /// </summary>
    public Shipping.Models.ShippingOption ShippingOption { get; } = shippingOption;
}

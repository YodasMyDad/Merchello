using Merchello.Core.Notifications.Base;
using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Notifications.ShippingOptionNotifications;

/// <summary>
/// Notification published after a ShippingOption has been saved/updated.
/// </summary>
public class ShippingOptionSavedNotification(Shipping.Models.ShippingOption shippingOption) : MerchelloNotification
{
    /// <summary>
    /// The shipping option that was saved.
    /// </summary>
    public Shipping.Models.ShippingOption ShippingOption { get; } = shippingOption;
}

using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.ShippingTaxOverride;

/// <summary>
/// Notification published after a ShippingTaxOverride has been updated.
/// </summary>
public class ShippingTaxOverrideSavedNotification(Accounting.Models.ShippingTaxOverride shippingTaxOverride) : MerchelloNotification
{
    /// <summary>
    /// The shipping tax override that was updated.
    /// </summary>
    public Accounting.Models.ShippingTaxOverride ShippingTaxOverride { get; } = shippingTaxOverride;
}

using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.ShippingTaxOverride;

/// <summary>
/// Notification published after a ShippingTaxOverride has been created.
/// </summary>
public class ShippingTaxOverrideCreatedNotification(Accounting.Models.ShippingTaxOverride shippingTaxOverride) : MerchelloNotification
{
    /// <summary>
    /// The shipping tax override that was created.
    /// </summary>
    public Accounting.Models.ShippingTaxOverride ShippingTaxOverride { get; } = shippingTaxOverride;
}

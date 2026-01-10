using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.ShippingTaxOverride;

/// <summary>
/// Notification published before a ShippingTaxOverride is deleted.
/// Handlers can cancel the operation.
/// </summary>
public class ShippingTaxOverrideDeletingNotification(Accounting.Models.ShippingTaxOverride shippingTaxOverride)
    : MerchelloCancelableNotification<Accounting.Models.ShippingTaxOverride>(shippingTaxOverride)
{
    /// <summary>
    /// The shipping tax override being deleted.
    /// </summary>
    public Accounting.Models.ShippingTaxOverride ShippingTaxOverride => Entity;
}

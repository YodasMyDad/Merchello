using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.ShippingTaxOverride;

/// <summary>
/// Notification published before a ShippingTaxOverride is updated.
/// Handlers can modify the entity or cancel the operation.
/// </summary>
public class ShippingTaxOverrideSavingNotification(Accounting.Models.ShippingTaxOverride shippingTaxOverride)
    : MerchelloCancelableNotification<Accounting.Models.ShippingTaxOverride>(shippingTaxOverride)
{
    /// <summary>
    /// The shipping tax override being updated.
    /// </summary>
    public Accounting.Models.ShippingTaxOverride ShippingTaxOverride => Entity;
}

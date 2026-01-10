using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.ShippingTaxOverride;

/// <summary>
/// Notification published before a ShippingTaxOverride is created.
/// Handlers can modify the entity or cancel the operation.
/// </summary>
public class ShippingTaxOverrideCreatingNotification(Accounting.Models.ShippingTaxOverride shippingTaxOverride)
    : MerchelloCancelableNotification<Accounting.Models.ShippingTaxOverride>(shippingTaxOverride)
{
    /// <summary>
    /// The shipping tax override being created.
    /// </summary>
    public Accounting.Models.ShippingTaxOverride ShippingTaxOverride => Entity;
}

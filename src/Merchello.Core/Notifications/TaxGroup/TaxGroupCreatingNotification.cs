using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.TaxGroup;

/// <summary>
/// Notification published before a TaxGroup is created.
/// Handlers can modify the entity or cancel the operation.
/// </summary>
public class TaxGroupCreatingNotification(Accounting.Models.TaxGroup taxGroup)
    : MerchelloCancelableNotification<Accounting.Models.TaxGroup>(taxGroup)
{
    /// <summary>
    /// The tax group being created.
    /// </summary>
    public Accounting.Models.TaxGroup TaxGroup => Entity;
}

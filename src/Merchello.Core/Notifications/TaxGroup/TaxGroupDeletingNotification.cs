using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.TaxGroup;

/// <summary>
/// Notification published before a TaxGroup is deleted.
/// Handlers can cancel the operation.
/// </summary>
public class TaxGroupDeletingNotification(Accounting.Models.TaxGroup taxGroup)
    : MerchelloCancelableNotification<Accounting.Models.TaxGroup>(taxGroup)
{
    /// <summary>
    /// The tax group being deleted.
    /// </summary>
    public Accounting.Models.TaxGroup TaxGroup => Entity;
}

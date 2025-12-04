using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.TaxGroup;

/// <summary>
/// Notification published before a TaxGroup is saved/updated.
/// Handlers can modify the entity or cancel the operation.
/// </summary>
public class TaxGroupSavingNotification(Accounting.Models.TaxGroup taxGroup)
    : MerchelloCancelableNotification<Accounting.Models.TaxGroup>(taxGroup)
{
    /// <summary>
    /// The tax group being saved.
    /// </summary>
    public Accounting.Models.TaxGroup TaxGroup => Entity;
}

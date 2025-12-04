using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.TaxGroup;

/// <summary>
/// Notification published after a TaxGroup has been saved/updated.
/// </summary>
public class TaxGroupSavedNotification(Accounting.Models.TaxGroup taxGroup) : MerchelloNotification
{
    /// <summary>
    /// The tax group that was saved.
    /// </summary>
    public Accounting.Models.TaxGroup TaxGroup { get; } = taxGroup;
}

using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.TaxGroup;

/// <summary>
/// Notification published after a TaxGroup has been created.
/// </summary>
public class TaxGroupCreatedNotification(Accounting.Models.TaxGroup taxGroup) : MerchelloNotification
{
    /// <summary>
    /// The tax group that was created.
    /// </summary>
    public Accounting.Models.TaxGroup TaxGroup { get; } = taxGroup;
}

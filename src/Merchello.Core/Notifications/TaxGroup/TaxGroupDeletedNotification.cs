using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.TaxGroup;

/// <summary>
/// Notification published after a TaxGroup has been deleted.
/// </summary>
public class TaxGroupDeletedNotification(Guid taxGroupId, string? taxGroupName) : MerchelloNotification
{
    /// <summary>
    /// The ID of the tax group that was deleted.
    /// </summary>
    public Guid TaxGroupId { get; } = taxGroupId;

    /// <summary>
    /// The name of the tax group that was deleted (for logging/audit purposes).
    /// </summary>
    public string? TaxGroupName { get; } = taxGroupName;
}

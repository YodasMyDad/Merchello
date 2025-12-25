using Merchello.Core.Notifications.Base;
using Merchello.Core.Suppliers.Models;

namespace Merchello.Core.Notifications.SupplierNotifications;

/// <summary>
/// Notification published after a Supplier has been deleted.
/// </summary>
public class SupplierDeletedNotification(Suppliers.Models.Supplier supplier) : MerchelloNotification
{
    /// <summary>
    /// The supplier that was deleted.
    /// </summary>
    public Suppliers.Models.Supplier Supplier { get; } = supplier;
}

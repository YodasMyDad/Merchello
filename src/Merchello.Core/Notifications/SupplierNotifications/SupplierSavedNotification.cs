using Merchello.Core.Notifications.Base;
using Merchello.Core.Suppliers.Models;

namespace Merchello.Core.Notifications.SupplierNotifications;

/// <summary>
/// Notification published after a Supplier has been saved/updated.
/// </summary>
public class SupplierSavedNotification(Suppliers.Models.Supplier supplier) : MerchelloNotification
{
    /// <summary>
    /// The supplier that was saved.
    /// </summary>
    public Suppliers.Models.Supplier Supplier { get; } = supplier;
}

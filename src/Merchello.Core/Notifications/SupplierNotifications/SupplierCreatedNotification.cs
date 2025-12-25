using Merchello.Core.Notifications.Base;
using Merchello.Core.Suppliers.Models;

namespace Merchello.Core.Notifications.SupplierNotifications;

/// <summary>
/// Notification published after a Supplier has been created.
/// </summary>
public class SupplierCreatedNotification(Suppliers.Models.Supplier supplier) : MerchelloNotification
{
    /// <summary>
    /// The supplier that was created.
    /// </summary>
    public Suppliers.Models.Supplier Supplier { get; } = supplier;
}

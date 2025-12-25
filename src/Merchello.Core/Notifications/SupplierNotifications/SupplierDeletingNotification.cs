using Merchello.Core.Notifications.Base;
using Merchello.Core.Suppliers.Models;

namespace Merchello.Core.Notifications.SupplierNotifications;

/// <summary>
/// Notification published before a Supplier is deleted.
/// Handlers can cancel the operation.
/// </summary>
public class SupplierDeletingNotification(Suppliers.Models.Supplier supplier)
    : MerchelloCancelableNotification<Suppliers.Models.Supplier>(supplier)
{
    /// <summary>
    /// The supplier being deleted.
    /// </summary>
    public Suppliers.Models.Supplier Supplier => Entity;
}

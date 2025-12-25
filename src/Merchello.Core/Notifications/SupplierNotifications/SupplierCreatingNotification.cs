using Merchello.Core.Notifications.Base;
using Merchello.Core.Suppliers.Models;

namespace Merchello.Core.Notifications.SupplierNotifications;

/// <summary>
/// Notification published before a Supplier is created.
/// Handlers can modify the entity or cancel the operation.
/// </summary>
public class SupplierCreatingNotification(Suppliers.Models.Supplier supplier)
    : MerchelloCancelableNotification<Suppliers.Models.Supplier>(supplier)
{
    /// <summary>
    /// The supplier being created.
    /// </summary>
    public Suppliers.Models.Supplier Supplier => Entity;
}

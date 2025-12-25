using Merchello.Core.Notifications.Base;
using Merchello.Core.Suppliers.Models;

namespace Merchello.Core.Notifications.SupplierNotifications;

/// <summary>
/// Notification published before a Supplier is saved/updated.
/// Handlers can modify the entity or cancel the operation.
/// </summary>
public class SupplierSavingNotification(Suppliers.Models.Supplier supplier)
    : MerchelloCancelableNotification<Suppliers.Models.Supplier>(supplier)
{
    /// <summary>
    /// The supplier being saved.
    /// </summary>
    public Suppliers.Models.Supplier Supplier => Entity;
}

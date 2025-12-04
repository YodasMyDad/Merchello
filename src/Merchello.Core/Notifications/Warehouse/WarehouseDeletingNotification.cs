using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Warehouse;

/// <summary>
/// Notification published before a Warehouse is deleted.
/// Handlers can cancel the operation.
/// </summary>
public class WarehouseDeletingNotification(Warehouses.Models.Warehouse warehouse)
    : MerchelloCancelableNotification<Warehouses.Models.Warehouse>(warehouse)
{
    /// <summary>
    /// The warehouse being deleted.
    /// </summary>
    public Warehouses.Models.Warehouse Warehouse => Entity;
}

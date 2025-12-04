using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Warehouse;

/// <summary>
/// Notification published before a Warehouse is saved/updated.
/// Handlers can modify the entity or cancel the operation.
/// </summary>
public class WarehouseSavingNotification(Warehouses.Models.Warehouse warehouse)
    : MerchelloCancelableNotification<Warehouses.Models.Warehouse>(warehouse)
{
    /// <summary>
    /// The warehouse being saved.
    /// </summary>
    public Warehouses.Models.Warehouse Warehouse => Entity;
}

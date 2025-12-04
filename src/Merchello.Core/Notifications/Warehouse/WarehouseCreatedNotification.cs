using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Warehouse;

/// <summary>
/// Notification published after a Warehouse has been created.
/// </summary>
public class WarehouseCreatedNotification(Warehouses.Models.Warehouse warehouse) : MerchelloNotification
{
    /// <summary>
    /// The warehouse that was created.
    /// </summary>
    public Warehouses.Models.Warehouse Warehouse { get; } = warehouse;
}

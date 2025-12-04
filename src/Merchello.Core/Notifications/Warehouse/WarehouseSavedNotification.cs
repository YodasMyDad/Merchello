using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Warehouse;

/// <summary>
/// Notification published after a Warehouse has been saved/updated.
/// </summary>
public class WarehouseSavedNotification(Warehouses.Models.Warehouse warehouse) : MerchelloNotification
{
    /// <summary>
    /// The warehouse that was saved.
    /// </summary>
    public Warehouses.Models.Warehouse Warehouse { get; } = warehouse;
}

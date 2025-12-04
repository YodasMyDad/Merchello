using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Warehouse;

/// <summary>
/// Notification published after a Warehouse has been deleted.
/// </summary>
public class WarehouseDeletedNotification(Guid warehouseId, string? warehouseName) : MerchelloNotification
{
    /// <summary>
    /// The ID of the warehouse that was deleted.
    /// </summary>
    public Guid WarehouseId { get; } = warehouseId;

    /// <summary>
    /// The name of the warehouse that was deleted (for logging/audit purposes).
    /// </summary>
    public string? WarehouseName { get; } = warehouseName;
}

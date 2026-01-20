using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Inventory;

/// <summary>
/// Notification published after stock has been allocated (permanently deducted).
/// </summary>
/// <remarks>
/// Common use cases:
/// - Sync allocation to external WMS or ERP systems
/// - Update real-time inventory dashboards
/// - Trigger reorder workflows when remaining stock hits threshold
/// </remarks>
public class StockAllocatedNotification(
    Guid productId,
    Guid warehouseId,
    int quantity,
    int remainingStock) : MerchelloNotification
{
    /// <summary>
    /// The product ID.
    /// </summary>
    public Guid ProductId { get; } = productId;

    /// <summary>
    /// The warehouse ID.
    /// </summary>
    public Guid WarehouseId { get; } = warehouseId;

    /// <summary>
    /// The quantity that was allocated.
    /// </summary>
    public int Quantity { get; } = quantity;

    /// <summary>
    /// The remaining stock after this allocation.
    /// </summary>
    public int RemainingStock { get; } = remainingStock;
}

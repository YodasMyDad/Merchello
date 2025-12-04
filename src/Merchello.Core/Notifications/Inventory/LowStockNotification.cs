using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Inventory;

/// <summary>
/// Notification published when stock falls below a threshold.
/// Useful for alerting inventory managers or triggering reorder processes.
/// </summary>
public class LowStockNotification(
    Guid productId,
    Guid warehouseId,
    string? productName,
    int currentStock,
    int threshold) : MerchelloNotification
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
    /// The product name for display purposes.
    /// </summary>
    public string? ProductName { get; } = productName;

    /// <summary>
    /// The current stock level.
    /// </summary>
    public int CurrentStock { get; } = currentStock;

    /// <summary>
    /// The threshold that was breached.
    /// </summary>
    public int Threshold { get; } = threshold;
}

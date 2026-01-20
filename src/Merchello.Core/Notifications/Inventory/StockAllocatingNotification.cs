using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Inventory;

/// <summary>
/// Notification published before stock is allocated (permanently deducted).
/// Handlers can cancel the operation.
/// </summary>
/// <remarks>
/// Common use cases:
/// - Validate against external inventory before permanent deduction
/// - Block allocation for items flagged for quality issues
/// - Apply FIFO/LIFO or lot-based allocation rules
/// </remarks>
public class StockAllocatingNotification(
    Guid productId,
    Guid warehouseId,
    int quantity) : MerchelloSimpleCancelableNotification
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
    /// The quantity being allocated.
    /// </summary>
    public int Quantity { get; } = quantity;
}

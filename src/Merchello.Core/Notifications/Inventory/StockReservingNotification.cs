using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Inventory;

/// <summary>
/// Notification published before stock is reserved.
/// Handlers can cancel the operation.
/// </summary>
/// <remarks>
/// Common use cases:
/// - Validate reservation against external inventory systems
/// - Block reservations for items on hold (damage, recall)
/// - Apply custom allocation rules or priority queues
/// </remarks>
public class StockReservingNotification(
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
    /// The quantity being reserved.
    /// </summary>
    public int Quantity { get; } = quantity;
}

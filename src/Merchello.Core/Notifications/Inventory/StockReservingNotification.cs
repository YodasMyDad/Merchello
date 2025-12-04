using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Inventory;

/// <summary>
/// Notification published before stock is reserved.
/// Handlers can cancel the operation.
/// </summary>
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

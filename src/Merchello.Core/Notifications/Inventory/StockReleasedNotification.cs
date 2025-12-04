using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Inventory;

/// <summary>
/// Notification published after a stock reservation has been released.
/// </summary>
public class StockReleasedNotification(
    Guid productId,
    Guid warehouseId,
    int quantity) : MerchelloNotification
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
    /// The quantity that was released.
    /// </summary>
    public int Quantity { get; } = quantity;
}

using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Inventory;

/// <summary>
/// Notification published after stock has been reserved.
/// </summary>
/// <remarks>
/// Common use cases:
/// - Sync reservation to external WMS or ERP systems
/// - Log reservations for inventory audit trails
/// - Trigger reorder workflows when remaining stock is low
/// </remarks>
public class StockReservedNotification(
    Guid productId,
    Guid warehouseId,
    int quantity,
    int remainingAvailable) : MerchelloNotification
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
    /// The quantity that was reserved.
    /// </summary>
    public int Quantity { get; } = quantity;

    /// <summary>
    /// The remaining available stock after this reservation.
    /// </summary>
    public int RemainingAvailable { get; } = remainingAvailable;
}

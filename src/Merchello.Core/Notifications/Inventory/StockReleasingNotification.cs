using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Inventory;

/// <summary>
/// Notification published before a stock reservation is released.
/// Handlers can cancel the operation.
/// </summary>
/// <remarks>
/// Common use cases:
/// - Validate release against external inventory systems
/// - Apply custom hold periods before releasing
/// - Block release for orders in dispute or under review
/// </remarks>
public class StockReleasingNotification(
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
    /// The quantity being released.
    /// </summary>
    public int Quantity { get; } = quantity;
}

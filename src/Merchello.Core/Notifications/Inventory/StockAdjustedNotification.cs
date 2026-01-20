using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Inventory;

/// <summary>
/// Notification published after stock has been manually adjusted.
/// This is used for manual stock corrections, transfers, or adjustments.
/// </summary>
/// <remarks>
/// Common use cases:
/// - Sync adjustments to external WMS or ERP systems
/// - Log adjustments for inventory audit trails with reason tracking
/// - Detect unusual adjustment patterns for loss prevention
/// - Update accounting systems for inventory valuation
/// </remarks>
public class StockAdjustedNotification(
    Guid productId,
    Guid warehouseId,
    int previousStock,
    int newStock,
    string? reason = null) : MerchelloNotification
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
    /// The stock level before the adjustment.
    /// </summary>
    public int PreviousStock { get; } = previousStock;

    /// <summary>
    /// The stock level after the adjustment.
    /// </summary>
    public int NewStock { get; } = newStock;

    /// <summary>
    /// The change in stock (positive = increase, negative = decrease).
    /// </summary>
    public int Change => NewStock - PreviousStock;

    /// <summary>
    /// Optional reason for the adjustment.
    /// </summary>
    public string? Reason { get; } = reason;
}

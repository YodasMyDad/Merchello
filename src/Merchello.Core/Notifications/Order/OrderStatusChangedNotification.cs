using Merchello.Core.Accounting.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Order;

/// <summary>
/// Published after an order's status has changed successfully.
/// </summary>
public class OrderStatusChangedNotification(
    Accounting.Models.Order order,
    OrderStatus oldStatus,
    OrderStatus newStatus,
    string? reason = null) : MerchelloNotification
{
    /// <summary>
    /// Gets the order whose status changed.
    /// </summary>
    public Accounting.Models.Order Order { get; } = order;

    /// <summary>
    /// Gets the previous status before the change.
    /// </summary>
    public OrderStatus OldStatus { get; } = oldStatus;

    /// <summary>
    /// Gets the new status that was applied.
    /// </summary>
    public OrderStatus NewStatus { get; } = newStatus;

    /// <summary>
    /// Gets the reason for the status change (e.g., cancellation reason).
    /// </summary>
    public string? Reason { get; } = reason;
}

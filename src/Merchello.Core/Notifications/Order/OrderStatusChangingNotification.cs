using Merchello.Core.Accounting.Models;
using Merchello.Core.Notifications.Base;

namespace Merchello.Core.Notifications.Order;

/// <summary>
/// Published before an order's status changes. Handlers can modify the order or cancel the status change.
/// </summary>
public class OrderStatusChangingNotification : MerchelloCancelableNotification<Accounting.Models.Order>
{
    public OrderStatusChangingNotification(
        Accounting.Models.Order order,
        OrderStatus oldStatus,
        OrderStatus newStatus,
        string? reason = null) : base(order)
    {
        OldStatus = oldStatus;
        NewStatus = newStatus;
        Reason = reason;
    }

    /// <summary>
    /// Gets the order whose status is changing.
    /// </summary>
    public Accounting.Models.Order Order => Entity;

    /// <summary>
    /// Gets the current status before the change.
    /// </summary>
    public OrderStatus OldStatus { get; }

    /// <summary>
    /// Gets the new status being applied.
    /// </summary>
    public OrderStatus NewStatus { get; }

    /// <summary>
    /// Gets the reason for the status change (e.g., cancellation reason).
    /// </summary>
    public string? Reason { get; }
}

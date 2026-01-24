using Merchello.Core.Accounting.Models;

namespace Merchello.Core.Accounting.Extensions;

/// <summary>
/// Extension methods for OrderStatus enum to provide display values.
/// Centralizes status-to-display logic to avoid duplication in frontend.
/// </summary>
public static class OrderStatusExtensions
{
    /// <summary>
    /// Gets the human-readable label for an order status.
    /// </summary>
    public static string ToLabel(this OrderStatus status) => status switch
    {
        OrderStatus.Pending => "Pending",
        OrderStatus.AwaitingStock => "Awaiting Stock",
        OrderStatus.ReadyToFulfill => "Ready to Fulfill",
        OrderStatus.Processing => "Processing",
        OrderStatus.PartiallyShipped => "Partially Shipped",
        OrderStatus.Shipped => "Shipped",
        OrderStatus.Completed => "Completed",
        OrderStatus.Cancelled => "Cancelled",
        OrderStatus.OnHold => "On Hold",
        _ => "Unknown"
    };

    /// <summary>
    /// Gets the CSS class for styling order status badges.
    /// </summary>
    public static string ToCssClass(this OrderStatus status) => status switch
    {
        OrderStatus.Cancelled => "cancelled",
        OrderStatus.Shipped or OrderStatus.Completed => "shipped",
        _ => "unfulfilled"
    };
}

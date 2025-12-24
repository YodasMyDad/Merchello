using Merchello.Core.Accounting.Models;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.Accounting.Handlers;

/// <summary>
/// Default implementation of order status handler with standard business rules
/// </summary>
public class DefaultOrderStatusHandler(ILogger<DefaultOrderStatusHandler> logger) : IOrderStatusHandler
{
    public Task<bool> CanTransitionAsync(Order order, OrderStatus newStatus, CancellationToken cancellationToken = default)
    {
        var oldStatus = order.Status;

        // Same status is always allowed
        if (oldStatus == newStatus)
            return Task.FromResult(true);

        // Validate common transition rules
        var isValid = (oldStatus, newStatus) switch
        {
            // Can't do anything with a cancelled order except view it
            (OrderStatus.Cancelled, _) => false,

            // Completed orders can only revert to Shipped (if delivery status changes)
            (OrderStatus.Completed, OrderStatus.Shipped) => true,
            (OrderStatus.Completed, _) => false,

            // Can't cancel an order that's already shipped or completed
            (OrderStatus.Shipped, OrderStatus.Cancelled) => false,
            (OrderStatus.PartiallyShipped, OrderStatus.Cancelled) => false,

            // Can't go backwards in the fulfillment process
            (OrderStatus.Shipped, OrderStatus.Processing) => false,
            (OrderStatus.Shipped, OrderStatus.ReadyToFulfill) => false,
            (OrderStatus.Processing, OrderStatus.ReadyToFulfill) => false,
            (OrderStatus.Processing, OrderStatus.Pending) => false,

            // Can't mark as shipped if it hasn't been processed
            (OrderStatus.Pending, OrderStatus.Shipped) => false,
            (OrderStatus.AwaitingStock, OrderStatus.Shipped) => false,
            (OrderStatus.ReadyToFulfill, OrderStatus.Shipped) => false,

            // All other transitions are allowed by default
            _ => true
        };

        if (!isValid)
        {
            logger.LogWarning(
                "Invalid status transition attempted for order {OrderId}: {OldStatus} -> {NewStatus}",
                order.Id, oldStatus, newStatus);
        }

        return Task.FromResult(isValid);
    }

    public Task OnStatusChangingAsync(Order order, OrderStatus oldStatus, OrderStatus newStatus, CancellationToken cancellationToken = default)
    {
        logger.LogInformation(
            "Order {OrderId} status changing: {OldStatus} -> {NewStatus}",
            order.Id, oldStatus, newStatus);

        // Set appropriate date fields based on new status
        switch (newStatus)
        {
            case OrderStatus.Processing:
                if (!order.ProcessingStartedDate.HasValue)
                {
                    order.ProcessingStartedDate = DateTime.UtcNow;
                }
                break;

            case OrderStatus.Shipped:
                // Only set if not already shipped (preserve original date when reverting from Completed)
                order.ShippedDate ??= DateTime.UtcNow;
                break;

            case OrderStatus.Completed:
                order.CompletedDate = DateTime.UtcNow;
                break;

            case OrderStatus.Cancelled:
                order.CancelledDate = DateTime.UtcNow;
                break;
        }

        // Clear CompletedDate when transitioning out of Completed status
        if (oldStatus == OrderStatus.Completed && newStatus != OrderStatus.Completed)
        {
            order.CompletedDate = null;
        }

        order.DateUpdated = DateTime.UtcNow;

        return Task.CompletedTask;
    }

    public Task OnStatusChangedAsync(Order order, OrderStatus oldStatus, OrderStatus newStatus, CancellationToken cancellationToken = default)
    {
        logger.LogInformation(
            "Order {OrderId} status changed: {OldStatus} -> {NewStatus}",
            order.Id, oldStatus, newStatus);

        return Task.CompletedTask;
    }
}


using Merchello.Core.Accounting.Models;

namespace Merchello.Core.Accounting.Handlers.Interfaces;

/// <summary>
/// Handler for order status transitions. Implement this interface to customize status validation and behavior.
/// </summary>
public interface IOrderStatusHandler
{
    /// <summary>
    /// Determines if a status transition is allowed
    /// </summary>
    Task<bool> CanTransitionAsync(Order order, OrderStatus newStatus, CancellationToken cancellationToken = default);

    /// <summary>
    /// Called before a status change is applied (allows validation or side effects)
    /// </summary>
    Task OnStatusChangingAsync(Order order, OrderStatus oldStatus, OrderStatus newStatus, CancellationToken cancellationToken = default);

    /// <summary>
    /// Called after a status change has been successfully applied
    /// </summary>
    Task OnStatusChangedAsync(Order order, OrderStatus oldStatus, OrderStatus newStatus, CancellationToken cancellationToken = default);
}


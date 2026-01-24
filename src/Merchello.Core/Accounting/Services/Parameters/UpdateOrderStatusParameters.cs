using Merchello.Core.Accounting.Models;

namespace Merchello.Core.Accounting.Services.Parameters;

/// <summary>
/// Parameters for updating an order's status.
/// </summary>
public class UpdateOrderStatusParameters
{
    /// <summary>
    /// The order ID to update.
    /// </summary>
    public required Guid OrderId { get; set; }

    /// <summary>
    /// The new status to set.
    /// </summary>
    public required OrderStatus NewStatus { get; set; }

    /// <summary>
    /// Optional reason for the status change.
    /// </summary>
    public string? Reason { get; set; }
}

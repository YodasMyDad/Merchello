using Merchello.Core.Shared.Models;

namespace Merchello.Core.Checkout.Strategies.Models;

/// <summary>
/// Result of an order grouping strategy execution.
/// </summary>
public class OrderGroupingResult : IResult
{
    /// <summary>
    /// The order groups created by the strategy.
    /// Each group will become a separate order.
    /// </summary>
    public List<OrderGroup> Groups { get; set; } = [];

    /// <summary>
    /// Validation errors that occurred during grouping.
    /// If any errors exist, the checkout should not proceed.
    /// </summary>
    public List<string> Errors { get; set; } = [];

    /// <summary>
    /// Subset of errors caused by insufficient stock (vs region/config issues).
    /// </summary>
    public List<string> StockErrors { get; set; } = [];

    /// <summary>
    /// Whether the grouping was successful (no errors).
    /// </summary>
    public bool Success => Errors.Count == 0 && Groups.Count > 0;

    /// <summary>
    /// Basket subtotal (carried forward for convenience).
    /// </summary>
    public decimal SubTotal { get; set; }

    /// <summary>
    /// Tax amount (carried forward for convenience).
    /// </summary>
    public decimal Tax { get; set; }

    /// <summary>
    /// Basket total (carried forward for convenience).
    /// </summary>
    public decimal Total { get; set; }

    /// <summary>
    /// Creates a failed result with the specified error message.
    /// </summary>
    public static OrderGroupingResult Fail(string error) => new()
    {
        Errors = [error]
    };

    /// <summary>
    /// Creates a failed result with multiple error messages.
    /// </summary>
    public static OrderGroupingResult Fail(IEnumerable<string> errors) => new()
    {
        Errors = errors.ToList()
    };
}


namespace Merchello.Core.Customers.Models;

/// <summary>
/// Aggregated metrics for a customer used in segment criteria evaluation.
/// </summary>
public class CustomerMetrics
{
    // Order metrics

    /// <summary>
    /// Total number of completed orders.
    /// </summary>
    public int OrderCount { get; set; }

    /// <summary>
    /// Total lifetime spend amount.
    /// </summary>
    public decimal TotalSpend { get; set; }

    /// <summary>
    /// Average order value (TotalSpend / OrderCount).
    /// </summary>
    public decimal AverageOrderValue => OrderCount > 0 ? TotalSpend / OrderCount : 0;

    /// <summary>
    /// Date of the first order (UTC).
    /// </summary>
    public DateTime? FirstOrderDate { get; set; }

    /// <summary>
    /// Date of the most recent order (UTC).
    /// </summary>
    public DateTime? LastOrderDate { get; set; }

    /// <summary>
    /// Days since the last order (null if no orders).
    /// </summary>
    public int? DaysSinceLastOrder { get; set; }

    // Customer properties

    /// <summary>
    /// Date the customer account was created (UTC).
    /// </summary>
    public DateTime? DateCreated { get; set; }

    /// <summary>
    /// Customer's email address.
    /// </summary>
    public string? Email { get; set; }

    /// <summary>
    /// Customer's country (from most recent invoice billing address).
    /// </summary>
    public string? Country { get; set; }

    /// <summary>
    /// Customer's tags.
    /// </summary>
    public List<string> Tags { get; set; } = [];
}

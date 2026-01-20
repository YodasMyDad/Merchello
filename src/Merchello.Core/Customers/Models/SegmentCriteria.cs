namespace Merchello.Core.Customers.Models;

/// <summary>
/// A single criterion rule for automated segment evaluation.
/// </summary>
public class SegmentCriteria
{
    /// <summary>
    /// The field to evaluate (e.g., "OrderCount", "TotalSpend", "Tag").
    /// </summary>
    public string Field { get; set; } = string.Empty;

    /// <summary>
    /// The comparison operator.
    /// </summary>
    public SegmentCriteriaOperator Operator { get; set; }

    /// <summary>
    /// The value to compare against.
    /// </summary>
    public object? Value { get; set; }

    /// <summary>
    /// Second value for range operators like "Between".
    /// </summary>
    public object? Value2 { get; set; }
}

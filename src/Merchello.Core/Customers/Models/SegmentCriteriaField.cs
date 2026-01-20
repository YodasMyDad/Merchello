namespace Merchello.Core.Customers.Models;

/// <summary>
/// Available fields for segment criteria evaluation.
/// </summary>
public enum SegmentCriteriaField
{
    // Order metrics
    OrderCount,
    TotalSpend,
    AverageOrderValue,
    FirstOrderDate,
    LastOrderDate,
    DaysSinceLastOrder,

    // Customer properties
    DateCreated,
    Email,
    Country,

    // Custom
    Tag
}

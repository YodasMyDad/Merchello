using Merchello.Core.Discounts.Models;

namespace Merchello.Core.Discounts.Dtos;

/// <summary>
/// Aggregated usage summary for a discount, used in reporting.
/// </summary>
public class DiscountUsageSummaryDto
{
    /// <summary>
    /// The discount ID.
    /// </summary>
    public Guid DiscountId { get; set; }

    /// <summary>
    /// The discount name.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// The discount code (null for automatic discounts).
    /// </summary>
    public string? Code { get; set; }

    /// <summary>
    /// Current discount status.
    /// </summary>
    public DiscountStatus Status { get; set; }

    /// <summary>
    /// The discount category (AmountOffProducts, BuyXGetY, etc.).
    /// </summary>
    public DiscountCategory Category { get; set; }

    /// <summary>
    /// Total number of times this discount has been used.
    /// </summary>
    public int TotalUsageCount { get; set; }

    /// <summary>
    /// Number of unique customers who have used this discount.
    /// </summary>
    public int UniqueCustomersCount { get; set; }

    /// <summary>
    /// Total discount amount given (in store currency).
    /// </summary>
    public decimal TotalDiscountAmount { get; set; }

    /// <summary>
    /// Average discount amount per use.
    /// </summary>
    public decimal AverageDiscountPerUse { get; set; }

    /// <summary>
    /// Date of first usage (null if never used).
    /// </summary>
    public DateTime? FirstUsed { get; set; }

    /// <summary>
    /// Date of most recent usage (null if never used).
    /// </summary>
    public DateTime? LastUsed { get; set; }
}

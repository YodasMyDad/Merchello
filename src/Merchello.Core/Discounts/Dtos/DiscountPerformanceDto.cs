namespace Merchello.Core.Discounts.Dtos;

/// <summary>
/// Performance metrics for a discount.
/// </summary>
public class DiscountPerformanceDto
{
    /// <summary>
    /// Gets or sets the discount ID.
    /// </summary>
    public Guid DiscountId { get; set; }

    /// <summary>
    /// Gets or sets the discount name.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the discount code (if code-based).
    /// </summary>
    public string? Code { get; set; }

    // =====================================================
    // Usage Metrics
    // =====================================================

    /// <summary>
    /// Gets or sets the total number of times this discount has been used.
    /// </summary>
    public int TotalUsageCount { get; set; }

    /// <summary>
    /// Gets or sets the number of unique customers who have used this discount.
    /// </summary>
    public int UniqueCustomersCount { get; set; }

    /// <summary>
    /// Gets or sets the remaining uses before limit is reached. Null if unlimited.
    /// </summary>
    public int? RemainingUses { get; set; }

    // =====================================================
    // Financial Metrics (in store currency)
    // =====================================================

    /// <summary>
    /// Gets or sets the total discount amount given (in store currency).
    /// </summary>
    public decimal TotalDiscountAmount { get; set; }

    /// <summary>
    /// Gets or sets the average discount per use (in store currency).
    /// </summary>
    public decimal AverageDiscountPerUse { get; set; }

    /// <summary>
    /// Gets or sets the total revenue from orders that used this discount (in store currency).
    /// </summary>
    public decimal TotalOrderRevenue { get; set; }

    /// <summary>
    /// Gets or sets the average order value for orders with this discount (in store currency).
    /// </summary>
    public decimal AverageOrderValue { get; set; }

    // =====================================================
    // Timeline
    // =====================================================

    /// <summary>
    /// Gets or sets the date this discount was first used.
    /// </summary>
    public DateTime? FirstUsed { get; set; }

    /// <summary>
    /// Gets or sets the date this discount was last used.
    /// </summary>
    public DateTime? LastUsed { get; set; }

    /// <summary>
    /// Gets or sets the usage by date for charting.
    /// </summary>
    public List<UsageByDateDto> UsageByDate { get; set; } = [];
}

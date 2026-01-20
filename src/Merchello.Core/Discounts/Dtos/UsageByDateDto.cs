namespace Merchello.Core.Discounts.Dtos;

/// <summary>
/// Usage data for a single date (for charts).
/// </summary>
public class UsageByDateDto
{
    /// <summary>
    /// Gets or sets the date.
    /// </summary>
    public DateTime Date { get; set; }

    /// <summary>
    /// Gets or sets the number of times the discount was used on this date.
    /// </summary>
    public int UsageCount { get; set; }

    /// <summary>
    /// Gets or sets the total discount amount given on this date.
    /// </summary>
    public decimal DiscountAmount { get; set; }
}

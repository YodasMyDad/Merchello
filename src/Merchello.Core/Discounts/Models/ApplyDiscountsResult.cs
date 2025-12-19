namespace Merchello.Core.Discounts.Models;

/// <summary>
/// Result of applying multiple discounts.
/// </summary>
public class ApplyDiscountsResult
{
    /// <summary>
    /// Whether the application was successful.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// The discounts that were applied.
    /// </summary>
    public List<AppliedDiscountInfo> AppliedDiscounts { get; set; } = [];

    /// <summary>
    /// The total discount amount across all discounts.
    /// </summary>
    public decimal TotalDiscountAmount { get; set; }

    /// <summary>
    /// The final discounted line items.
    /// </summary>
    public List<DiscountedLineItem> DiscountedLineItems { get; set; } = [];

    /// <summary>
    /// Error message if application failed.
    /// </summary>
    public string? ErrorMessage { get; set; }
}

namespace Merchello.Core.Discounts.Models;

/// <summary>
/// Information about an applied discount.
/// </summary>
public class AppliedDiscountInfo
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
    /// The discount code if applicable.
    /// </summary>
    public string? Code { get; set; }

    /// <summary>
    /// The category of discount.
    /// </summary>
    public DiscountCategory Category { get; set; }

    /// <summary>
    /// The amount discounted.
    /// </summary>
    public decimal DiscountAmount { get; set; }
}

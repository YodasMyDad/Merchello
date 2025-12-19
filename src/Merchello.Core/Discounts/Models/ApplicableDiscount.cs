namespace Merchello.Core.Discounts.Models;

/// <summary>
/// An applicable automatic discount with its calculated value.
/// </summary>
public class ApplicableDiscount
{
    /// <summary>
    /// The discount.
    /// </summary>
    public Discount Discount { get; set; } = null!;

    /// <summary>
    /// The calculated discount amount.
    /// </summary>
    public decimal CalculatedAmount { get; set; }

    /// <summary>
    /// Whether this discount can be combined with others.
    /// </summary>
    public bool CanCombine { get; set; }
}

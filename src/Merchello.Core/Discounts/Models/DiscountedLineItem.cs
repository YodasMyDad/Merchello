namespace Merchello.Core.Discounts.Models;

/// <summary>
/// A line item with discount information.
/// </summary>
public class DiscountedLineItem
{
    /// <summary>
    /// The original line item ID.
    /// </summary>
    public Guid LineItemId { get; set; }

    /// <summary>
    /// The product ID.
    /// </summary>
    public Guid ProductId { get; set; }

    /// <summary>
    /// The quantity being discounted.
    /// </summary>
    public int DiscountedQuantity { get; set; }

    /// <summary>
    /// The discount amount per unit.
    /// </summary>
    public decimal DiscountPerUnit { get; set; }

    /// <summary>
    /// The total discount for this line.
    /// </summary>
    public decimal TotalDiscount { get; set; }

    /// <summary>
    /// The original unit price.
    /// </summary>
    public decimal OriginalUnitPrice { get; set; }

    /// <summary>
    /// The discounted unit price.
    /// </summary>
    public decimal DiscountedUnitPrice { get; set; }
}

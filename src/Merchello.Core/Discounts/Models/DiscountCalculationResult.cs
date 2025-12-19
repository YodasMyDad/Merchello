namespace Merchello.Core.Discounts.Models;

/// <summary>
/// Result of calculating a discount.
/// </summary>
public class DiscountCalculationResult
{
    /// <summary>
    /// Whether the calculation was successful.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// The discount that was calculated.
    /// </summary>
    public Discount? Discount { get; set; }

    /// <summary>
    /// The total discount amount.
    /// </summary>
    public decimal TotalDiscountAmount { get; set; }

    /// <summary>
    /// Discount amount applied to products.
    /// </summary>
    public decimal ProductDiscountAmount { get; set; }

    /// <summary>
    /// Discount amount applied to order total.
    /// </summary>
    public decimal OrderDiscountAmount { get; set; }

    /// <summary>
    /// Discount amount applied to shipping.
    /// </summary>
    public decimal ShippingDiscountAmount { get; set; }

    /// <summary>
    /// The line items with discounts applied.
    /// </summary>
    public List<DiscountedLineItem> DiscountedLineItems { get; set; } = [];

    /// <summary>
    /// Error message if calculation failed.
    /// </summary>
    public string? ErrorMessage { get; set; }

    public static DiscountCalculationResult Failed(string message) => new()
    {
        Success = false,
        ErrorMessage = message
    };
}

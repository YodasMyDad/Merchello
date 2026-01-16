namespace Merchello.Core.Accounting.Services.Parameters;

/// <summary>
/// Result of line item calculations
/// </summary>
public record CalculateLineItemsResult
{
    /// <summary>
    /// Sum of product/custom line items before discounts
    /// </summary>
    public required decimal SubTotal { get; init; }

    /// <summary>
    /// Total discount amount (absolute value)
    /// </summary>
    public required decimal Discount { get; init; }

    /// <summary>
    /// Subtotal after discounts applied
    /// </summary>
    public required decimal AdjustedSubTotal { get; init; }

    /// <summary>
    /// Calculated tax amount
    /// </summary>
    public required decimal Tax { get; init; }

    /// <summary>
    /// Final total including tax and shipping
    /// </summary>
    public required decimal Total { get; init; }

    /// <summary>
    /// Shipping amount (echoed back for convenience)
    /// </summary>
    public required decimal Shipping { get; init; }

    /// <summary>
    /// Effective shipping tax rate percentage used for proportional calculation.
    /// This is the weighted average of line item tax rates.
    /// Null when shipping is not taxable or a specific rate was configured.
    /// </summary>
    public decimal? EffectiveShippingTaxRate { get; init; }
}

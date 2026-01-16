namespace Merchello.Core.Tax.Services.Models;

/// <summary>
/// Result of line item tax calculation with per-item breakdown.
/// Does NOT include shipping tax - use <see cref="OrderTaxResult"/> for complete order tax.
/// </summary>
public class LineItemTaxSummary
{
    /// <summary>
    /// Total tax amount across all line items.
    /// </summary>
    public decimal TotalTax { get; init; }

    /// <summary>
    /// Per-line-item tax breakdown.
    /// </summary>
    public required IReadOnlyList<LineItemTaxResult> LineItems { get; init; }
}

/// <summary>
/// Tax calculation result for a single line item.
/// </summary>
public class LineItemTaxResult
{
    /// <summary>
    /// Unique identifier to correlate with input.
    /// </summary>
    public Guid? Id { get; init; }

    /// <summary>
    /// SKU to correlate with input.
    /// </summary>
    public string? Sku { get; init; }

    /// <summary>
    /// Original line total before discounts (unit price * quantity).
    /// </summary>
    public decimal LineTotal { get; init; }

    /// <summary>
    /// Discount amount applied to this line item.
    /// </summary>
    public decimal DiscountAmount { get; init; }

    /// <summary>
    /// Pro-rated share of order discount applied to this line item.
    /// </summary>
    public decimal ProRatedOrderDiscount { get; init; }

    /// <summary>
    /// Final taxable amount after all discounts.
    /// </summary>
    public decimal TaxableAmount { get; init; }

    /// <summary>
    /// Tax rate applied (as percentage, e.g., 8.25).
    /// </summary>
    public decimal TaxRate { get; init; }

    /// <summary>
    /// Calculated tax amount for this line item.
    /// </summary>
    public decimal TaxAmount { get; init; }
}

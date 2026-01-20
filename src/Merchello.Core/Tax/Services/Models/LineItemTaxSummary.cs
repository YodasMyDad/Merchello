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

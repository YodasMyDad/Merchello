namespace Merchello.Core.Tax.Services.Models;

/// <summary>
/// Input for calculating tax on line items only (products).
/// Does NOT include shipping - use <see cref="OrderTaxInput"/> for complete order tax.
/// </summary>
public class LineItemTaxInput
{
    /// <summary>
    /// Line items to calculate tax for.
    /// </summary>
    public required IReadOnlyList<TaxableLineItemInput> LineItems { get; init; }

    /// <summary>
    /// Total order-level discount to be pro-rated across taxable items.
    /// </summary>
    public decimal OrderDiscountTotal { get; init; }

    /// <summary>
    /// Whether tax should be removed entirely (tax-exempt order).
    /// </summary>
    public bool IsTaxExempt { get; init; }
}

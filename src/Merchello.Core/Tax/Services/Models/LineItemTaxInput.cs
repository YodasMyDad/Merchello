using Merchello.Core.Accounting.Models;

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

/// <summary>
/// A line item for tax calculation with discount information.
/// </summary>
public class TaxableLineItemInput
{
    /// <summary>
    /// Unique identifier for correlation with output.
    /// </summary>
    public Guid? Id { get; init; }

    /// <summary>
    /// SKU for correlation with output.
    /// </summary>
    public string? Sku { get; init; }

    /// <summary>
    /// Unit price of the item.
    /// </summary>
    public required decimal Amount { get; init; }

    /// <summary>
    /// Quantity of items.
    /// </summary>
    public required int Quantity { get; init; }

    /// <summary>
    /// Whether this item is taxable.
    /// </summary>
    public bool IsTaxable { get; init; } = true;

    /// <summary>
    /// Tax rate as a percentage (e.g., 8.25 for 8.25%).
    /// </summary>
    public decimal TaxRate { get; init; }

    /// <summary>
    /// Type of line item discount (Percentage or FixedAmount).
    /// Only used if DiscountValue is set.
    /// </summary>
    public DiscountValueType? DiscountType { get; init; }

    /// <summary>
    /// Discount value (percentage or fixed amount per unit).
    /// </summary>
    public decimal? DiscountValue { get; init; }
}

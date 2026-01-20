using Merchello.Core.Accounting.Models;

namespace Merchello.Core.Tax.Services.Models;

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

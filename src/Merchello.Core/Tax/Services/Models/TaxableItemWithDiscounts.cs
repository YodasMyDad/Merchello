namespace Merchello.Core.Tax.Services.Models;

/// <summary>
/// A taxable line item with pre-calculated discount amounts for tax calculation.
/// </summary>
public class TaxableItemWithDiscounts
{
    /// <summary>
    /// SKU of the line item (used for correlation).
    /// </summary>
    public string? Sku { get; init; }

    /// <summary>
    /// Total amount for this line item (unit price * quantity), already rounded.
    /// </summary>
    public required decimal ItemTotal { get; init; }

    /// <summary>
    /// Tax rate for this item (as percentage, e.g., 8.25 for 8.25%).
    /// </summary>
    public required decimal TaxRate { get; init; }

    /// <summary>
    /// Linked before-tax discount amount for this specific item (already negative).
    /// This is a discount linked directly to this SKU, not a pro-rated order discount.
    /// </summary>
    public decimal LinkedDiscount { get; init; }

    /// <summary>
    /// Pre-tax equivalent of after-tax discounts for this item.
    /// This is the reverse-calculated amount that needs to be excluded from taxable base.
    /// </summary>
    public decimal AfterTaxDiscountContribution { get; init; }
}

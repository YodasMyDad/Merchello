namespace Merchello.Core.Tax.Services.Models;

/// <summary>
/// Result of tax calculation with discount support.
/// </summary>
public class TaxWithDiscountsResult
{
    /// <summary>
    /// Total tax amount (line items + shipping).
    /// </summary>
    public decimal TotalTax { get; init; }

    /// <summary>
    /// Tax on line items only (excluding shipping).
    /// </summary>
    public decimal LineItemTax { get; init; }

    /// <summary>
    /// Tax on shipping only.
    /// </summary>
    public decimal ShippingTax { get; init; }
}

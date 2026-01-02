using Merchello.Core.Accounting.Models;

namespace Merchello.Core.Accounting.Services.Parameters;

/// <summary>
/// Parameters for calculating totals from line items
/// </summary>
public class CalculateLineItemsParameters
{
    /// <summary>
    /// All line items including products, custom items, and discounts
    /// </summary>
    public required List<LineItem> LineItems { get; init; }

    /// <summary>
    /// Shipping cost
    /// </summary>
    public required decimal ShippingAmount { get; init; }

    /// <summary>
    /// Default tax rate for shipping (item tax rates come from LineItem.TaxRate)
    /// </summary>
    public required decimal DefaultTaxRate { get; init; }

    /// <summary>
    /// Currency code for rounding
    /// </summary>
    public required string CurrencyCode { get; init; }

    /// <summary>
    /// Whether shipping is taxable (defaults to true)
    /// </summary>
    public bool IsShippingTaxable { get; init; } = true;
}

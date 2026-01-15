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
    /// Default tax rate used when line items don't have their own TaxRate set
    /// </summary>
    public required decimal DefaultTaxRate { get; init; }

    /// <summary>
    /// Currency code for rounding
    /// </summary>
    public required string CurrencyCode { get; init; }

    /// <summary>
    /// Whether shipping is taxable. Should come from ITaxProviderManager.IsShippingTaxedForLocationAsync().
    /// </summary>
    public bool IsShippingTaxable { get; init; } = true;

    /// <summary>
    /// The specific shipping tax rate to use. Should come from ITaxProviderManager.GetShippingTaxRateForLocationAsync().
    /// - null = use proportional calculation (weighted average of line item rates, EU/UK VAT compliant)
    /// - 0m = shipping is explicitly not taxable
    /// - positive value = use this specific rate percentage (e.g., 20 for 20%)
    /// </summary>
    public decimal? ShippingTaxRate { get; init; }
}

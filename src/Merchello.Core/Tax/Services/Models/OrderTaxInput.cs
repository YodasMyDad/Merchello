namespace Merchello.Core.Tax.Services.Models;

/// <summary>
/// Input for calculating complete order tax including line items (products) AND shipping.
/// Use this for checkout totals and invoices.
/// </summary>
public class OrderTaxInput
{
    /// <summary>
    /// Taxable line items with their totals, tax rates, and pre-calculated discount amounts.
    /// </summary>
    public required IReadOnlyList<TaxableItemWithDiscounts> TaxableItems { get; init; }

    /// <summary>
    /// Total unlinked (order-level) before-tax discount to be pro-rated across all taxable items.
    /// Should be negative (e.g., -10.00 for a $10 discount).
    /// </summary>
    public decimal UnlinkedBeforeTaxDiscountTotal { get; init; }

    /// <summary>
    /// Total of all taxable line item amounts (used for pro-rating order-level discounts).
    /// </summary>
    public decimal TotalTaxableAmount { get; init; }

    /// <summary>
    /// Shipping amount to potentially apply tax to.
    /// </summary>
    public decimal ShippingAmount { get; init; }

    /// <summary>
    /// Whether shipping should be taxed. Should come from ITaxProviderManager.IsShippingTaxedForLocationAsync().
    /// </summary>
    public bool IsShippingTaxable { get; init; }

    /// <summary>
    /// The specific shipping tax rate to use. Should come from ITaxProviderManager.GetShippingTaxRateForLocationAsync().
    /// - null = use proportional calculation (weighted average of line item rates)
    /// - 0m = shipping is explicitly not taxable
    /// - positive value = use this specific rate percentage (e.g., 20 for 20%)
    /// </summary>
    public decimal? ShippingTaxRate { get; init; }
}

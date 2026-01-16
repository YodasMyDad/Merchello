using Merchello.Core.Tax.Services.Models;

namespace Merchello.Core.Tax.Services.Interfaces;

/// <summary>
/// Centralized tax calculation service that handles pro-rating of discounts,
/// proper rounding, and consistent tax algorithms across the application.
/// </summary>
public interface ITaxCalculationService
{
    /// <summary>
    /// Calculates tax for line items only (products). Does NOT include shipping tax.
    /// Use <see cref="CalculateOrderTax"/> when you need complete order tax including shipping.
    /// </summary>
    /// <param name="request">The tax calculation request with line items and discounts</param>
    /// <param name="currencyCode">Currency code for rounding</param>
    /// <returns>Tax calculation result with per-item breakdown</returns>
    LineItemTaxSummary CalculateLineItemTax(LineItemTaxInput request, string currencyCode);

    /// <summary>
    /// Calculates complete order tax including line items (products) AND shipping.
    /// Use this method for checkout totals and invoices.
    /// </summary>
    /// <param name="input">The tax calculation input with line items, discounts, and shipping</param>
    /// <param name="currencyCode">Currency code for rounding</param>
    /// <returns>Tax calculation result with line item tax and shipping tax</returns>
    OrderTaxResult CalculateOrderTax(OrderTaxInput input, string currencyCode);

    /// <summary>
    /// Calculates the taxable amount for a single line item after applying
    /// line-item discount and pro-rated order discount.
    /// </summary>
    /// <param name="lineTotal">Total line amount (unit price * quantity)</param>
    /// <param name="lineItemDiscount">Discount amount applied directly to this line item</param>
    /// <param name="orderDiscountTotal">Total order-level discount to be pro-rated</param>
    /// <param name="totalTaxableAmount">Sum of all taxable line item totals (for pro-rating)</param>
    /// <param name="currencyCode">Currency code for rounding</param>
    /// <returns>Taxable amount after discounts</returns>
    decimal CalculateTaxableAmount(
        decimal lineTotal,
        decimal lineItemDiscount,
        decimal orderDiscountTotal,
        decimal totalTaxableAmount,
        string currencyCode);

    /// <summary>
    /// Calculates a simple tax preview for a single item.
    /// Used by UI components to preview tax before adding items.
    /// </summary>
    /// <param name="price">Unit price of the item</param>
    /// <param name="quantity">Quantity of items</param>
    /// <param name="taxRate">Tax rate as a percentage (e.g., 20 for 20%)</param>
    /// <param name="currencyCode">Currency code for rounding</param>
    /// <returns>Preview result with subtotal, tax amount, and total</returns>
    TaxPreviewResult PreviewTax(decimal price, int quantity, decimal taxRate, string currencyCode);

    /// <summary>
    /// Calculates shipping tax using proportional/weighted average of line item tax rates.
    /// This is EU/UK VAT compliant for mixed-rate orders where no specific shipping tax rate is configured.
    /// </summary>
    /// <param name="shippingAmount">The shipping amount to tax</param>
    /// <param name="lineItemTax">Total tax from line items</param>
    /// <param name="taxableSubtotal">Total taxable subtotal from line items</param>
    /// <param name="currencyCode">Currency code for rounding</param>
    /// <returns>Calculated shipping tax amount</returns>
    decimal CalculateProportionalShippingTax(
        decimal shippingAmount,
        decimal lineItemTax,
        decimal taxableSubtotal,
        string currencyCode);
}

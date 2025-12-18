using Merchello.Core.Accounting.Models;

namespace Merchello.Core.Accounting.Services.Interfaces;

public interface ILineItemService
{
    /// <summary>
    /// Add line item to a basket
    /// </summary>
    /// <param name="currentLineItems"></param>
    /// <param name="newLineItem"></param>
    /// <returns></returns>
    List<string> AddLineItem(List<LineItem> currentLineItems, LineItem newLineItem);

    /// <summary>
    /// Calculates totals from line items that include discount line items (LineItemType.Discount).
    /// This is the unified calculation method used by both baskets and invoices.
    /// </summary>
    /// <param name="lineItems">All line items including products, custom items, and discounts</param>
    /// <param name="shippingAmount">Shipping cost</param>
    /// <param name="defaultTaxRate">Default tax rate for shipping (item tax rates come from LineItem.TaxRate)</param>
    /// <param name="currencyCode">Currency code for rounding</param>
    /// <param name="isShippingTaxable">Whether shipping is taxable</param>
    /// <returns>Calculated totals tuple</returns>
    (decimal subTotal, decimal discount, decimal adjustedSubTotal, decimal tax, decimal total, decimal shipping)
        CalculateFromLineItems(
            List<LineItem> lineItems,
            decimal shippingAmount,
            decimal defaultTaxRate,
            string currencyCode,
            bool isShippingTaxable = true);

    /// <summary>
    /// Adds a discount line item to the line items collection.
    /// Use this instead of AddAdjustment for unified basket/invoice discount handling.
    /// </summary>
    /// <param name="lineItems">Current line items collection</param>
    /// <param name="amount">Discount amount (positive value - will be stored as negative)</param>
    /// <param name="discountValueType">Whether this is a fixed amount, percentage, or free discount</param>
    /// <param name="currencyCode">Currency code for percentage calculation</param>
    /// <param name="linkedSku">Optional SKU to link discount to specific product</param>
    /// <param name="name">Optional name for the discount</param>
    /// <param name="reason">Optional reason/description for the discount</param>
    /// <param name="extendedData">Optional additional extended data to store with the discount</param>
    /// <returns>List of validation errors (empty if successful)</returns>
    List<string> AddDiscountLineItem(
        List<LineItem> lineItems,
        decimal amount,
        DiscountValueType discountValueType,
        string currencyCode,
        string? linkedSku = null,
        string? name = null,
        string? reason = null,
        Dictionary<string, string>? extendedData = null);

    /// <summary>
    /// Removes a discount line item from the collection by its ID
    /// </summary>
    /// <param name="lineItems">Current line items collection</param>
    /// <param name="discountLineItemId">ID of the discount line item to remove</param>
    /// <returns>True if removed, false if not found</returns>
    bool RemoveDiscountLineItem(List<LineItem> lineItems, Guid discountLineItemId);
}

using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Parameters;

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
    /// <param name="parameters">Calculation parameters including line items, shipping, tax rate, and currency</param>
    /// <returns>Calculated totals result</returns>
    CalculateLineItemsResult CalculateFromLineItems(CalculateLineItemsParameters parameters);

    /// <summary>
    /// Adds a discount line item to the line items collection.
    /// Use this instead of AddAdjustment for unified basket/invoice discount handling.
    /// </summary>
    /// <param name="parameters">Discount parameters including amount, type, and optional metadata</param>
    /// <returns>List of validation errors (empty if successful)</returns>
    List<string> AddDiscountLineItem(AddDiscountLineItemParameters parameters);

    /// <summary>
    /// Removes a discount line item from the collection by its ID
    /// </summary>
    /// <param name="lineItems">Current line items collection</param>
    /// <param name="discountLineItemId">ID of the discount line item to remove</param>
    /// <returns>True if removed, false if not found</returns>
    bool RemoveDiscountLineItem(List<LineItem> lineItems, Guid discountLineItemId);
}

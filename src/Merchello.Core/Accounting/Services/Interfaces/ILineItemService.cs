using Merchello.Core.Accounting.Models;

namespace Merchello.Core.Accounting.Services.Interfaces;

public interface ILineItemService
{
    /// <summary>
    /// Adds an Adjustment
    /// </summary>
    /// <param name="currentAdjustments"></param>
    /// <param name="adjustment"></param>
    /// <param name="amountOfAdjustmentsAllowed"></param>
    /// <returns></returns>
    List<string> AddAdjustment(List<Adjustment> currentAdjustments, Adjustment adjustment,
        int amountOfAdjustmentsAllowed = 1);

    /// <summary>
    /// Add line item to a basket
    /// </summary>
    /// <param name="currentLineItems"></param>
    /// <param name="newLineItem"></param>
    /// <returns></returns>
    List<string> AddLineItem(List<LineItem> currentLineItems, LineItem newLineItem);

    /// <summary>
    /// Calculates the line items and returns a sub total
    /// </summary>
    /// <param name="lineItems"></param>
    /// <param name="adjustments"></param>
    /// <param name="defaultTaxRate"></param>
    /// <param name="isShippingTaxable"></param>
    /// <param name="rounding"></param>
    /// <param name="shippingAmount"></param>
    /// <returns></returns>
    (decimal subTotal, decimal discount, decimal adjustedSubTotal, decimal tax, decimal total, decimal shipping)
        CalculateLineItems(
            List<LineItem> lineItems, List<Adjustment> adjustments, decimal shippingAmount, decimal defaultTaxRate,
            string currencyCode,
            bool isShippingTaxable = true);
}

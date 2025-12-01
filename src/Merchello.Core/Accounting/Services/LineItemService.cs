using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Accounting.Extensions;

namespace Merchello.Core.Accounting.Services;

public class LineItemService : ILineItemService
{
    /// <summary>
    /// Adds an Adjustment
    /// </summary>
    /// <param name="currentAdjustments"></param>
    /// <param name="adjustment"></param>
    /// <param name="amountOfAdjustmentsAllowed"></param>
    /// <returns></returns>
    public List<string> AddAdjustment(List<Adjustment> currentAdjustments, Adjustment adjustment,
        int amountOfAdjustmentsAllowed = 1)
    {
        var errors = adjustment.ValidateAdjustment();
        if (errors.Any())
        {
            return errors;
        }

        switch (adjustment.AdjustmentType)
        {
            // we only allow adjustments of a singular type
            // because you can't mix percentage and singular figure, so thrown an error if they are trying to add a different one
            case AdjustmentType.Figure when
                currentAdjustments.Any(x => x.AdjustmentType == AdjustmentType.Percentage):
                errors.Add(
                    "You are trying to add a figure adjustment when a percentage adjustment has already been added");
                return errors;
            case AdjustmentType.Percentage when
                currentAdjustments.Any(x => x.AdjustmentType == AdjustmentType.Figure):
                errors.Add(
                    "You are trying to add a percentage adjustment when a figure adjustment has already been added");
                return errors;
        }

        if (currentAdjustments.Count >= amountOfAdjustmentsAllowed)
        {
            errors.Add("There are already adjustments and adding this one takes it over the amount allowed");
            return errors;
        }

        currentAdjustments.Add(adjustment);

        return errors;
    }

    /// <summary>
    /// Add line item to a basket
    /// </summary>
    /// <param name="currentLineItems"></param>
    /// <param name="newLineItem"></param>
    /// <returns></returns>
    public List<string> AddLineItem(List<LineItem> currentLineItems, LineItem newLineItem)
    {
        // Validate the line item
        var errors = newLineItem.ValidateLineItem();
        if (errors.Any())
        {
            return errors;
        }

        // See if there is already one there (We ToList() as we are fishing in a out of collection)
        var sameLineItem =
            currentLineItems.FirstOrDefault(x =>
                x.Sku == newLineItem.Sku && newLineItem.LineItemType == x.LineItemType);

        if (sameLineItem != null)
        {
            // Update quantity
            newLineItem.Quantity += sameLineItem.Quantity;

            // Sort any missing extended data
            foreach (var ed in sameLineItem.ExtendedData)
            {
                newLineItem.ExtendedData.TryAdd(ed.Key, ed.Value);
            }

            // Set the id the same
            newLineItem.Id = sameLineItem.Id;

            // Remove the old line item
            currentLineItems.RemoveAll(x => x.Id == sameLineItem.Id);

            // Now add the new updated one back in
            currentLineItems.Add(newLineItem);
        }
        else
        {
            // New item so just add it
            currentLineItems.Add(newLineItem);
        }

        return errors;
    }

    /// <summary>
    /// Calculates the line items and returns a subtotal, including shipping and tax calculations.
    /// </summary>
    /// <param name="lineItems">The list of line items for the transaction.</param>
    /// <param name="adjustments">The list of adjustments to be applied to the transaction.</param>
    /// <param name="shippingAmount">The cost of shipping for the transaction.</param>
    /// <param name="defaultTaxRate">We need to pass in the default tax rate as we need to use it for the shipping</param>
    /// <param name="isShippingTaxable">Indicates whether shipping is taxable.</param>
    /// <param name="rounding">The rounding method to be applied to the calculations.</param>
    /// <returns>Tuple containing subtotal, discount, adjusted subtotal, tax, total, and shipping.</returns>
    public (decimal subTotal, decimal discount, decimal adjustedSubTotal, decimal tax, decimal total, decimal shipping)
        CalculateLineItems(
            List<LineItem> lineItems, List<Adjustment> adjustments, decimal shippingAmount, decimal defaultTaxRate, bool isShippingTaxable = true,
            MidpointRounding rounding = MidpointRounding.AwayFromZero)
    {
        var subTotal = lineItems
            .Where(x => x.LineItemType == LineItemType.Product || x.LineItemType == LineItemType.Custom)
            .Sum(item => Math.Round(item.Amount * item.Quantity, 2, rounding));

        var totalAdjustmentFigures = adjustments
            .Where(x => x.AdjustmentType == AdjustmentType.Figure)
            .Sum(item => item.Amount);

        var totalAdjustmentPercentages = adjustments
            .Where(x => x.AdjustmentType == AdjustmentType.Percentage)
            .Sum(item => item.Amount);

        decimal totalTax = 0;
        decimal adjustedSubTotal = 0;

        foreach (var item in lineItems.Where(x => x.LineItemType == LineItemType.Product || x.LineItemType == LineItemType.Custom))
        {
            var originalItemTotal = Math.Round(item.Amount * item.Quantity, 2, rounding);
            decimal itemDiscount = 0;
            if (totalAdjustmentFigures > 0)
            {
                var itemProportion = originalItemTotal / subTotal;
                itemDiscount = Math.Round(totalAdjustmentFigures * itemProportion, 2, rounding);
            }

            var adjustedItemTotal = originalItemTotal - itemDiscount;

            if (totalAdjustmentPercentages > 0)
            {
                adjustedItemTotal = Math.Round(adjustedItemTotal * (1 - (totalAdjustmentPercentages / 100M)), 2,
                    rounding);
            }

            if (item.IsTaxable)
            {
                totalTax += Math.Round(adjustedItemTotal * (item.TaxRate / 100M), 2, rounding);
            }

            adjustedSubTotal += adjustedItemTotal;
        }

        // Use the defaultTaxRate for shipping tax calculation
        if (isShippingTaxable)
        {
            totalTax += Math.Round(shippingAmount * (defaultTaxRate / 100M), 2, rounding);
        }

        adjustedSubTotal = Math.Max(adjustedSubTotal, 0);
        totalTax = Math.Max(totalTax, 0);

        // Include shipping in the total calculation.
        var totalIncludingShipping = adjustedSubTotal + totalTax + shippingAmount;

        // Rounding the resulting total including shipping before returning.
        var total = Math.Round(totalIncludingShipping, 2, rounding);

        var discount = Math.Round(subTotal - adjustedSubTotal, 2, rounding);

        return (subTotal, discount, adjustedSubTotal, totalTax, total, shippingAmount);
    }
}

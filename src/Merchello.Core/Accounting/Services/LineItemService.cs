using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Shared.Services;

namespace Merchello.Core.Accounting.Services;

public class LineItemService(ICurrencyService currencyService) : ILineItemService
{
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

    public List<string> AddLineItem(List<LineItem> currentLineItems, LineItem newLineItem)
    {
        var errors = newLineItem.ValidateLineItem();
        if (errors.Any())
        {
            return errors;
        }

        var sameLineItem =
            currentLineItems.FirstOrDefault(x =>
                x.Sku == newLineItem.Sku && newLineItem.LineItemType == x.LineItemType);

        if (sameLineItem != null)
        {
            newLineItem.Quantity += sameLineItem.Quantity;

            foreach (var extendedDataEntry in sameLineItem.ExtendedData)
            {
                newLineItem.ExtendedData.TryAdd(extendedDataEntry.Key, extendedDataEntry.Value);
            }

            newLineItem.Id = sameLineItem.Id;
            currentLineItems.RemoveAll(x => x.Id == sameLineItem.Id);
            currentLineItems.Add(newLineItem);
        }
        else
        {
            currentLineItems.Add(newLineItem);
        }

        return errors;
    }

    public (decimal subTotal, decimal discount, decimal adjustedSubTotal, decimal tax, decimal total, decimal shipping)
        CalculateLineItems(
            List<LineItem> lineItems,
            List<Adjustment> adjustments,
            decimal shippingAmount,
            decimal defaultTaxRate,
            string currencyCode,
            bool isShippingTaxable = true)
    {
        var subTotal = lineItems
            .Where(x => x.LineItemType == LineItemType.Product || x.LineItemType == LineItemType.Custom)
            .Sum(item => currencyService.Round(item.Amount * item.Quantity, currencyCode));

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
            var originalItemTotal = currencyService.Round(item.Amount * item.Quantity, currencyCode);
            decimal itemDiscount = 0;

            if (totalAdjustmentFigures > 0 && subTotal > 0)
            {
                var itemProportion = originalItemTotal / subTotal;
                itemDiscount = currencyService.Round(totalAdjustmentFigures * itemProportion, currencyCode);
            }

            var adjustedItemTotal = originalItemTotal - itemDiscount;

            if (totalAdjustmentPercentages > 0)
            {
                adjustedItemTotal = currencyService.Round(
                    adjustedItemTotal * (1 - (totalAdjustmentPercentages / 100M)),
                    currencyCode);
            }

            if (item.IsTaxable)
            {
                totalTax += currencyService.Round(adjustedItemTotal * (item.TaxRate / 100M), currencyCode);
            }

            adjustedSubTotal += adjustedItemTotal;
        }

        if (isShippingTaxable)
        {
            totalTax += currencyService.Round(shippingAmount * (defaultTaxRate / 100M), currencyCode);
        }

        adjustedSubTotal = Math.Max(adjustedSubTotal, 0);
        totalTax = Math.Max(totalTax, 0);

        var totalIncludingShipping = adjustedSubTotal + totalTax + shippingAmount;
        var total = currencyService.Round(totalIncludingShipping, currencyCode);
        var discount = currencyService.Round(subTotal - adjustedSubTotal, currencyCode);

        return (subTotal, discount, adjustedSubTotal, totalTax, total, shippingAmount);
    }
}


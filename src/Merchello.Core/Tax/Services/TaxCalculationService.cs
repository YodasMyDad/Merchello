using Merchello.Core.Accounting.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Tax.Services.Interfaces;
using Merchello.Core.Tax.Services.Models;

namespace Merchello.Core.Tax.Services;

/// <summary>
/// Centralized tax calculation service that provides consistent tax calculation
/// across the application with proper discount pro-rating and rounding.
/// </summary>
public class TaxCalculationService(ICurrencyService currencyService) : ITaxCalculationService
{
    /// <inheritdoc />
    public TaxCalculationSummary CalculateTax(TaxCalculationInput request, string currencyCode)
    {
        // Handle tax-exempt case
        if (request.IsTaxExempt)
        {
            return new TaxCalculationSummary
            {
                TotalTax = 0,
                LineItems = request.LineItems.Select(li => new LineItemTaxResult
                {
                    Id = li.Id,
                    Sku = li.Sku,
                    LineTotal = currencyService.Round(li.Amount * li.Quantity, currencyCode),
                    DiscountAmount = 0,
                    ProRatedOrderDiscount = 0,
                    TaxableAmount = 0,
                    TaxRate = 0,
                    TaxAmount = 0
                }).ToList()
            };
        }

        // Calculate total taxable amount (for pro-rating order discount)
        var totalTaxableAmount = request.LineItems
            .Where(li => li.IsTaxable)
            .Sum(li => currencyService.Round(li.Amount * li.Quantity, currencyCode));

        var lineResults = new List<LineItemTaxResult>();
        var totalTax = 0m;

        foreach (var item in request.LineItems)
        {
            var lineTotal = currencyService.Round(item.Amount * item.Quantity, currencyCode);

            // Calculate line item discount
            var itemDiscountAmount = CalculateLineItemDiscount(
                lineTotal,
                item.Quantity,
                item.DiscountType,
                item.DiscountValue,
                currencyCode);

            // Calculate pro-rated order discount for taxable items
            var proRatedOrderDiscount = 0m;
            if (item.IsTaxable && request.OrderDiscountTotal > 0 && totalTaxableAmount > 0)
            {
                var proportion = lineTotal / totalTaxableAmount;
                proRatedOrderDiscount = currencyService.Round(
                    request.OrderDiscountTotal * proportion, currencyCode);
            }

            // Calculate taxable amount
            var taxableAmount = Math.Max(0, lineTotal - itemDiscountAmount - proRatedOrderDiscount);

            // Calculate tax
            var taxAmount = 0m;
            if (item.IsTaxable && item.TaxRate > 0)
            {
                taxAmount = currencyService.Round(taxableAmount * (item.TaxRate / 100m), currencyCode);
            }

            totalTax += taxAmount;

            lineResults.Add(new LineItemTaxResult
            {
                Id = item.Id,
                Sku = item.Sku,
                LineTotal = lineTotal,
                DiscountAmount = itemDiscountAmount,
                ProRatedOrderDiscount = proRatedOrderDiscount,
                TaxableAmount = taxableAmount,
                TaxRate = item.TaxRate,
                TaxAmount = taxAmount
            });
        }

        return new TaxCalculationSummary
        {
            TotalTax = currencyService.Round(totalTax, currencyCode),
            LineItems = lineResults
        };
    }

    /// <inheritdoc />
    public decimal CalculateTaxableAmount(
        decimal lineTotal,
        decimal lineItemDiscount,
        decimal orderDiscountTotal,
        decimal totalTaxableAmount,
        string currencyCode)
    {
        var proRatedOrderDiscount = 0m;
        if (orderDiscountTotal > 0 && totalTaxableAmount > 0)
        {
            var proportion = lineTotal / totalTaxableAmount;
            proRatedOrderDiscount = currencyService.Round(orderDiscountTotal * proportion, currencyCode);
        }

        return Math.Max(0, lineTotal - lineItemDiscount - proRatedOrderDiscount);
    }

    /// <summary>
    /// Calculates the discount amount for a line item based on discount type.
    /// </summary>
    private decimal CalculateLineItemDiscount(
        decimal lineTotal,
        int quantity,
        DiscountValueType? discountType,
        decimal? discountValue,
        string currencyCode)
    {
        if (discountType == null || discountValue == null || discountValue.Value <= 0)
        {
            return 0;
        }

        var discountAmount = discountType.Value switch
        {
            DiscountValueType.Percentage =>
                currencyService.Round(lineTotal * (discountValue.Value / 100m), currencyCode),
            DiscountValueType.FixedAmount =>
                currencyService.Round(discountValue.Value * quantity, currencyCode),
            _ => 0m
        };

        // Cap discount at line total
        return Math.Min(discountAmount, lineTotal);
    }
}

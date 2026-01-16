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
    public OrderTaxResult CalculateOrderTax(OrderTaxInput input, string currencyCode)
    {
        decimal lineItemTax = 0;

        foreach (var item in input.TaxableItems)
        {
            // Start with item total
            var taxableAmount = item.ItemTotal;

            // Subtract linked discount (already negative, so we add it)
            taxableAmount += item.LinkedDiscount;

            // Pro-rate unlinked before-tax discounts across taxable items
            if (input.UnlinkedBeforeTaxDiscountTotal < 0 && input.TotalTaxableAmount > 0)
            {
                var proportion = item.ItemTotal / input.TotalTaxableAmount;
                var proRatedDiscount = currencyService.Round(
                    input.UnlinkedBeforeTaxDiscountTotal * proportion, currencyCode);
                taxableAmount += proRatedDiscount; // proRatedDiscount is negative
            }

            // Subtract after-tax discount contribution (pre-tax equivalent)
            taxableAmount -= item.AfterTaxDiscountContribution;

            // Ensure non-negative
            taxableAmount = Math.Max(0m, taxableAmount);

            // Calculate tax
            lineItemTax += currencyService.Round(taxableAmount * (item.TaxRate / 100m), currencyCode);
        }

        // Calculate shipping tax if applicable
        decimal shippingTax = 0;
        if (input.IsShippingTaxable && input.ShippingAmount > 0)
        {
            if (input.ShippingTaxRate == 0m)
            {
                // Shipping is explicitly not taxable
                shippingTax = 0m;
            }
            else if (input.ShippingTaxRate.HasValue)
            {
                // Use the configured shipping tax rate (from regional override or shipping tax group)
                shippingTax = currencyService.Round(
                    input.ShippingAmount * (input.ShippingTaxRate.Value / 100m), currencyCode);
            }
            else
            {
                // ShippingTaxRate is null - use weighted average of line item tax rates
                // This is EU/UK VAT compliant for mixed-rate orders
                // Important: Use pre-discount item totals and rates so discounts don't affect shipping tax
                var totalTaxableAmount = input.TaxableItems.Sum(i => i.ItemTotal);
                if (totalTaxableAmount > 0)
                {
                    // Calculate weighted average tax rate from item rates (not affected by discounts)
                    var weightedTaxRate = input.TaxableItems.Sum(i => i.ItemTotal * i.TaxRate) / totalTaxableAmount;
                    shippingTax = currencyService.Round(
                        input.ShippingAmount * (weightedTaxRate / 100m), currencyCode);
                }
            }
        }

        return new OrderTaxResult
        {
            TotalTax = currencyService.Round(lineItemTax + shippingTax, currencyCode),
            LineItemTax = lineItemTax,
            ShippingTax = shippingTax
        };
    }

    /// <inheritdoc />
    public LineItemTaxSummary CalculateLineItemTax(LineItemTaxInput request, string currencyCode)
    {
        // Handle tax-exempt case
        if (request.IsTaxExempt)
        {
            return new LineItemTaxSummary
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

        return new LineItemTaxSummary
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

    /// <inheritdoc />
    public TaxPreviewResult PreviewTax(decimal price, int quantity, decimal taxRate, string currencyCode)
    {
        var subtotal = currencyService.Round(price * quantity, currencyCode);
        var taxAmount = currencyService.Round(subtotal * (taxRate / 100m), currencyCode);

        return new TaxPreviewResult
        {
            Subtotal = subtotal,
            TaxRate = taxRate,
            TaxAmount = taxAmount,
            Total = subtotal + taxAmount
        };
    }

    /// <inheritdoc />
    public decimal CalculateProportionalShippingTax(
        decimal shippingAmount,
        decimal lineItemTax,
        decimal taxableSubtotal,
        string currencyCode)
    {
        if (shippingAmount <= 0 || lineItemTax <= 0 || taxableSubtotal <= 0)
        {
            return 0m;
        }

        var effectiveRate = lineItemTax / taxableSubtotal;
        return currencyService.Round(shippingAmount * effectiveRate, currencyCode);
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

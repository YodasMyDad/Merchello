using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Storefront.Models;

namespace Merchello.Core.Checkout.Extensions;

/// <summary>
/// Extension methods for display currency conversions.
/// Uses ICurrencyService for proper rounding per currency (JPY=0, BHD=3, default=2 decimals).
/// </summary>
public static class DisplayCurrencyExtensions
{
    /// <summary>
    /// Get basket totals converted to display currency with proper rounding.
    /// </summary>
    public static DisplayAmounts GetDisplayAmounts(
        this Basket? basket,
        decimal exchangeRate,
        ICurrencyService currencyService,
        string targetCurrency)
    {
        if (basket == null)
            return new DisplayAmounts(0, 0, 0, 0, 0);

        return new DisplayAmounts(
            currencyService.Round(basket.Total * exchangeRate, targetCurrency),
            currencyService.Round(basket.SubTotal * exchangeRate, targetCurrency),
            currencyService.Round(basket.Shipping * exchangeRate, targetCurrency),
            currencyService.Round(basket.Tax * exchangeRate, targetCurrency),
            currencyService.Round(basket.Discount * exchangeRate, targetCurrency)
        );
    }

    /// <summary>
    /// Get basket totals converted to display currency using StorefrontDisplayContext.
    /// Note: Basket totals already include tax (calculated by LineItemService).
    /// When DisplayPricesIncTax is enabled, also calculates tax-inclusive subtotal, shipping and message.
    /// </summary>
    public static DisplayAmounts GetDisplayAmounts(
        this Basket? basket,
        StorefrontDisplayContext displayContext,
        ICurrencyService currencyService)
    {
        if (basket == null)
            return new DisplayAmounts(0, 0, 0, 0, 0);

        return GetDisplayAmounts(
            basket.Total,
            basket.SubTotal,
            basket.Shipping,
            basket.Tax,
            basket.Discount,
            displayContext,
            currencyService);
    }

    /// <summary>
    /// Get display amounts from raw values (used by both basket and confirmation flows).
    /// Handles currency conversion, tax-inclusive pricing, and tax reconciliation.
    /// </summary>
    public static DisplayAmounts GetDisplayAmounts(
        decimal total,
        decimal subTotal,
        decimal shippingAmount,
        decimal taxAmount,
        decimal discount,
        StorefrontDisplayContext displayContext,
        ICurrencyService currencyService)
    {
        var rate = displayContext.ExchangeRate;
        var currency = displayContext.CurrencyCode;

        var displayTotal = currencyService.Round(total * rate, currency);
        var displaySubTotal = currencyService.Round(subTotal * rate, currency);
        var displayDiscount = currencyService.Round(discount * rate, currency);

        // Calculate shipping - apply tax if DisplayPricesIncTax is enabled and we have a rate
        decimal shipping;
        decimal taxInclusiveShipping;

        if (displayContext.DisplayPricesIncTax && shippingAmount > 0 &&
            displayContext.IsShippingTaxable && displayContext.ShippingTaxRate.HasValue)
        {
            // Use the configured shipping tax rate from the provider
            var shippingTaxRate = displayContext.ShippingTaxRate.Value;

            // Tax-inclusive shipping = NET shipping × (1 + taxRate/100) × exchangeRate
            taxInclusiveShipping = currencyService.Round(shippingAmount * (1 + (shippingTaxRate / 100m)) * rate, currency);
            shipping = taxInclusiveShipping;
        }
        else
        {
            // No rate available - show net shipping
            shipping = currencyService.Round(shippingAmount * rate, currency);
            taxInclusiveShipping = shipping;
        }

        // Reconcile tax to prevent rounding discrepancies when currency conversion AND DisplayIncTax are both active
        // When each component is rounded independently, their sum may not equal the independently rounded total
        // This mirrors the reconciliation in LineItemService.CalculateFromLineItems
        // Backend formula: total = (subTotal - discount) + tax + shipping
        // So: tax = total - subTotal + discount - shipping (ensures displayed values sum correctly)
        var tax = Math.Max(0, displayTotal - displaySubTotal + displayDiscount - shipping);

        // Tax-inclusive calculations (subtotal is calculated from line items in the controller)
        var taxInclusiveSubTotal = displaySubTotal + tax;
        string? taxIncludedMessage = null;

        if (displayContext.DisplayPricesIncTax && tax > 0)
        {
            var format = $"N{displayContext.DecimalPlaces}";
            taxIncludedMessage = $"Including {displayContext.CurrencySymbol}{tax.ToString(format)} in taxes";
        }

        // Calculate tax-inclusive discount using the effective tax rate
        // This is an approximation that works well for most cases
        decimal taxInclusiveDiscount = displayDiscount;
        if (displayContext.DisplayPricesIncTax && displayDiscount > 0 && displaySubTotal > 0)
        {
            // Effective tax rate = tax / subtotal (as a multiplier, e.g., 0.20 for 20%)
            var effectiveTaxRate = tax / displaySubTotal;
            taxInclusiveDiscount = currencyService.Round(displayDiscount * (1 + effectiveTaxRate), currency);
        }

        return new DisplayAmounts(
            displayTotal, displaySubTotal, shipping, tax, displayDiscount,
            displayContext.DisplayPricesIncTax,
            taxInclusiveSubTotal,
            taxIncludedMessage,
            taxInclusiveShipping,
            taxInclusiveDiscount
        );
    }

    /// <summary>
    /// Get line item total converted to display currency.
    /// </summary>
    public static decimal GetDisplayTotal(
        this LineItem lineItem,
        decimal exchangeRate,
        ICurrencyService currencyService,
        string targetCurrency)
    {
        return currencyService.Round(
            lineItem.Amount * lineItem.Quantity * exchangeRate,
            targetCurrency);
    }

    /// <summary>
    /// Get line item display total, optionally including tax.
    /// When DisplayPricesIncTax = true: amount × (1 + taxRate/100) × quantity × exchangeRate
    /// </summary>
    public static decimal GetDisplayLineItemTotal(
        this LineItem lineItem,
        StorefrontDisplayContext displayContext,
        ICurrencyService currencyService)
    {
        var amount = lineItem.Amount * lineItem.Quantity;

        // Apply tax if enabled and item is taxable
        if (displayContext.DisplayPricesIncTax && lineItem.IsTaxable && lineItem.TaxRate > 0)
        {
            amount *= 1 + (lineItem.TaxRate / 100m);
        }

        return currencyService.Round(amount * displayContext.ExchangeRate, displayContext.CurrencyCode);
    }

    /// <summary>
    /// Get line item unit price for display, optionally including tax.
    /// When DisplayPricesIncTax = true: amount × (1 + taxRate/100) × exchangeRate
    /// </summary>
    public static decimal GetDisplayLineItemUnitPrice(
        this LineItem lineItem,
        StorefrontDisplayContext displayContext,
        ICurrencyService currencyService)
    {
        var amount = lineItem.Amount;

        // Apply tax if enabled and item is taxable
        if (displayContext.DisplayPricesIncTax && lineItem.IsTaxable && lineItem.TaxRate > 0)
        {
            amount *= 1 + (lineItem.TaxRate / 100m);
        }

        return currencyService.Round(amount * displayContext.ExchangeRate, displayContext.CurrencyCode);
    }

    /// <summary>
    /// Get discount amount converted to display currency.
    /// </summary>
    public static decimal GetDisplayDiscountAmount(
        this LineItem discountItem,
        decimal exchangeRate,
        ICurrencyService currencyService,
        string targetCurrency)
    {
        return currencyService.Round(
            Math.Abs(discountItem.Amount * discountItem.Quantity) * exchangeRate,
            targetCurrency);
    }

    /// <summary>
    /// Get discount display amount, optionally including tax portion.
    /// When the discount is on a taxable item and DisplayPricesIncTax = true, the discount should also include tax.
    /// </summary>
    public static decimal GetDisplayDiscountTotal(
        this LineItem discountItem,
        StorefrontDisplayContext displayContext,
        ICurrencyService currencyService,
        decimal? linkedItemTaxRate = null)
    {
        var amount = Math.Abs(discountItem.Amount * discountItem.Quantity);

        // If discount is on a taxable item and prices include tax, the discount should too
        if (displayContext.DisplayPricesIncTax && linkedItemTaxRate is > 0)
        {
            amount *= 1 + (linkedItemTaxRate.Value / 100m);
        }

        return currencyService.Round(amount * displayContext.ExchangeRate, displayContext.CurrencyCode);
    }

    /// <summary>
    /// Get shipping option cost for display, optionally including tax.
    /// When DisplayPricesIncTax = true and shipping is taxable: cost × (1 + taxRate/100) × exchangeRate
    /// Uses shipping tax rate from ITaxProviderManager via StorefrontDisplayContext.
    /// </summary>
    public static decimal GetDisplayShippingOptionCost(
        decimal cost,
        StorefrontDisplayContext displayContext,
        ICurrencyService currencyService)
    {
        var rate = displayContext.ExchangeRate;
        var currency = displayContext.CurrencyCode;

        if (displayContext.DisplayPricesIncTax &&
            displayContext.IsShippingTaxable &&
            displayContext.ShippingTaxRate.HasValue)
        {
            var shippingTaxRate = displayContext.ShippingTaxRate.Value;
            return currencyService.Round(cost * (1 + (shippingTaxRate / 100m)) * rate, currency);
        }

        return currencyService.Round(cost * rate, currency);
    }
}

/// <summary>
/// Display amounts in customer's selected currency.
/// Includes tax-inclusive variants when DisplayPricesIncTax setting is enabled.
/// </summary>
public record DisplayAmounts(
    decimal Total,
    decimal SubTotal,
    decimal Shipping,
    decimal Tax,
    decimal Discount,
    bool DisplayPricesIncTax = false,
    decimal TaxInclusiveSubTotal = 0,
    string? TaxIncludedMessage = null,
    decimal TaxInclusiveShipping = 0,
    decimal TaxInclusiveDiscount = 0);

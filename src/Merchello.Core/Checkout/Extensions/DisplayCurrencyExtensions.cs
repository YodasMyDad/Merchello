using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Checkout.Dtos;
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
    /// Includes GROSS-level reconciliation to ensure displayed tax-inclusive values sum to total.
    /// </summary>
    public static DisplayAmounts GetDisplayAmounts(
        this Basket? basket,
        StorefrontDisplayContext displayContext,
        ICurrencyService currencyService)
    {
        if (basket == null)
            return new DisplayAmounts(0, 0, 0, 0, 0);

        // Use basket's effective shipping tax rate when context rate is null (proportional mode)
        // This allows tax-inclusive shipping display even when no specific rate is configured
        var effectiveContext = displayContext.ShippingTaxRate.HasValue
            ? displayContext
            : displayContext with { ShippingTaxRate = basket.EffectiveShippingTaxRate };

        var baseResult = GetDisplayAmounts(
            basket.Total,
            basket.SubTotal,
            basket.Shipping,
            basket.Tax,
            basket.Discount,
            effectiveContext,
            currencyService);

        // When DisplayPricesIncTax is enabled, apply GROSS-level reconciliation
        // This ensures the sum of tax-inclusive values equals the display total
        if (!displayContext.DisplayPricesIncTax)
        {
            return baseResult;
        }

        var rate = effectiveContext.ExchangeRate;
        var currency = effectiveContext.CurrencyCode;

        // Calculate raw GROSS subtotal by summing each line item's tax-inclusive amount
        // This matches how controllers calculate display prices for individual line items
        var productItems = basket.LineItems.Where(li =>
            li.LineItemType is LineItemType.Product or LineItemType.Custom or LineItemType.Addon).ToList();

        var rawGrossSubTotal = productItems.Sum(li =>
        {
            var amount = li.Amount * li.Quantity;
            if (li.IsTaxable && li.TaxRate > 0)
            {
                amount *= 1 + (li.TaxRate / 100m);
            }
            return currencyService.Round(amount * rate, currency);
        });

        // Use centralized reconciliation method
        var reconciledGrossSubTotal = ReconcileTaxInclusiveSubTotal(
            rawGrossSubTotal,
            productItems.Count,
            baseResult.Total,
            baseResult.TaxInclusiveShipping,
            baseResult.TaxInclusiveDiscount);

        return baseResult with { TaxInclusiveSubTotal = reconciledGrossSubTotal };
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

        // Always calculate NET shipping for tax reconciliation formula
        var netShipping = currencyService.Round(shippingAmount * rate, currency);

        // Calculate shipping for display - apply tax if DisplayPricesIncTax is enabled and we have a rate
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
            shipping = netShipping;
            taxInclusiveShipping = shipping;
        }

        // Reconcile tax to prevent rounding discrepancies when currency conversion AND DisplayIncTax are both active
        // When each component is rounded independently, their sum may not equal the independently rounded total
        // This mirrors the reconciliation in LineItemService.CalculateFromLineItems
        // Backend formula: total = (subTotal - discount) + tax + shipping (where shipping is NET)
        // So: tax = total - subTotal + discount - netShipping (ensures displayed values sum correctly)
        var tax = Math.Max(0, displayTotal - displaySubTotal + displayDiscount - netShipping);

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
    /// Get line item unit price for display, including linked add-ons for parent product/custom lines.
    /// </summary>
    public static decimal GetDisplayLineItemUnitPriceWithAddons(
        this LineItem lineItem,
        IEnumerable<LineItem> allLineItems,
        StorefrontDisplayContext displayContext,
        ICurrencyService currencyService)
    {
        var unitPrice = lineItem.GetDisplayLineItemUnitPrice(displayContext, currencyService);
        if (lineItem.LineItemType is not (LineItemType.Product or LineItemType.Custom))
        {
            return unitPrice;
        }

        var addonsUnitPrice = allLineItems
            .Where(addon => addon.IsAddonLinkedToParent(lineItem))
            .Sum(addon => addon.GetDisplayLineItemUnitPrice(displayContext, currencyService));

        return unitPrice + addonsUnitPrice;
    }

    /// <summary>
    /// Get line item total for display, including linked add-ons for parent product/custom lines.
    /// </summary>
    public static decimal GetDisplayLineItemTotalWithAddons(
        this LineItem lineItem,
        IEnumerable<LineItem> allLineItems,
        StorefrontDisplayContext displayContext,
        ICurrencyService currencyService)
    {
        var lineTotal = lineItem.GetDisplayLineItemTotal(displayContext, currencyService);
        if (lineItem.LineItemType is not (LineItemType.Product or LineItemType.Custom))
        {
            return lineTotal;
        }

        var addonsLineTotal = allLineItems
            .Where(addon => addon.IsAddonLinkedToParent(lineItem))
            .Sum(addon => addon.GetDisplayLineItemTotal(displayContext, currencyService));

        return lineTotal + addonsLineTotal;
    }

    /// <summary>
    /// Get checkout line item unit price including linked add-ons for parent product/custom lines.
    /// </summary>
    public static decimal GetDisplayLineItemUnitPriceWithAddons(
        this CheckoutLineItemDto lineItem,
        IEnumerable<CheckoutLineItemDto> allLineItems)
    {
        var unitPrice = lineItem.DisplayUnitPrice;
        if (lineItem.LineItemType is not (LineItemType.Product or LineItemType.Custom))
        {
            return unitPrice;
        }

        var addonsUnitPrice = allLineItems
            .Where(addon => IsAddonLinkedToParent(addon, lineItem))
            .Sum(addon => addon.DisplayUnitPrice);

        return unitPrice + addonsUnitPrice;
    }

    /// <summary>
    /// Get checkout line item total including linked add-ons for parent product/custom lines.
    /// </summary>
    public static decimal GetDisplayLineItemTotalWithAddons(
        this CheckoutLineItemDto lineItem,
        IEnumerable<CheckoutLineItemDto> allLineItems)
    {
        var lineTotal = lineItem.DisplayLineTotal;
        if (lineItem.LineItemType is not (LineItemType.Product or LineItemType.Custom))
        {
            return lineTotal;
        }

        var addonsLineTotal = allLineItems
            .Where(addon => IsAddonLinkedToParent(addon, lineItem))
            .Sum(addon => addon.DisplayLineTotal);

        return lineTotal + addonsLineTotal;
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

    /// <summary>
    /// Reconcile tax-inclusive subtotal to ensure displayed values sum correctly.
    /// Only applies reconciliation when there are multiple product items.
    /// With a single item, the subtotal must match the line item exactly (customer expectation).
    /// </summary>
    /// <param name="rawGrossSubTotal">Sum of individually-rounded tax-inclusive line items</param>
    /// <param name="productItemCount">Number of product/custom/addon line items</param>
    /// <param name="displayTotal">The display total that values should sum to</param>
    /// <param name="taxInclusiveShipping">Tax-inclusive shipping amount</param>
    /// <param name="taxInclusiveDiscount">Tax-inclusive discount amount</param>
    /// <returns>Reconciled tax-inclusive subtotal</returns>
    public static decimal ReconcileTaxInclusiveSubTotal(
        decimal rawGrossSubTotal,
        int productItemCount,
        decimal displayTotal,
        decimal taxInclusiveShipping,
        decimal taxInclusiveDiscount)
    {
        // Only apply GROSS reconciliation when there are multiple product items.
        // With a single item, the subtotal must match the line item exactly.
        // With multiple items, a 1p discrepancy is hidden in the sum, so we can reconcile.
        if (productItemCount <= 1)
        {
            return rawGrossSubTotal;
        }

        // GROSS reconciliation formula:
        // TaxInclusiveSubTotal + TaxInclusiveShipping - TaxInclusiveDiscount = displayTotal
        var expectedSum = displayTotal;
        var actualSum = rawGrossSubTotal + taxInclusiveShipping - taxInclusiveDiscount;
        var discrepancy = expectedSum - actualSum;

        return rawGrossSubTotal + discrepancy;
    }

    /// <summary>
    /// Calculate the raw tax-inclusive subtotal from checkout confirmation line items.
    /// Filters to product/custom/addon items, applies the tax formula, rounds per currency, and sums.
    /// </summary>
    public static (decimal RawSubTotal, int ProductItemCount) GetRawTaxInclusiveSubTotal(
        this IEnumerable<CheckoutLineItemDto> lineItems,
        bool displayPricesIncTax,
        ICurrencyService currencyService,
        string currency)
    {
        var productItems = lineItems
            .Where(li => li.LineItemType is LineItemType.Product or LineItemType.Custom or LineItemType.Addon)
            .ToList();

        var rawSubTotal = productItems.Sum(li =>
        {
            var amount = li.DisplayLineTotal;
            if (displayPricesIncTax && li.IsTaxable && li.TaxRate > 0)
            {
                amount *= 1 + (li.TaxRate / 100m);
            }
            return currencyService.Round(amount, currency);
        });

        return (rawSubTotal, productItems.Count);
    }

    private static bool IsAddonLinkedToParent(CheckoutLineItemDto addonLineItem, CheckoutLineItemDto parentLineItem)
    {
        if (addonLineItem.LineItemType != LineItemType.Addon)
        {
            return false;
        }

        if (!string.IsNullOrWhiteSpace(addonLineItem.ParentLineItemId) &&
            !string.IsNullOrWhiteSpace(parentLineItem.Id.ToString()))
        {
            return string.Equals(
                addonLineItem.ParentLineItemId,
                parentLineItem.Id.ToString(),
                StringComparison.OrdinalIgnoreCase);
        }

        if (string.IsNullOrWhiteSpace(addonLineItem.DependantLineItemSku) || string.IsNullOrWhiteSpace(parentLineItem.Sku))
        {
            return false;
        }

        return string.Equals(
            addonLineItem.DependantLineItemSku,
            parentLineItem.Sku,
            StringComparison.OrdinalIgnoreCase);
    }
}

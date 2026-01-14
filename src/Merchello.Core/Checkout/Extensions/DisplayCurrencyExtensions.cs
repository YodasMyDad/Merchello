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
    /// This method just converts to display currency.
    /// </summary>
    public static DisplayAmounts GetDisplayAmounts(
        this Basket? basket,
        StorefrontDisplayContext displayContext,
        ICurrencyService currencyService)
    {
        if (basket == null)
            return new DisplayAmounts(0, 0, 0, 0, 0);

        return new DisplayAmounts(
            currencyService.Round(basket.Total * displayContext.ExchangeRate, displayContext.CurrencyCode),
            currencyService.Round(basket.SubTotal * displayContext.ExchangeRate, displayContext.CurrencyCode),
            currencyService.Round(basket.Shipping * displayContext.ExchangeRate, displayContext.CurrencyCode),
            currencyService.Round(basket.Tax * displayContext.ExchangeRate, displayContext.CurrencyCode),
            currencyService.Round(basket.Discount * displayContext.ExchangeRate, displayContext.CurrencyCode)
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
}

/// <summary>
/// Display amounts in customer's selected currency.
/// </summary>
public record DisplayAmounts(
    decimal Total,
    decimal SubTotal,
    decimal Shipping,
    decimal Tax,
    decimal Discount);

using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Storefront.Models;

namespace Merchello.Core.Products.Extensions;

/// <summary>
/// Extension methods for calculating tax-inclusive display prices.
/// </summary>
public static class DisplayPriceExtensions
{
    /// <summary>
    /// Calculates the display price for a product variant.
    /// Applies tax (if DisplayPricesIncTax) then currency conversion.
    /// </summary>
    public static async Task<ProductDisplayPrice> GetDisplayPriceAsync(
        this Product product,
        StorefrontDisplayContext displayContext,
        ITaxService taxService,
        ICurrencyService currencyService,
        CancellationToken ct = default)
    {
        // Price = current selling price (what customer pays)
        // PreviousPrice = "was" price for strikethrough display when OnSale
        var netPrice = product.Price;
        var netCompareAtPrice = product.OnSale && product.PreviousPrice.HasValue
            ? product.PreviousPrice.Value
            : (decimal?)null;

        // Get applicable tax rate for customer's location
        decimal taxRate = 0m;
        if (displayContext.DisplayPricesIncTax && product.ProductRoot?.TaxGroupId is Guid taxGroupId)
        {
            taxRate = await taxService.GetApplicableRateAsync(
                taxGroupId,
                displayContext.TaxCountryCode,
                displayContext.TaxRegionCode,
                ct);
        }

        // Calculate tax-inclusive prices (if applicable)
        var taxMultiplier = displayContext.DisplayPricesIncTax ? 1 + (taxRate / 100m) : 1m;
        var priceWithTax = netPrice * taxMultiplier;
        var compareAtPriceWithTax = netCompareAtPrice * taxMultiplier;

        // Convert to display currency
        var displayPrice = currencyService.Round(
            priceWithTax * displayContext.ExchangeRate,
            displayContext.CurrencyCode);
        var displayCompareAtPrice = compareAtPriceWithTax.HasValue
            ? currencyService.Round(compareAtPriceWithTax.Value * displayContext.ExchangeRate, displayContext.CurrencyCode)
            : (decimal?)null;

        // Calculate tax amount in display currency (on current selling price)
        var taxAmount = displayContext.DisplayPricesIncTax
            ? currencyService.Round((netPrice * (taxRate / 100m)) * displayContext.ExchangeRate, displayContext.CurrencyCode)
            : 0m;

        return new ProductDisplayPrice(
            displayPrice,
            displayCompareAtPrice,
            displayContext.DisplayPricesIncTax && taxRate > 0,
            taxRate,
            taxAmount,
            displayContext.CurrencyCode,
            displayContext.CurrencySymbol,
            displayContext.DecimalPlaces);
    }

    /// <summary>
    /// Calculates the display price adjustment for an add-on option.
    /// Applies tax (if DisplayPricesIncTax) and currency conversion.
    /// </summary>
    /// <param name="priceAdjustment">The NET price adjustment amount</param>
    /// <param name="displayContext">The storefront display context</param>
    /// <param name="taxRate">The applicable tax rate percentage</param>
    /// <param name="currencyService">Currency service for rounding</param>
    /// <returns>The display price adjustment in the customer's currency</returns>
    public static decimal GetDisplayPriceAdjustment(
        decimal priceAdjustment,
        StorefrontDisplayContext displayContext,
        decimal taxRate,
        ICurrencyService currencyService)
    {
        if (priceAdjustment == 0) return 0;

        var taxMultiplier = displayContext.DisplayPricesIncTax ? 1 + (taxRate / 100m) : 1m;
        var adjustedAmount = priceAdjustment * taxMultiplier * displayContext.ExchangeRate;

        return currencyService.Round(adjustedAmount, displayContext.CurrencyCode);
    }
}

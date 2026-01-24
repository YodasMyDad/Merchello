using Merchello.Core.Storefront.Services;
using Merchello.Core.Storefront.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Site.Shared.Components.PriceRangeSlider;

public class PriceRangeSliderViewComponent(IStorefrontContextService storefrontContext) : ViewComponent
{
    public async Task<IViewComponentResult> InvokeAsync(
        decimal rangeMin,
        decimal rangeMax,
        decimal? selectedMin,
        decimal? selectedMax,
        decimal taxRate = 0m)
    {
        var displayContext = await storefrontContext.GetDisplayContextAsync();

        // Calculate display multiplier: taxMultiplier * exchangeRate
        // Per TaxInclusive.md: tax is applied BEFORE currency conversion
        var taxMultiplier = displayContext.DisplayPricesIncTax ? 1 + (taxRate / 100m) : 1m;
        var displayMultiplier = taxMultiplier * displayContext.ExchangeRate;

        // Calculate display prices for the range bounds
        var displayRangeMin = Math.Round(rangeMin * displayMultiplier, displayContext.DecimalPlaces);
        var displayRangeMax = Math.Round(rangeMax * displayMultiplier, displayContext.DecimalPlaces);
        var displaySelectedMin = selectedMin.HasValue
            ? Math.Round(selectedMin.Value * displayMultiplier, displayContext.DecimalPlaces)
            : (decimal?)null;
        var displaySelectedMax = selectedMax.HasValue
            ? Math.Round(selectedMax.Value * displayMultiplier, displayContext.DecimalPlaces)
            : (decimal?)null;

        var model = new PriceRangeSliderViewModel
        {
            // Store prices for filtering
            RangeMin = rangeMin,
            RangeMax = rangeMax,
            SelectedMin = selectedMin,
            SelectedMax = selectedMax,

            // Display prices for UI labels
            DisplayRangeMin = displayRangeMin,
            DisplayRangeMax = displayRangeMax,
            DisplaySelectedMin = displaySelectedMin,
            DisplaySelectedMax = displaySelectedMax,
            DisplayMultiplier = displayMultiplier,

            // Currency context
            CurrencySymbol = displayContext.CurrencySymbol,
            DecimalPlaces = displayContext.DecimalPlaces
        };

        return View(model);
    }
}

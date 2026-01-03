using Merchello.Core.Storefront.Services;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Site.Shared.Components.PriceRangeSlider;

public class PriceRangeSliderViewComponent(IStorefrontContextService storefrontContext) : ViewComponent
{
    public async Task<IViewComponentResult> InvokeAsync(decimal rangeMin, decimal rangeMax, decimal? selectedMin, decimal? selectedMax)
    {
        var currencyContext = await storefrontContext.GetCurrencyContextAsync();

        var model = new PriceRangeSliderViewModel
        {
            RangeMin = rangeMin,
            RangeMax = rangeMax,
            SelectedMin = selectedMin,
            SelectedMax = selectedMax,
            CurrencySymbol = currencyContext.CurrencySymbol,
            DecimalPlaces = currencyContext.DecimalPlaces
        };

        return View(model);
    }
}

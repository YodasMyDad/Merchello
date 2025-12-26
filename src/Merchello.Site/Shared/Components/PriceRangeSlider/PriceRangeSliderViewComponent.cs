using Microsoft.AspNetCore.Mvc;

namespace Merchello.Site.Shared.Components.PriceRangeSlider;

public class PriceRangeSliderViewComponent : ViewComponent
{
    public IViewComponentResult Invoke(decimal rangeMin, decimal rangeMax, decimal? selectedMin, decimal? selectedMax)
    {
        var model = new PriceRangeSliderViewModel
        {
            RangeMin = rangeMin,
            RangeMax = rangeMax,
            SelectedMin = selectedMin,
            SelectedMax = selectedMax
        };

        return View(model);
    }
}

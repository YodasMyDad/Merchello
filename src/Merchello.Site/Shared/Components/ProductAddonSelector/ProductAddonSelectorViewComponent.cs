using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.PublishedCache;

namespace Merchello.Site.Shared.Components.ProductAddonSelector;

/// <summary>
/// ViewComponent for rendering product add-on option selectors.
/// Supports checkbox, dropdown, colour swatches, image swatches, and radio buttons.
/// Add-ons display price adjustments where applicable.
/// </summary>
public class ProductAddonSelectorViewComponent(
    IPublishedMediaCache mediaCache,
    IOptions<MerchelloSettings> settings) : ViewComponent
{
    /// <summary>
    /// Renders the add-on selector based on the option's UI type.
    /// </summary>
    /// <param name="option">The product add-on option to render.</param>
    /// <returns>The rendered view component result.</returns>
    public IViewComponentResult Invoke(ProductOption option)
    {
        ArgumentNullException.ThrowIfNull(option);

        var uiType = option.OptionUiAlias ?? "checkbox";

        var model = new ProductAddonSelectorViewModel
        {
            OptionId = option.Id.ToString(),
            Name = option.Name ?? "Add-on",
            UiType = uiType,
            UseSwiper = option.ProductOptionValues.Count > 6,
            CurrencySymbol = settings.Value.CurrencySymbol,
            Values = option.ProductOptionValues
                .OrderBy(v => v.SortOrder)
                .Select(v => new ProductAddonValueViewModel
                {
                    Id = v.Id.ToString(),
                    Name = v.Name ?? "",
                    PriceAdjustment = v.PriceAdjustment,
                    HexValue = v.HexValue,
                    MediaUrl = v.MediaKey.HasValue
                        ? mediaCache.GetById(v.MediaKey.Value)?.GetCropUrl(width: 80)
                        : null
                })
                .ToList()
        };

        return View(model);
    }
}

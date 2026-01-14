using Merchello.Core.Products.Extensions;
using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Storefront.Services;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Core.PublishedCache;

namespace Merchello.Site.Shared.Components.ProductAddonSelector;

/// <summary>
/// ViewComponent for rendering product add-on option selectors.
/// Supports checkbox, dropdown, colour swatches, image swatches, and radio buttons.
/// Add-ons display price adjustments where applicable, including tax when DisplayPricesIncTax is enabled.
/// </summary>
public class ProductAddonSelectorViewComponent(
    IPublishedMediaCache mediaCache,
    IStorefrontContextService storefrontContext,
    ICurrencyService currencyService) : ViewComponent
{
    /// <summary>
    /// Renders the add-on selector based on the option's UI type.
    /// </summary>
    /// <param name="option">The product add-on option to render.</param>
    /// <param name="taxRate">The applicable tax rate for this product (0-100). Used when DisplayPricesIncTax is enabled.</param>
    /// <returns>The rendered view component result.</returns>
    public async Task<IViewComponentResult> InvokeAsync(ProductOption option, decimal taxRate = 0)
    {
        ArgumentNullException.ThrowIfNull(option);

        var displayContext = await storefrontContext.GetDisplayContextAsync();
        var uiType = option.OptionUiAlias ?? "checkbox";

        var model = new ProductAddonSelectorViewModel
        {
            OptionId = option.Id.ToString(),
            Name = option.Name ?? "Add-on",
            UiType = uiType,
            UseSwiper = option.ProductOptionValues.Count > 6,
            CurrencySymbol = displayContext.CurrencySymbol,
            DecimalPlaces = displayContext.DecimalPlaces,
            IncludesTax = displayContext.DisplayPricesIncTax && taxRate > 0,
            Values = option.ProductOptionValues
                .OrderBy(v => v.SortOrder)
                .Select(v => new ProductAddonValueViewModel
                {
                    Id = v.Id.ToString(),
                    Name = v.Name ?? "",
                    PriceAdjustment = v.PriceAdjustment,
                    DisplayPriceAdjustment = DisplayPriceExtensions.GetDisplayPriceAdjustment(
                        v.PriceAdjustment,
                        displayContext,
                        taxRate,
                        currencyService),
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

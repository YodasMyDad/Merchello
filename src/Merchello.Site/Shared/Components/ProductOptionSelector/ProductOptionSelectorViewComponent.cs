using Merchello.Core.Products.Models;
using Microsoft.AspNetCore.Mvc;
using Umbraco.Cms.Core.PublishedCache;

namespace Merchello.Site.Shared.Components.ProductOptionSelector;

/// <summary>
/// ViewComponent for rendering product variant option selectors.
/// Supports dropdown, colour swatches, image swatches, and radio buttons.
/// </summary>
public class ProductOptionSelectorViewComponent(IPublishedMediaCache mediaCache) : ViewComponent
{
    /// <summary>
    /// Renders the option selector based on the option's UI type.
    /// </summary>
    /// <param name="option">The product option to render.</param>
    /// <returns>The rendered view component result.</returns>
    public IViewComponentResult Invoke(ProductOption option)
    {
        ArgumentNullException.ThrowIfNull(option);

        var uiType = option.OptionUiAlias ?? "dropdown";
        var optionAlias = option.Alias ?? option.Id.ToString();

        var model = new ProductOptionSelectorViewModel
        {
            OptionId = option.Id.ToString(),
            OptionAlias = optionAlias,
            Name = option.Name ?? "Option",
            UiType = uiType,
            UseSwiper = option.ProductOptionValues.Count > 6,
            Values = option.ProductOptionValues
                .OrderBy(v => v.SortOrder)
                .Select(v => new ProductOptionValueViewModel
                {
                    Id = v.Id.ToString(),
                    Name = v.Name ?? "",
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

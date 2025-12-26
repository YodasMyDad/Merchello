using Merchello.Core.Products.Models;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Site.Shared.Components.ProductFilters;

public class ProductFiltersViewComponent : ViewComponent
{
    public IViewComponentResult Invoke(List<ProductFilterGroup> filterGroups, List<Guid> selectedFilterKeys)
    {
        var model = new ProductFiltersViewModel
        {
            FilterGroups = filterGroups,
            SelectedFilterKeys = selectedFilterKeys
        };

        return View(model);
    }
}

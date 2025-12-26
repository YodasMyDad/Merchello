using Merchello.Core.Products.Models;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Site.Shared.Components.SortDropdown;

public class SortDropdownViewComponent : ViewComponent
{
    public IViewComponentResult Invoke(ProductOrderBy selectedOrderBy)
    {
        var model = new SortDropdownViewModel
        {
            SelectedOrderBy = selectedOrderBy
        };

        return View(model);
    }
}

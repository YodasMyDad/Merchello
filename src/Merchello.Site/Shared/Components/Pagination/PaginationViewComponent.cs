using Microsoft.AspNetCore.Mvc;

namespace Merchello.Site.Shared.Components.Pagination;

public class PaginationViewComponent : ViewComponent
{
    public IViewComponentResult Invoke(int currentPage, int totalPages, int totalItems)
    {
        var model = new PaginationViewModel
        {
            CurrentPage = currentPage,
            TotalPages = totalPages,
            TotalItems = totalItems
        };

        return View(model);
    }
}

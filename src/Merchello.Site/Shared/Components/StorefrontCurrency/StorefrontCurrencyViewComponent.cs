using Merchello.Core.Storefront.Services;
using Merchello.Core.Storefront.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Merchello.Site.Shared.Components.StorefrontCurrency;

/// <summary>
/// ViewComponent that injects currency context into the page layout.
/// Called once from Website.cshtml to provide currency info to all pages.
/// </summary>
public class StorefrontCurrencyViewComponent(IStorefrontContextService storefrontContext) : ViewComponent
{
    public async Task<IViewComponentResult> InvokeAsync()
    {
        var context = await storefrontContext.GetCurrencyContextAsync();
        return View(context);
    }
}

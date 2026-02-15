using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Shared.Models;
using Merchello.Core.Storefront.Services.Interfaces;
using Merchello.Services;
using Merchello.Site.Shared.Controllers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Cache;
using Umbraco.Cms.Core.Logging;
using Umbraco.Cms.Core.Routing;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Core.Web;
using Umbraco.Cms.Infrastructure.Persistence;

namespace Merchello.Site.Basket.Controllers;

public class BasketController(
    IOptions<MerchelloSettings> options,
    ICheckoutService checkoutService,
    IStorefrontContextService storefrontContext,
    IStorefrontDtoMapper storefrontDtoMapper,
    IUmbracoContextAccessor umbracoContextAccessor,
    IUmbracoDatabaseFactory databaseFactory,
    ServiceContext services,
    AppCaches appCaches,
    IProfilingLogger profilingLogger,
    IPublishedUrlProvider publishedUrlProvider)
    : BaseController(umbracoContextAccessor, databaseFactory, services, appCaches, profilingLogger,
        publishedUrlProvider)
{
    private readonly MerchelloSettings _settings = options.Value;

    public async Task<IActionResult> Basket(Umbraco.Cms.Web.Common.PublishedModels.Basket model, CancellationToken cancellationToken = default)
    {
        var basket = await checkoutService.GetBasket(new GetBasketParameters(), cancellationToken);
        var displayContext = await storefrontContext.GetDisplayContextAsync(cancellationToken);

        if (basket == null || basket.LineItems.Count == 0)
        {
            ViewBag.BasketData = storefrontDtoMapper.MapBasket(
                null,
                displayContext,
                _settings.CurrencySymbol);
        }
        else
        {
            var availability = await storefrontContext.GetBasketAvailabilityAsync(basket.LineItems, ct: cancellationToken);
            ViewBag.BasketData = storefrontDtoMapper.MapBasket(
                basket,
                displayContext,
                _settings.CurrencySymbol,
                availability);
        }

        return CurrentTemplate(model);
    }
}

using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Shared.Models;
using Merchello.Site.Shared.Controllers;
using Merchello.Site.Storefront.Models;
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
    IUmbracoContextAccessor umbracoContextAccessor,
    IUmbracoDatabaseFactory databaseFactory,
    ServiceContext services,
    AppCaches appCaches,
    IProfilingLogger profilingLogger,
    IPublishedUrlProvider publishedUrlProvider)
    : BaseController(options, umbracoContextAccessor, databaseFactory, services, appCaches, profilingLogger,
        publishedUrlProvider)
{
    private readonly MerchelloSettings _settings = options.Value;

    public async Task<IActionResult> Basket(Umbraco.Cms.Web.Common.PublishedModels.Basket model)
    {
        var basket = await checkoutService.GetBasket(new GetBasketParameters());

        if (basket == null || basket.LineItems.Count == 0)
        {
            ViewBag.BasketData = new FullBasketResponse
            {
                IsEmpty = true,
                CurrencySymbol = _settings.CurrencySymbol
            };
        }
        else
        {
            var items = basket.LineItems.Select(li => new BasketLineItemDto
            {
                Id = li.Id,
                Sku = li.Sku ?? "",
                Name = li.Name ?? "",
                Quantity = li.Quantity,
                UnitPrice = li.Amount,
                LineTotal = li.Amount * li.Quantity,
                FormattedUnitPrice = FormatPrice(li.Amount),
                FormattedLineTotal = FormatPrice(li.Amount * li.Quantity),
                LineItemType = li.LineItemType.ToString(),
                DependantLineItemSku = li.DependantLineItemSku
            }).ToList();

            ViewBag.BasketData = new FullBasketResponse
            {
                Items = items,
                SubTotal = basket.SubTotal,
                Discount = basket.Discount,
                Tax = basket.Tax,
                Total = basket.Total,
                FormattedSubTotal = FormatPrice(basket.SubTotal),
                FormattedDiscount = FormatPrice(basket.Discount),
                FormattedTax = FormatPrice(basket.Tax),
                FormattedTotal = FormatPrice(basket.Total),
                CurrencySymbol = _settings.CurrencySymbol,
                ItemCount = basket.LineItems.Sum(li => li.Quantity),
                IsEmpty = false
            };
        }

        return CurrentTemplate(model);
    }

    private string FormatPrice(decimal price)
    {
        return $"{_settings.CurrencySymbol}{price:N2}";
    }
}

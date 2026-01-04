using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Storefront.Services;
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
    IStorefrontContextService storefrontContext,
    ICurrencyService currencyService,
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

        // Get currency context for display conversion
        var currencyContext = await storefrontContext.GetCurrencyContextAsync();
        var rate = currencyContext.ExchangeRate;

        if (basket == null || basket.LineItems.Count == 0)
        {
            ViewBag.BasketData = new FullBasketResponse
            {
                IsEmpty = true,
                CurrencySymbol = _settings.CurrencySymbol,
                DisplayCurrencyCode = currencyContext.CurrencyCode,
                DisplayCurrencySymbol = currencyContext.CurrencySymbol,
                ExchangeRate = rate
            };
        }
        else
        {
            var items = basket.LineItems.Select(li =>
            {
                var displayUnitPrice = currencyService.Round(li.Amount * rate, currencyContext.CurrencyCode);
                var displayLineTotal = currencyService.Round(li.Amount * li.Quantity * rate, currencyContext.CurrencyCode);

                return new BasketLineItemDto
                {
                    Id = li.Id,
                    Sku = li.Sku ?? "",
                    Name = li.Name ?? "",
                    Quantity = li.Quantity,
                    UnitPrice = li.Amount,
                    LineTotal = li.Amount * li.Quantity,
                    FormattedUnitPrice = FormatPrice(li.Amount),
                    FormattedLineTotal = FormatPrice(li.Amount * li.Quantity),
                    DisplayUnitPrice = displayUnitPrice,
                    DisplayLineTotal = displayLineTotal,
                    FormattedDisplayUnitPrice = FormatDisplayPrice(displayUnitPrice, currencyContext.CurrencySymbol),
                    FormattedDisplayLineTotal = FormatDisplayPrice(displayLineTotal, currencyContext.CurrencySymbol),
                    LineItemType = li.LineItemType.ToString(),
                    DependantLineItemSku = li.DependantLineItemSku
                };
            }).ToList();

            // Convert totals for display
            var displaySubTotal = currencyService.Round(basket.SubTotal * rate, currencyContext.CurrencyCode);
            var displayDiscount = currencyService.Round(basket.Discount * rate, currencyContext.CurrencyCode);
            var displayTax = currencyService.Round(basket.Tax * rate, currencyContext.CurrencyCode);
            var displayShipping = currencyService.Round(basket.Shipping * rate, currencyContext.CurrencyCode);
            var displayTotal = currencyService.Round(basket.Total * rate, currencyContext.CurrencyCode);

            ViewBag.BasketData = new FullBasketResponse
            {
                Items = items,
                SubTotal = basket.SubTotal,
                Discount = basket.Discount,
                Tax = basket.Tax,
                Shipping = basket.Shipping,
                Total = basket.Total,
                FormattedSubTotal = FormatPrice(basket.SubTotal),
                FormattedDiscount = FormatPrice(basket.Discount),
                FormattedTax = FormatPrice(basket.Tax),
                FormattedTotal = FormatPrice(basket.Total),
                CurrencySymbol = _settings.CurrencySymbol,
                DisplaySubTotal = displaySubTotal,
                DisplayDiscount = displayDiscount,
                DisplayTax = displayTax,
                DisplayShipping = displayShipping,
                DisplayTotal = displayTotal,
                FormattedDisplaySubTotal = FormatDisplayPrice(displaySubTotal, currencyContext.CurrencySymbol),
                FormattedDisplayDiscount = FormatDisplayPrice(displayDiscount, currencyContext.CurrencySymbol),
                FormattedDisplayTax = FormatDisplayPrice(displayTax, currencyContext.CurrencySymbol),
                FormattedDisplayShipping = FormatDisplayPrice(displayShipping, currencyContext.CurrencySymbol),
                FormattedDisplayTotal = FormatDisplayPrice(displayTotal, currencyContext.CurrencySymbol),
                DisplayCurrencyCode = currencyContext.CurrencyCode,
                DisplayCurrencySymbol = currencyContext.CurrencySymbol,
                ExchangeRate = rate,
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

    private static string FormatDisplayPrice(decimal price, string currencySymbol)
    {
        return $"{currencySymbol}{price:N2}";
    }
}

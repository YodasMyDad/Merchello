using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Extensions;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Storefront.Services;
using Merchello.Core.Storefront.Services.Interfaces;
using Merchello.Site.Shared.Controllers;
using Merchello.Core.Storefront.Dtos;
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

    public async Task<IActionResult> Basket(Umbraco.Cms.Web.Common.PublishedModels.Basket model, CancellationToken cancellationToken = default)
    {
        var basket = await checkoutService.GetBasket(new GetBasketParameters(), cancellationToken);

        // Get full display context (currency + tax-inclusive settings)
        var displayContext = await storefrontContext.GetDisplayContextAsync(cancellationToken);
        var rate = displayContext.ExchangeRate;
        var symbol = displayContext.CurrencySymbol;

        if (basket == null || basket.LineItems.Count == 0)
        {
            ViewBag.BasketData = new StorefrontBasketDto
            {
                IsEmpty = true,
                CurrencySymbol = _settings.CurrencySymbol,
                DisplayCurrencyCode = displayContext.CurrencyCode,
                DisplayCurrencySymbol = symbol,
                ExchangeRate = rate,
                DisplayPricesIncTax = displayContext.DisplayPricesIncTax
            };
        }
        else
        {
            // Use centralized method for basket totals (includes tax-inclusive calculations)
            var displayAmounts = basket.GetDisplayAmounts(displayContext, currencyService);

            var items = basket.LineItems.Select(li =>
            {
                // Use centralized methods for line item display amounts
                var displayUnitPrice = li.GetDisplayLineItemUnitPrice(displayContext, currencyService);
                var displayLineTotal = li.GetDisplayLineItemTotal(displayContext, currencyService);

                return new StorefrontLineItemDto
                {
                    Id = li.Id,
                    Sku = li.Sku ?? "",
                    Name = li.Name ?? "",
                    ProductRootName = li.GetProductRootName(),
                    SelectedOptions = li.GetSelectedOptions()
                        .Select(o => new SelectedOptionDto
                        {
                            OptionName = o.OptionName,
                            ValueName = o.ValueName
                        }).ToList(),
                    Quantity = li.Quantity,
                    UnitPrice = li.Amount,
                    LineTotal = li.Amount * li.Quantity,
                    FormattedUnitPrice = FormatPrice(li.Amount),
                    FormattedLineTotal = FormatPrice(li.Amount * li.Quantity),
                    DisplayUnitPrice = displayUnitPrice,
                    DisplayLineTotal = displayLineTotal,
                    FormattedDisplayUnitPrice = FormatDisplayPrice(displayUnitPrice, symbol),
                    FormattedDisplayLineTotal = FormatDisplayPrice(displayLineTotal, symbol),
                    TaxRate = li.TaxRate,
                    IsTaxable = li.IsTaxable,
                    LineItemType = li.LineItemType.ToString(),
                    DependantLineItemSku = li.DependantLineItemSku
                };
            }).ToList();

            // Get availability for basket items (SSR) - pass line items to avoid duplicate basket fetch
            var availability = await storefrontContext.GetBasketAvailabilityAsync(basket.LineItems, ct: cancellationToken);
            var itemAvailability = availability.Items.ToDictionary(
                i => i.LineItemId.ToString(),
                i => new BasketItemAvailabilityDto
                {
                    CanShipToCountry = i.CanShipToLocation,
                    HasStock = i.HasStock,
                    Message = i.StatusMessage
                });

            ViewBag.BasketData = new StorefrontBasketDto
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
                DisplaySubTotal = displayAmounts.SubTotal,
                DisplayDiscount = displayAmounts.Discount,
                DisplayTax = displayAmounts.Tax,
                DisplayShipping = displayAmounts.Shipping,
                DisplayTotal = displayAmounts.Total,
                FormattedDisplaySubTotal = FormatDisplayPrice(displayAmounts.SubTotal, symbol),
                FormattedDisplayDiscount = FormatDisplayPrice(displayAmounts.Discount, symbol),
                FormattedDisplayTax = FormatDisplayPrice(displayAmounts.Tax, symbol),
                FormattedDisplayShipping = FormatDisplayPrice(displayAmounts.Shipping, symbol),
                FormattedDisplayTotal = FormatDisplayPrice(displayAmounts.Total, symbol),
                DisplayCurrencyCode = displayContext.CurrencyCode,
                DisplayCurrencySymbol = symbol,
                ExchangeRate = rate,
                // Tax-inclusive display properties (use reconciled values from DisplayAmounts)
                DisplayPricesIncTax = displayAmounts.DisplayPricesIncTax,
                TaxInclusiveDisplaySubTotal = displayAmounts.TaxInclusiveSubTotal,
                FormattedTaxInclusiveDisplaySubTotal = FormatDisplayPrice(displayAmounts.TaxInclusiveSubTotal, symbol),
                TaxInclusiveDisplayShipping = displayAmounts.TaxInclusiveShipping,
                FormattedTaxInclusiveDisplayShipping = FormatDisplayPrice(displayAmounts.TaxInclusiveShipping, symbol),
                TaxInclusiveDisplayDiscount = displayAmounts.TaxInclusiveDiscount,
                FormattedTaxInclusiveDisplayDiscount = FormatDisplayPrice(displayAmounts.TaxInclusiveDiscount, symbol),
                TaxIncludedMessage = displayAmounts.TaxIncludedMessage,
                ItemCount = basket.LineItems.Sum(li => li.Quantity),
                IsEmpty = false,
                AllItemsAvailable = availability.AllItemsAvailable,
                ItemAvailability = itemAvailability
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

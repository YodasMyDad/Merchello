using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Storefront.Services;
using Merchello.Core.Storefront.Services.Parameters;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Site.Storefront.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Merchello.Site.Storefront.Controllers;

[ApiController]
[Route("api/storefront")]
public class StorefrontApiController(
    ICheckoutService checkoutService,
    IProductService productService,
    IStorefrontContextService storefrontContext,
    ILocationsService locationsService,
    ICurrencyService currencyService,
    IOptions<MerchelloSettings> settings) : ControllerBase
{
    private readonly MerchelloSettings _settings = settings.Value;

    /// <summary>
    /// Add item to basket
    /// </summary>
    [HttpPost("basket/add")]
    public async Task<IActionResult> AddToBasket([FromBody] AddToBasketRequest request, CancellationToken ct)
    {
        // Get the product (variant)
        var product = await productService.GetProduct(new GetProductParameters
        {
            ProductId = request.ProductId,
            IncludeProductRoot = true,
            IncludeTaxGroup = true,
            NoTracking = true
        }, ct);

        if (product == null)
        {
            return BadRequest(new BasketResponse
            {
                Success = false,
                Message = "Product not found"
            });
        }

        // Check if product is available for purchase
        if (!product.AvailableForPurchase)
        {
            return BadRequest(new BasketResponse
            {
                Success = false,
                Message = "This product is currently out of stock"
            });
        }

        // Create the main product line item
        var lineItem = checkoutService.CreateLineItem(product, request.Quantity);

        // Add to basket
        await checkoutService.AddToBasket(new AddToBasketParameters
        {
            ItemToAdd = lineItem
        }, ct);

        // Handle add-ons if any
        if (request.Addons.Count > 0 && product.ProductRoot?.ProductOptions != null)
        {
            var addonOptions = product.ProductRoot.ProductOptions
                .Where(po => !po.IsVariant)
                .ToList();

            var valueLookup = addonOptions
                .SelectMany(o => o.ProductOptionValues.Select(v => (Option: o, Value: v)))
                .ToDictionary(x => x.Value.Id, x => x);

            foreach (var addon in request.Addons)
            {
                if (!valueLookup.TryGetValue(addon.ValueId, out var ov))
                    continue;

                // Create addon line item
                var addonLineItem = new LineItem
                {
                    Id = Guid.NewGuid(),
                    Name = $"{ov.Option.Name}: {ov.Value.Name}",
                    Sku = string.IsNullOrWhiteSpace(ov.Value.SkuSuffix)
                        ? $"ADDON-{ov.Value.Id.ToString()[..8]}"
                        : $"{product.Sku}-{ov.Value.SkuSuffix}",
                    DependantLineItemSku = lineItem.Sku,
                    Quantity = request.Quantity,
                    Amount = ov.Value.PriceAdjustment,
                    LineItemType = LineItemType.Addon,
                    IsTaxable = true,
                    TaxRate = product.ProductRoot.TaxGroup?.TaxPercentage ?? 20m
                };

                addonLineItem.ExtendedData["AddonOptionId"] = ov.Option.Id.ToString();
                addonLineItem.ExtendedData["AddonValueId"] = ov.Value.Id.ToString();
                addonLineItem.ExtendedData["CostAdjustment"] = ov.Value.CostAdjustment;
                addonLineItem.ExtendedData["WeightKg"] = ov.Value.WeightKg ?? 0m;

                await checkoutService.AddToBasket(new AddToBasketParameters
                {
                    ItemToAdd = addonLineItem
                }, ct);
            }
        }

        // Get updated basket to return count
        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);
        var itemCount = basket?.LineItems.Sum(li => li.Quantity) ?? 0;
        var total = basket?.Total ?? 0;

        return Ok(new BasketResponse
        {
            Success = true,
            Message = "Added to basket",
            ItemCount = itemCount,
            Total = total,
            FormattedTotal = FormatPrice(total)
        });
    }

    /// <summary>
    /// Get full basket with all line items
    /// </summary>
    [HttpGet("basket")]
    public async Task<IActionResult> GetBasket(CancellationToken ct)
    {
        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);

        // Get currency context for display conversion
        var currencyContext = await storefrontContext.GetCurrencyContextAsync(ct);
        var rate = currencyContext.ExchangeRate;

        if (basket == null || basket.LineItems.Count == 0)
        {
            return Ok(new FullBasketResponse
            {
                IsEmpty = true,
                CurrencySymbol = _settings.CurrencySymbol,
                DisplayCurrencyCode = currencyContext.CurrencyCode,
                DisplayCurrencySymbol = currencyContext.CurrencySymbol,
                ExchangeRate = rate
            });
        }

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

        return Ok(new FullBasketResponse
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
        });
    }

    /// <summary>
    /// Get basket item count
    /// </summary>
    [HttpGet("basket/count")]
    public async Task<IActionResult> GetBasketCount(CancellationToken ct)
    {
        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);
        var itemCount = basket?.LineItems.Sum(li => li.Quantity) ?? 0;
        var total = basket?.Total ?? 0;

        return Ok(new BasketCountResponse
        {
            ItemCount = itemCount,
            Total = total,
            FormattedTotal = FormatPrice(total)
        });
    }

    /// <summary>
    /// Update line item quantity
    /// </summary>
    [HttpPost("basket/update")]
    public async Task<IActionResult> UpdateQuantity([FromBody] UpdateQuantityRequest request, CancellationToken ct)
    {
        await checkoutService.UpdateLineItemQuantity(request.LineItemId, request.Quantity, null, ct);

        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);
        var itemCount = basket?.LineItems.Sum(li => li.Quantity) ?? 0;
        var total = basket?.Total ?? 0;

        return Ok(new BasketResponse
        {
            Success = true,
            Message = "Quantity updated",
            ItemCount = itemCount,
            Total = total,
            FormattedTotal = FormatPrice(total)
        });
    }

    /// <summary>
    /// Remove item from basket
    /// </summary>
    [HttpDelete("basket/{lineItemId:guid}")]
    public async Task<IActionResult> RemoveItem(Guid lineItemId, CancellationToken ct)
    {
        await checkoutService.RemoveLineItem(lineItemId, null, ct);

        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);
        var itemCount = basket?.LineItems.Sum(li => li.Quantity) ?? 0;
        var total = basket?.Total ?? 0;

        return Ok(new BasketResponse
        {
            Success = true,
            Message = "Item removed",
            ItemCount = itemCount,
            Total = total,
            FormattedTotal = FormatPrice(total)
        });
    }

    private string FormatPrice(decimal price)
    {
        return $"{_settings.CurrencySymbol}{price:N2}";
    }

    private static string FormatDisplayPrice(decimal price, string currencySymbol)
    {
        return $"{currencySymbol}{price:N2}";
    }

    #region Shipping Country Endpoints

    /// <summary>
    /// Get available shipping countries and current selection
    /// </summary>
    [HttpGet("shipping/countries")]
    public async Task<IActionResult> GetShippingCountries(CancellationToken ct)
    {
        var countries = await locationsService.GetAvailableCountriesAsync(ct);
        var current = await storefrontContext.GetShippingLocationAsync(ct);
        var currency = await storefrontContext.GetCurrencyAsync(ct);

        return Ok(new ShippingCountriesResponse
        {
            Countries = countries.Select(c => new CountryResponse
            {
                CountryCode = c.Code,
                CountryName = c.Name
            }).ToList(),
            Current = new CountryResponse
            {
                CountryCode = current.CountryCode,
                CountryName = current.CountryName
            },
            Currency = new StorefrontCurrencyResponse
            {
                CurrencyCode = currency.CurrencyCode,
                CurrencySymbol = currency.CurrencySymbol,
                DecimalPlaces = currency.DecimalPlaces
            }
        });
    }

    /// <summary>
    /// Get current shipping country preference
    /// </summary>
    [HttpGet("shipping/country")]
    public async Task<IActionResult> GetCurrentCountry(CancellationToken ct)
    {
        var location = await storefrontContext.GetShippingLocationAsync(ct);

        return Ok(new CountryResponse
        {
            CountryCode = location.CountryCode,
            CountryName = location.CountryName
        });
    }

    /// <summary>
    /// Set shipping country preference (also updates currency automatically)
    /// </summary>
    [HttpPost("shipping/country")]
    public async Task<IActionResult> SetCurrentCountry([FromBody] SetCountryRequest request, CancellationToken ct)
    {
        // Validate the country code
        var countries = await locationsService.GetAvailableCountriesAsync(ct);
        var country = countries.FirstOrDefault(c =>
            c.Code.Equals(request.CountryCode, StringComparison.OrdinalIgnoreCase));

        if (country == null)
        {
            return BadRequest(new { message = "Invalid country code" });
        }

        // This also sets the currency cookie automatically
        storefrontContext.SetShippingCountry(request.CountryCode, request.RegionCode);

        // Get the new currency to return
        var currency = await storefrontContext.GetCurrencyAsync(ct);

        return Ok(new SetCountryResponse
        {
            CountryCode = country.Code,
            CountryName = country.Name,
            CurrencyCode = currency.CurrencyCode,
            CurrencySymbol = currency.CurrencySymbol
        });
    }

    /// <summary>
    /// Get current storefront currency
    /// </summary>
    [HttpGet("currency")]
    public async Task<IActionResult> GetCurrency(CancellationToken ct)
    {
        var currency = await storefrontContext.GetCurrencyAsync(ct);

        return Ok(new StorefrontCurrencyResponse
        {
            CurrencyCode = currency.CurrencyCode,
            CurrencySymbol = currency.CurrencySymbol,
            DecimalPlaces = currency.DecimalPlaces
        });
    }

    /// <summary>
    /// Override storefront currency (for testing different currencies)
    /// </summary>
    [HttpPost("currency")]
    public IActionResult SetCurrency([FromBody] SetCurrencyRequest request)
    {
        storefrontContext.SetCurrency(request.CurrencyCode);

        var currencyInfo = currencyService.GetCurrency(request.CurrencyCode);

        return Ok(new StorefrontCurrencyResponse
        {
            CurrencyCode = currencyInfo.Code,
            CurrencySymbol = currencyInfo.Symbol,
            DecimalPlaces = currencyInfo.DecimalPlaces
        });
    }

    /// <summary>
    /// Get regions for a country
    /// </summary>
    [HttpGet("shipping/countries/{countryCode}/regions")]
    public async Task<IActionResult> GetRegions(string countryCode, CancellationToken ct)
    {
        var regions = await locationsService.GetAvailableRegionsAsync(countryCode, ct);

        return Ok(regions.Select(r => new RegionResponse
        {
            RegionCode = r.RegionCode,
            RegionName = r.Name
        }).ToList());
    }

    /// <summary>
    /// Check product availability for a country/region
    /// </summary>
    [HttpGet("products/{productId:guid}/availability")]
    public async Task<IActionResult> GetProductAvailability(
        Guid productId,
        [FromQuery] string? countryCode,
        [FromQuery] string? regionCode,
        [FromQuery] int quantity = 1,
        CancellationToken ct = default)
    {
        var product = await productService.GetProduct(new GetProductParameters
        {
            ProductId = productId,
            IncludeProductRoot = true,
            IncludeProductWarehouses = true,
            NoTracking = true
        }, ct);

        if (product == null)
        {
            return NotFound(new { message = "Product not found" });
        }

        var availability = string.IsNullOrWhiteSpace(countryCode)
            ? await storefrontContext.GetProductAvailabilityAsync(product, quantity, ct)
            : await storefrontContext.GetProductAvailabilityForLocationAsync(new ProductAvailabilityParameters
            {
                Product = product,
                CountryCode = countryCode,
                RegionCode = regionCode,
                Quantity = quantity
            }, ct);

        return Ok(new ProductAvailabilityResponse
        {
            CanShipToCountry = availability.CanShipToLocation,
            HasStock = availability.HasStock,
            AvailableStock = availability.AvailableStock,
            Message = availability.StatusMessage,
            ShowStockLevels = availability.ShowStockLevels
        });
    }

    /// <summary>
    /// Check availability for all basket items
    /// </summary>
    [HttpGet("basket/availability")]
    public async Task<IActionResult> GetBasketAvailability(
        [FromQuery] string? countryCode,
        [FromQuery] string? regionCode,
        CancellationToken ct = default)
    {
        var availability = await storefrontContext.GetBasketAvailabilityAsync(countryCode, regionCode, ct);

        return Ok(new BasketAvailabilityResponse
        {
            AllItemsAvailable = availability.AllItemsAvailable,
            Items = availability.Items.Select(item => new BasketItemAvailability
            {
                LineItemId = item.LineItemId,
                ProductId = item.ProductId,
                CanShipToCountry = item.CanShipToLocation,
                HasStock = item.HasStock,
                Message = item.StatusMessage
            }).ToList()
        });
    }

    #endregion
}

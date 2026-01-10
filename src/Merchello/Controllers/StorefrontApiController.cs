using Merchello.Core;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Core.Storefront.Dtos;
using Merchello.Core.Storefront.Services;
using Merchello.Core.Storefront.Services.Parameters;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Merchello.Controllers;

/// <summary>
/// API controller for storefront operations (basket, country/currency, availability).
/// </summary>
[ApiController]
[Route("api/merchello/storefront")]
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
    public async Task<IActionResult> AddToBasket([FromBody] AddToBasketDto request, CancellationToken ct)
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
            return BadRequest(new BasketOperationResultDto
            {
                Success = false,
                Message = "Product not found"
            });
        }

        // Check if product is available for purchase
        if (!product.AvailableForPurchase)
        {
            return BadRequest(new BasketOperationResultDto
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

        return Ok(new BasketOperationResultDto
        {
            Success = true,
            Message = "Added to basket",
            ItemCount = itemCount,
            Total = total,
            FormattedTotal = total.FormatWithSymbol(_settings.CurrencySymbol)
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
            return Ok(new StorefrontBasketDto
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

            return new StorefrontLineItemDto
            {
                Id = li.Id,
                Sku = li.Sku ?? "",
                Name = li.Name ?? "",
                Quantity = li.Quantity,
                UnitPrice = li.Amount,
                LineTotal = li.Amount * li.Quantity,
                FormattedUnitPrice = li.Amount.FormatWithSymbol(_settings.CurrencySymbol),
                FormattedLineTotal = (li.Amount * li.Quantity).FormatWithSymbol(_settings.CurrencySymbol),
                DisplayUnitPrice = displayUnitPrice,
                DisplayLineTotal = displayLineTotal,
                FormattedDisplayUnitPrice = displayUnitPrice.FormatWithSymbol(currencyContext.CurrencySymbol),
                FormattedDisplayLineTotal = displayLineTotal.FormatWithSymbol(currencyContext.CurrencySymbol),
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

        return Ok(new StorefrontBasketDto
        {
            Items = items,
            SubTotal = basket.SubTotal,
            Discount = basket.Discount,
            Tax = basket.Tax,
            Shipping = basket.Shipping,
            Total = basket.Total,
            FormattedSubTotal = basket.SubTotal.FormatWithSymbol(_settings.CurrencySymbol),
            FormattedDiscount = basket.Discount.FormatWithSymbol(_settings.CurrencySymbol),
            FormattedTax = basket.Tax.FormatWithSymbol(_settings.CurrencySymbol),
            FormattedTotal = basket.Total.FormatWithSymbol(_settings.CurrencySymbol),
            CurrencySymbol = _settings.CurrencySymbol,
            DisplaySubTotal = displaySubTotal,
            DisplayDiscount = displayDiscount,
            DisplayTax = displayTax,
            DisplayShipping = displayShipping,
            DisplayTotal = displayTotal,
            FormattedDisplaySubTotal = displaySubTotal.FormatWithSymbol(currencyContext.CurrencySymbol),
            FormattedDisplayDiscount = displayDiscount.FormatWithSymbol(currencyContext.CurrencySymbol),
            FormattedDisplayTax = displayTax.FormatWithSymbol(currencyContext.CurrencySymbol),
            FormattedDisplayShipping = displayShipping.FormatWithSymbol(currencyContext.CurrencySymbol),
            FormattedDisplayTotal = displayTotal.FormatWithSymbol(currencyContext.CurrencySymbol),
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

        return Ok(new BasketCountDto
        {
            ItemCount = itemCount,
            Total = total,
            FormattedTotal = total.FormatWithSymbol(_settings.CurrencySymbol)
        });
    }

    /// <summary>
    /// Update line item quantity
    /// </summary>
    [HttpPost("basket/update")]
    public async Task<IActionResult> UpdateQuantity([FromBody] UpdateQuantityDto request, CancellationToken ct)
    {
        await checkoutService.UpdateLineItemQuantity(request.LineItemId, request.Quantity, null, ct);

        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);
        var itemCount = basket?.LineItems.Sum(li => li.Quantity) ?? 0;
        var total = basket?.Total ?? 0;

        return Ok(new BasketOperationResultDto
        {
            Success = true,
            Message = "Quantity updated",
            ItemCount = itemCount,
            Total = total,
            FormattedTotal = total.FormatWithSymbol(_settings.CurrencySymbol)
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

        return Ok(new BasketOperationResultDto
        {
            Success = true,
            Message = "Item removed",
            ItemCount = itemCount,
            Total = total,
            FormattedTotal = total.FormatWithSymbol(_settings.CurrencySymbol)
        });
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

        return Ok(new ShippingCountriesDto
        {
            Countries = countries.Select(c => new StorefrontCountryDto
            {
                CountryCode = c.Code,
                CountryName = c.Name
            }).ToList(),
            Current = new StorefrontCountryDto
            {
                CountryCode = current.CountryCode,
                CountryName = current.CountryName
            },
            CurrentRegionCode = current.RegionCode,
            CurrentRegionName = current.RegionName,
            Currency = new StorefrontCurrencyDto
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

        return Ok(new StorefrontCountryDto
        {
            CountryCode = location.CountryCode,
            CountryName = location.CountryName
        });
    }

    /// <summary>
    /// Set shipping country preference. Also updates currency automatically and converts basket amounts.
    /// </summary>
    [HttpPost("shipping/country")]
    public async Task<IActionResult> SetCurrentCountry([FromBody] SetCountryDto request, CancellationToken ct)
    {
        // Validate the country code
        var countries = await locationsService.GetAvailableCountriesAsync(ct);
        var country = countries.FirstOrDefault(c =>
            c.Code.Equals(request.CountryCode, StringComparison.OrdinalIgnoreCase));

        if (country == null)
        {
            return BadRequest(new { message = "Invalid country code" });
        }

        // This sets the currency cookie automatically based on country-to-currency mapping
        storefrontContext.SetShippingCountry(request.CountryCode, request.RegionCode);

        // Get the new currency that was set
        var currency = await storefrontContext.GetCurrencyAsync(ct);

        // Convert basket to new currency (if basket exists and has items)
        var conversionResult = await checkoutService.ConvertBasketCurrencyAsync(
            new ConvertBasketCurrencyParameters { NewCurrencyCode = currency.CurrencyCode },
            ct);

        if (!conversionResult.Successful)
        {
            return BadRequest(new { message = conversionResult.Messages.FirstOrDefault()?.Message ?? "Currency change failed" });
        }

        return Ok(new SetCountryResultDto
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

        return Ok(new StorefrontCurrencyDto
        {
            CurrencyCode = currency.CurrencyCode,
            CurrencySymbol = currency.CurrencySymbol,
            DecimalPlaces = currency.DecimalPlaces
        });
    }

    /// <summary>
    /// Override storefront currency. If basket has items, converts all amounts to the new currency.
    /// </summary>
    [HttpPost("currency")]
    public async Task<IActionResult> SetCurrency([FromBody] SetCurrencyDto request, CancellationToken ct)
    {
        // Convert basket to new currency (if basket exists and has items)
        var conversionResult = await checkoutService.ConvertBasketCurrencyAsync(
            new ConvertBasketCurrencyParameters { NewCurrencyCode = request.CurrencyCode },
            ct);

        if (!conversionResult.Successful)
        {
            return BadRequest(new { message = conversionResult.Messages.FirstOrDefault()?.Message ?? "Currency change failed" });
        }

        // Set the currency cookie for future requests
        storefrontContext.SetCurrency(request.CurrencyCode);

        var currencyInfo = currencyService.GetCurrency(request.CurrencyCode);

        return Ok(new StorefrontCurrencyDto
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

        return Ok(regions.Select(r => new StorefrontRegionDto
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

        return Ok(new ProductAvailabilityDto
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

        return Ok(new BasketAvailabilityDto
        {
            AllItemsAvailable = availability.AllItemsAvailable,
            Items = availability.Items.Select(item => new BasketItemAvailabilityDetailDto
            {
                LineItemId = item.LineItemId,
                ProductId = item.ProductId,
                CanShipToCountry = item.CanShipToLocation,
                HasStock = item.HasStock,
                Message = item.StatusMessage
            }).ToList()
        });
    }

    /// <summary>
    /// Get estimated shipping cost for the basket based on country/region.
    /// Auto-selects the cheapest shipping option per warehouse group.
    /// </summary>
    [HttpGet("basket/estimated-shipping")]
    public async Task<IActionResult> GetEstimatedShipping(
        [FromQuery] string? countryCode,
        [FromQuery] string? regionCode,
        CancellationToken ct = default)
    {
        // Use current storefront location if not specified
        if (string.IsNullOrWhiteSpace(countryCode))
        {
            var location = await storefrontContext.GetShippingLocationAsync(ct);
            countryCode = location.CountryCode;
            regionCode ??= location.RegionCode;
        }

        if (string.IsNullOrWhiteSpace(countryCode))
        {
            return Ok(new EstimatedShippingDto
            {
                Success = false,
                Message = "No shipping location available"
            });
        }

        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);
        if (basket == null || basket.LineItems.Count == 0)
        {
            return Ok(new EstimatedShippingDto
            {
                Success = false,
                Message = "Basket is empty"
            });
        }

        // Create minimal checkout session with shipping address
        var session = new CheckoutSession
        {
            BasketId = basket.Id,
            ShippingAddress = new Address
            {
                CountryCode = countryCode,
                CountyState = new CountyState
                {
                    RegionCode = regionCode
                }
            }
        };

        // Get order groups with shipping options
        var groupingResult = await checkoutService.GetOrderGroupsAsync(basket, session, ct);
        if (!groupingResult.Success || groupingResult.Groups.Count == 0)
        {
            return Ok(new EstimatedShippingDto
            {
                Success = false,
                Message = groupingResult.Errors.FirstOrDefault() ?? "Unable to calculate shipping"
            });
        }

        // Auto-select cheapest option for each group
        var selections = ShippingAutoSelector.SelectOptions(groupingResult.Groups, ShippingAutoSelectStrategy.Cheapest);
        var estimatedShipping = ShippingAutoSelector.CalculateCombinedTotal(groupingResult.Groups, selections);

        // Update basket with estimated shipping so basket.Total is consistent
        // This ensures GetBasket and GetEstimatedShipping return aligned totals
        await checkoutService.CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = countryCode,
            ShippingAmountOverride = estimatedShipping
        }, ct);

        // Get currency context for display conversion
        var currencyContext = await storefrontContext.GetCurrencyContextAsync(ct);
        var rate = currencyContext.ExchangeRate;
        var displayEstimatedShipping = currencyService.Round(estimatedShipping * rate, currencyContext.CurrencyCode);

        return Ok(new EstimatedShippingDto
        {
            Success = true,
            EstimatedShipping = estimatedShipping,
            FormattedEstimatedShipping = estimatedShipping.FormatWithSymbol(_settings.CurrencySymbol),
            DisplayEstimatedShipping = displayEstimatedShipping,
            FormattedDisplayEstimatedShipping = displayEstimatedShipping.FormatWithSymbol(currencyContext.CurrencySymbol),
            GroupCount = groupingResult.Groups.Count
        });
    }

    #endregion
}

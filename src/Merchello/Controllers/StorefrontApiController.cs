using Merchello.Core;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Shared.Dtos;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Storefront.Dtos;
using Merchello.Core.Storefront.Models;
using Merchello.Core.Storefront.Services;
using Merchello.Core.Storefront.Services.Interfaces;
using Merchello.Core.Storefront.Services.Parameters;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Parameters;
using Merchello.Services;
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
    IStorefrontContextService storefrontContext,
    IProductService productService,
    ILocationsService locationsService,
    ICurrencyService currencyService,
    IStorefrontDtoMapper storefrontDtoMapper,
    IOptions<MerchelloSettings> settings) : ControllerBase
{
    private readonly MerchelloSettings _settings = settings.Value;

    /// <summary>
    /// Add item to basket
    /// </summary>
    [HttpPost("basket/add")]
    public async Task<IActionResult> AddToBasket([FromBody] AddToBasketDto request, CancellationToken ct)
    {
        // Use centralized service for adding products with addons
        var result = await checkoutService.AddProductWithAddonsAsync(new AddProductWithAddonsParameters
        {
            ProductId = request.ProductId,
            Quantity = request.Quantity,
            Addons = request.Addons.ToList()
        }, ct);

        if (!result.Success)
        {
            return BadRequest(
                storefrontDtoMapper.MapBasketOperationResult(
                    false,
                    result.ErrorMessage ?? "Failed to add item to basket",
                    null,
                    _settings.CurrencySymbol));
        }

        return Ok(
            storefrontDtoMapper.MapBasketOperationResult(
                true,
                "Added to basket",
                result.Basket,
                _settings.CurrencySymbol));
    }

    /// <summary>
    /// Get full basket with all line items
    /// </summary>
    [HttpGet("basket")]
    public async Task<IActionResult> GetBasket(
        CancellationToken ct,
        [FromQuery] bool includeAvailability = false,
        [FromQuery] string? countryCode = null,
        [FromQuery] string? regionCode = null)
    {
        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);
        var displayContext = await storefrontContext.GetDisplayContextAsync(ct);

        if (!includeAvailability || basket == null || basket.LineItems.Count == 0)
        {
            return Ok(storefrontDtoMapper.MapBasket(basket, displayContext, _settings.CurrencySymbol));
        }

        var availability = await storefrontContext.GetBasketAvailabilityAsync(
            basket.LineItems,
            countryCode,
            regionCode,
            ct);

        return Ok(storefrontDtoMapper.MapBasket(basket, displayContext, _settings.CurrencySymbol, availability));
    }

    /// <summary>
    /// Get basket item count
    /// </summary>
    [HttpGet("basket/count")]
    public async Task<IActionResult> GetBasketCount(CancellationToken ct)
    {
        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);
        return Ok(storefrontDtoMapper.MapBasketCount(basket, _settings.CurrencySymbol));
    }

    /// <summary>
    /// Update line item quantity
    /// </summary>
    [HttpPost("basket/update")]
    public async Task<IActionResult> UpdateQuantity([FromBody] UpdateQuantityDto request, CancellationToken ct)
    {
        await checkoutService.UpdateLineItemQuantity(request.LineItemId, request.Quantity, null, ct);

        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);
        return Ok(
            storefrontDtoMapper.MapBasketOperationResult(
                true,
                "Quantity updated",
                basket,
                _settings.CurrencySymbol));
    }

    /// <summary>
    /// Remove item from basket
    /// </summary>
    [HttpDelete("basket/{lineItemId:guid}")]
    public async Task<IActionResult> RemoveItem(Guid lineItemId, CancellationToken ct)
    {
        await checkoutService.RemoveLineItem(lineItemId, null, ct);

        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);
        return Ok(
            storefrontDtoMapper.MapBasketOperationResult(
                true,
                "Item removed",
                basket,
                _settings.CurrencySymbol));
    }

    /// <summary>
    /// Clear the current basket (headless convenience endpoint).
    /// </summary>
    [HttpPost("basket/clear")]
    public async Task<IActionResult> ClearBasket(CancellationToken ct)
    {
        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);
        if (basket != null)
        {
            await checkoutService.DeleteBasket(basket.Id, ct);
        }

        return Ok(
            storefrontDtoMapper.MapBasketOperationResult(
                true,
                "Basket cleared",
                null,
                _settings.CurrencySymbol));
    }


    #region Shipping Country Endpoints

    /// <summary>
    /// Get available shipping countries and current selection
    /// </summary>
    [HttpGet("shipping/countries")]
    public async Task<IActionResult> GetShippingCountries(CancellationToken ct)
    {
        var countries = await locationsService.GetAvailableCountriesAsync(
            new GetAvailableCountriesParameters(),
            ct);
        var current = await storefrontContext.GetShippingLocationAsync(ct);
        var currency = await storefrontContext.GetCurrencyAsync(ct);

        return Ok(storefrontDtoMapper.MapShippingCountries(countries, current, currency));
    }

    /// <summary>
    /// Headless bootstrap endpoint returning location, currency, and basket summary in one call.
    /// </summary>
    [HttpGet("context")]
    public async Task<IActionResult> GetContext(CancellationToken ct)
    {
        var location = await storefrontContext.GetShippingLocationAsync(ct);
        var currency = await storefrontContext.GetCurrencyAsync(ct);
        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);

        return Ok(storefrontDtoMapper.MapStorefrontContext(
            location,
            currency,
            basket,
            _settings.CurrencySymbol));
    }

    /// <summary>
    /// Get current shipping country preference
    /// </summary>
    [HttpGet("shipping/country")]
    public async Task<IActionResult> GetCurrentCountry(CancellationToken ct)
    {
        var location = await storefrontContext.GetShippingLocationAsync(ct);

        return Ok(new CountryDto
        {
            Code = location.CountryCode,
            Name = location.CountryName
        });
    }

    /// <summary>
    /// Set shipping country preference. Also updates currency automatically and converts basket amounts.
    /// </summary>
    [HttpPost("shipping/country")]
    public async Task<IActionResult> SetCurrentCountry([FromBody] SetCountryDto request, CancellationToken ct)
    {
        // Validate the country code
        var countries = await locationsService.GetAvailableCountriesAsync(
            new GetAvailableCountriesParameters(),
            ct);
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

        if (!conversionResult.Success)
        {
            return BadRequest(new { message = conversionResult.Messages.FirstOrDefault()?.Message ?? "Currency change failed" });
        }

        return Ok(storefrontDtoMapper.MapSetCountryResult(country, currency));
    }

    /// <summary>
    /// Get current storefront currency
    /// </summary>
    [HttpGet("currency")]
    public async Task<IActionResult> GetCurrency(CancellationToken ct)
    {
        var currency = await storefrontContext.GetCurrencyAsync(ct);
        return Ok(storefrontDtoMapper.MapCurrency(currency));
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

        if (!conversionResult.Success)
        {
            return BadRequest(new { message = conversionResult.Messages.FirstOrDefault()?.Message ?? "Currency change failed" });
        }

        // Set the currency cookie for future requests
        storefrontContext.SetCurrency(request.CurrencyCode);

        var currencyInfo = currencyService.GetCurrency(request.CurrencyCode);

        return Ok(storefrontDtoMapper.MapCurrency(new StorefrontCurrency(
            currencyInfo.Code,
            currencyInfo.Symbol,
            currencyInfo.DecimalPlaces)));
    }

    /// <summary>
    /// Get regions for a country
    /// </summary>
    [HttpGet("shipping/countries/{countryCode}/regions")]
    public async Task<IActionResult> GetRegions(string countryCode, CancellationToken ct)
    {
        var regions = await locationsService.GetAvailableRegionsAsync(
            new GetAvailableRegionsParameters { CountryCode = countryCode },
            ct);
        return Ok(storefrontDtoMapper.MapRegions(countryCode, regions));
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

        return Ok(storefrontDtoMapper.MapProductAvailability(availability));
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

        return Ok(storefrontDtoMapper.MapBasketAvailability(availability));
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
            return Ok(storefrontDtoMapper.MapEstimatedShippingFailure("No shipping location available"));
        }

        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);
        if (basket == null)
        {
            return Ok(storefrontDtoMapper.MapEstimatedShippingFailure("Basket is empty"));
        }

        // Delegate to service for shipping estimation (business logic now centralized)
        var result = await checkoutService.GetEstimatedShippingAsync(new GetEstimatedShippingParameters
        {
            Basket = basket,
            CountryCode = countryCode,
            RegionCode = regionCode
        }, ct);

        if (!result.Success)
        {
            return Ok(storefrontDtoMapper.MapEstimatedShippingFailure(result.ErrorMessage));
        }

        var displayContext = await storefrontContext.GetDisplayContextAsync(ct);
        return Ok(storefrontDtoMapper.MapEstimatedShippingSuccess(
            result,
            basket,
            displayContext,
            _settings.CurrencySymbol));
    }

    #endregion
}

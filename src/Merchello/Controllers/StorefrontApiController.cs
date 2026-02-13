using Merchello.Core;
using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Extensions;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Parameters;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Storefront.Dtos;
using Merchello.Core.Shared.Dtos;
using Merchello.Core.Storefront.Services;
using Merchello.Core.Storefront.Services.Interfaces;
using Merchello.Core.Storefront.Services.Parameters;
using Merchello.Core.Shared.Providers;
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
    ICurrencyConversionService currencyConversion,
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
            return BadRequest(new BasketOperationResultDto
            {
                Success = false,
                Message = result.ErrorMessage ?? "Failed to add item to basket"
            });
        }

        return Ok(new BasketOperationResultDto
        {
            Success = true,
            Message = "Added to basket",
            ItemCount = result.ItemCount,
            Total = result.Total,
            FormattedTotal = result.Total.FormatWithSymbol(_settings.CurrencySymbol)
        });
    }

    /// <summary>
    /// Get full basket with all line items
    /// </summary>
    [HttpGet("basket")]
    public async Task<IActionResult> GetBasket(CancellationToken ct)
    {
        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);

        // Get full display context for currency conversion and tax-inclusive settings
        var displayContext = await storefrontContext.GetDisplayContextAsync(ct);
        var rate = displayContext.ExchangeRate;
        var symbol = displayContext.CurrencySymbol;

        if (basket == null || basket.LineItems.Count == 0)
        {
            return Ok(new StorefrontBasketDto
            {
                IsEmpty = true,
                CurrencySymbol = _settings.CurrencySymbol,
                DisplayCurrencyCode = displayContext.CurrencyCode,
                DisplayCurrencySymbol = symbol,
                ExchangeRate = rate,
                DisplayPricesIncTax = displayContext.DisplayPricesIncTax
            });
        }

        // Use centralized method for basket totals (includes tax-inclusive calculations)
        var displayAmounts = basket.GetDisplayAmounts(displayContext, currencyService);

        // Use centralized currency conversion service for line items
        var items = basket.LineItems.Select(li =>
        {
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
                FormattedUnitPrice = currencyConversion.Format(li.Amount, _settings.CurrencySymbol),
                FormattedLineTotal = currencyConversion.Format(li.Amount * li.Quantity, _settings.CurrencySymbol),
                DisplayUnitPrice = displayUnitPrice,
                DisplayLineTotal = displayLineTotal,
                FormattedDisplayUnitPrice = currencyConversion.Format(displayUnitPrice, symbol),
                FormattedDisplayLineTotal = currencyConversion.Format(displayLineTotal, symbol),
                LineItemType = li.LineItemType.ToString(),
                DependantLineItemSku = li.DependantLineItemSku,
                ParentLineItemId = li.GetParentLineItemId()?.ToString()
            };
        }).ToList();

        return Ok(new StorefrontBasketDto
        {
            Items = items,
            SubTotal = basket.SubTotal,
            Discount = basket.Discount,
            Tax = basket.Tax,
            Shipping = basket.Shipping,
            Total = basket.Total,
            FormattedSubTotal = currencyConversion.Format(basket.SubTotal, _settings.CurrencySymbol),
            FormattedDiscount = currencyConversion.Format(basket.Discount, _settings.CurrencySymbol),
            FormattedTax = currencyConversion.Format(basket.Tax, _settings.CurrencySymbol),
            FormattedTotal = currencyConversion.Format(basket.Total, _settings.CurrencySymbol),
            CurrencySymbol = _settings.CurrencySymbol,
            DisplaySubTotal = displayAmounts.SubTotal,
            DisplayDiscount = displayAmounts.Discount,
            DisplayTax = displayAmounts.Tax,
            DisplayShipping = displayAmounts.Shipping,
            DisplayTotal = displayAmounts.Total,
            FormattedDisplaySubTotal = currencyConversion.Format(displayAmounts.SubTotal, symbol),
            FormattedDisplayDiscount = currencyConversion.Format(displayAmounts.Discount, symbol),
            FormattedDisplayTax = currencyConversion.Format(displayAmounts.Tax, symbol),
            FormattedDisplayShipping = currencyConversion.Format(displayAmounts.Shipping, symbol),
            FormattedDisplayTotal = currencyConversion.Format(displayAmounts.Total, symbol),
            DisplayCurrencyCode = displayContext.CurrencyCode,
            DisplayCurrencySymbol = symbol,
            ExchangeRate = rate,
            // Tax-inclusive display properties (use reconciled values from DisplayAmounts)
            DisplayPricesIncTax = displayAmounts.DisplayPricesIncTax,
            TaxInclusiveDisplaySubTotal = displayAmounts.TaxInclusiveSubTotal,
            FormattedTaxInclusiveDisplaySubTotal = currencyConversion.Format(displayAmounts.TaxInclusiveSubTotal, symbol),
            TaxInclusiveDisplayShipping = displayAmounts.TaxInclusiveShipping,
            FormattedTaxInclusiveDisplayShipping = currencyConversion.Format(displayAmounts.TaxInclusiveShipping, symbol),
            TaxInclusiveDisplayDiscount = displayAmounts.TaxInclusiveDiscount,
            FormattedTaxInclusiveDisplayDiscount = currencyConversion.Format(displayAmounts.TaxInclusiveDiscount, symbol),
            TaxIncludedMessage = displayAmounts.TaxIncludedMessage,
            ItemCount = basket.ItemCount,
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
        var itemCount = basket?.ItemCount ?? 0;
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
        var itemCount = basket?.ItemCount ?? 0;
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
        var itemCount = basket?.ItemCount ?? 0;
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
        var countries = await locationsService.GetAvailableCountriesAsync(
            new GetAvailableCountriesParameters(),
            ct);
        var current = await storefrontContext.GetShippingLocationAsync(ct);
        var currency = await storefrontContext.GetCurrencyAsync(ct);

        return Ok(new ShippingCountriesDto
        {
            Countries = countries.Select(c => new CountryDto
            {
                Code = c.Code,
                Name = c.Name
            }).ToList(),
            Current = new CountryDto
            {
                Code = current.CountryCode,
                Name = current.CountryName
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

        if (!conversionResult.Success)
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
        var regions = await locationsService.GetAvailableRegionsAsync(
            new GetAvailableRegionsParameters { CountryCode = countryCode },
            ct);

        return Ok(regions.Select(r => new RegionDto
        {
            CountryCode = countryCode,
            RegionCode = r.RegionCode,
            Name = r.Name
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
        if (basket == null)
        {
            return Ok(new EstimatedShippingDto
            {
                Success = false,
                Message = "Basket is empty"
            });
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
            return Ok(new EstimatedShippingDto
            {
                Success = false,
                Message = result.ErrorMessage
            });
        }

        // Get full display context for currency conversion and tax-inclusive settings
        var displayContext = await storefrontContext.GetDisplayContextAsync(ct);
        var symbol = displayContext.CurrencySymbol;

        // Use centralized method for basket totals (includes tax-inclusive calculations)
        var displayAmounts = basket.GetDisplayAmounts(displayContext, currencyService);
        var displayEstimatedShipping = currencyConversion.Convert(result.EstimatedShipping, displayContext.ExchangeRate, displayContext.CurrencyCode);

        return Ok(new EstimatedShippingDto
        {
            Success = true,
            EstimatedShipping = result.EstimatedShipping,
            FormattedEstimatedShipping = currencyConversion.Format(result.EstimatedShipping, _settings.CurrencySymbol),
            DisplayEstimatedShipping = displayEstimatedShipping,
            FormattedDisplayEstimatedShipping = currencyConversion.Format(displayEstimatedShipping, symbol),
            DisplayTotal = displayAmounts.Total,
            FormattedDisplayTotal = currencyConversion.Format(displayAmounts.Total, symbol),
            DisplayTax = displayAmounts.Tax,
            FormattedDisplayTax = currencyConversion.Format(displayAmounts.Tax, symbol),
            // Tax-inclusive display properties (use reconciled values from DisplayAmounts)
            DisplayPricesIncTax = displayAmounts.DisplayPricesIncTax,
            TaxInclusiveDisplaySubTotal = displayAmounts.TaxInclusiveSubTotal,
            FormattedTaxInclusiveDisplaySubTotal = currencyConversion.Format(displayAmounts.TaxInclusiveSubTotal, symbol),
            TaxInclusiveDisplayShipping = displayAmounts.TaxInclusiveShipping,
            FormattedTaxInclusiveDisplayShipping = currencyConversion.Format(displayAmounts.TaxInclusiveShipping, symbol),
            TaxInclusiveDisplayDiscount = displayAmounts.TaxInclusiveDiscount,
            FormattedTaxInclusiveDisplayDiscount = currencyConversion.Format(displayAmounts.TaxInclusiveDiscount, symbol),
            TaxIncludedMessage = displayAmounts.TaxIncludedMessage,
            GroupCount = result.GroupCount
        });
    }

    #endregion
}

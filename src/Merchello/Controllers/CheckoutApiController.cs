using Merchello.Core;
using Merchello.Core.AddressLookup.Dtos;
using Merchello.Core.AddressLookup.Services.Interfaces;
using Merchello.Core.AddressLookup.Services.Parameters;
using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Extensions;
using Merchello.Core.Shared.Dtos;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Locality.Dtos;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Customers.Services.Parameters;
using Merchello.Core.Shared.RateLimiting.Interfaces;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Storefront.Models;
using Merchello.Core.Storefront.Services;
using Merchello.Core.Storefront.Services.Interfaces;
using Merchello.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.Razor;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Merchello.Controllers;

/// <summary>
/// API controller for checkout operations.
/// </summary>
[ApiController]
[Route("api/merchello/checkout")]
public class CheckoutApiController(
    ICheckoutService checkoutService,
    ICheckoutSessionService checkoutSessionService,
    ICheckoutValidator checkoutValidator,
    ICheckoutMemberService checkoutMemberService,
    ICheckoutDiscountService checkoutDiscountService,
    IAddressLookupService addressLookupService,
    IRateLimiter rateLimiter,
    IStorefrontContextService storefrontContext,
    ICheckoutDtoMapper checkoutDtoMapper,
    ICurrencyConversionService currencyConversion,
    ICurrencyService currencyService,
    IOptions<MerchelloSettings> merchelloSettings,
    ILogger<CheckoutApiController> logger,
    IAbandonedCheckoutService? abandonedCheckoutService = null,
    ICustomerService? customerService = null) : ControllerBase
{
    private readonly MerchelloSettings _settings = merchelloSettings.Value;

    private const int MaxRecoveryAttemptsPerMinute = 10;
    private static readonly TimeSpan RecoveryRateLimitWindow = TimeSpan.FromMinutes(1);
    private const int MaxCheckEmailAttemptsPerMinute = 10;
    private static readonly TimeSpan CheckEmailRateLimitWindow = TimeSpan.FromMinutes(1);
    private const int MaxAddressLookupSuggestionsPerMinute = 30;
    private const int MaxAddressLookupResolvesPerMinute = 20;
    private static readonly TimeSpan AddressLookupRateLimitWindow = TimeSpan.FromMinutes(1);

    /// <summary>
    /// Get the current basket with formatted totals.
    /// </summary>
    [HttpGet("basket")]
    public async Task<IActionResult> GetBasket(CancellationToken ct)
    {
        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);
        var currencyContext = await storefrontContext.GetCurrencyContextAsync(ct);

        if (basket == null || basket.LineItems.Count == 0)
        {
            return Ok(new CheckoutBasketDto
            {
                IsEmpty = true,
                CurrencySymbol = _settings.CurrencySymbol,
                DisplayCurrencyCode = currencyContext.CurrencyCode,
                DisplayCurrencySymbol = currencyContext.CurrencySymbol,
                ExchangeRate = currencyContext.ExchangeRate
            });
        }

        return Ok(await checkoutDtoMapper.MapBasketToDtoWithCurrencyAsync(basket, ct));
    }

    /// <summary>
    /// Get available countries for shipping (based on warehouse service regions).
    /// </summary>
    [HttpGet("shipping/countries")]
    public async Task<IActionResult> GetShippingCountries(CancellationToken ct)
    {
        var countries = await checkoutService.GetAvailableCountriesAsync(
            new GetAvailableShippingCountriesParameters(),
            ct);
        var dtos = countries.Select(c => new CountryDto { Code = c.Code, Name = c.Name }).ToList();
        return Ok(dtos);
    }

    /// <summary>
    /// Get available regions for shipping in a country (based on warehouse service regions).
    /// </summary>
    [HttpGet("shipping/regions/{countryCode}")]
    public async Task<IActionResult> GetShippingRegions(string countryCode, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(countryCode))
        {
            return BadRequest("Country code is required.");
        }

        var regions = await checkoutService.GetAvailableRegionsAsync(
            new GetAvailableShippingRegionsParameters { CountryCode = countryCode },
            ct);
        var dtos = regions.Select(r => new RegionDto { RegionCode = r.RegionCode, Name = r.Name }).ToList();
        return Ok(dtos);
    }

    /// <summary>
    /// Get all countries for billing (no restrictions).
    /// </summary>
    [HttpGet("billing/countries")]
    public async Task<IActionResult> GetBillingCountries(CancellationToken ct)
    {
        var countries = await checkoutService.GetAllCountriesAsync(
            new GetAvailableBillingCountriesParameters(),
            ct);
        var dtos = countries.Select(c => new CountryDto { Code = c.Code, Name = c.Name }).ToList();
        return Ok(dtos);
    }

    /// <summary>
    /// Get all regions for billing in a country (no restrictions).
    /// </summary>
    [HttpGet("billing/regions/{countryCode}")]
    public async Task<IActionResult> GetBillingRegions(string countryCode, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(countryCode))
        {
            return BadRequest("Country code is required.");
        }

        var regions = await checkoutService.GetAllRegionsAsync(
            new GetAvailableBillingRegionsParameters { CountryCode = countryCode },
            ct);
        var dtos = regions.Select(r => new RegionDto { RegionCode = r.RegionCode, Name = r.Name }).ToList();
        return Ok(dtos);
    }

    /// <summary>
    /// Save billing and shipping addresses.
    /// </summary>
    [HttpPost("addresses")]
    public async Task<IActionResult> SaveAddresses([FromBody] SaveAddressesRequestDto request, CancellationToken ct)
    {
        // Validation
        var errors = checkoutValidator.ValidateAddressRequest(request);
        if (errors.Count > 0)
        {
            return BadRequest(new SaveAddressesResponseDto
            {
                Success = false,
                Message = "Validation failed.",
                Errors = errors
            });
        }

        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);
        if (basket == null)
        {
            return BadRequest(new SaveAddressesResponseDto
            {
                Success = false,
                Message = "No basket found. Please add items to your cart first."
            });
        }

        // Delegate to service (handles address mapping, calculation, DB save, and session updates)
        var result = await checkoutService.SaveAddressesAsync(new SaveAddressesParameters
        {
            Basket = basket,
            Email = request.Email,
            BillingAddress = request.BillingAddress,
            ShippingAddress = request.ShippingAddress,
            ShippingSameAsBilling = request.ShippingSameAsBilling,
            AcceptsMarketing = request.AcceptsMarketing,
            Password = request.Password
        }, ct);

        if (!result.Success)
        {
            var errorMessage = result.Messages
                .FirstOrDefault(m => m.ResultMessageType == ResultMessageType.Error)?.Message
                ?? "Failed to save addresses.";

            return BadRequest(new SaveAddressesResponseDto
            {
                Success = false,
                Message = errorMessage
            });
        }

        logger.LogInformation("Addresses saved for basket {BasketId}", basket.Id);

        var savedShippingAddress = result.ResultObject?.ShippingAddress;
        if (savedShippingAddress != null && !string.IsNullOrWhiteSpace(savedShippingAddress.CountryCode))
        {
            storefrontContext.SetShippingCountry(
                savedShippingAddress.CountryCode,
                savedShippingAddress.CountyState?.RegionCode);
        }

        return Ok(new SaveAddressesResponseDto
        {
            Success = true,
            Message = "Addresses saved successfully.",
            Basket = await checkoutDtoMapper.MapBasketToDtoWithCurrencyAsync(result.ResultObject!, ct)
        });
    }

    /// <summary>
    /// Get address lookup configuration for the checkout UI.
    /// </summary>
    [HttpGet("address-lookup/config")]
    [ProducesResponseType<AddressLookupClientConfigDto>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAddressLookupConfig(CancellationToken ct)
    {
        var config = await addressLookupService.GetClientConfigAsync(null, ct);
        return Ok(config);
    }

    /// <summary>
    /// Get address lookup suggestions for a query.
    /// </summary>
    [HttpPost("address-lookup/suggestions")]
    [ProducesResponseType<AddressLookupSuggestionsResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetAddressLookupSuggestions(
        [FromBody] AddressLookupSuggestionsRequestDto request,
        CancellationToken ct)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Query))
        {
            return BadRequest(new AddressLookupSuggestionsResponseDto
            {
                Success = false,
                ErrorMessage = "Query is required."
            });
        }

        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var rateLimitKey = $"address-lookup:suggestions:{clientIp}";
        var rateLimitResult = rateLimiter.TryAcquire(
            rateLimitKey,
            MaxAddressLookupSuggestionsPerMinute,
            AddressLookupRateLimitWindow);

        if (!rateLimitResult.IsAllowed)
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new AddressLookupSuggestionsResponseDto
            {
                Success = false,
                ErrorMessage = "Too many address lookup requests. Please try again shortly."
            });
        }

        var result = await addressLookupService.GetSuggestionsAsync(new AddressLookupSuggestionsParameters
        {
            Query = request.Query,
            CountryCode = request.CountryCode,
            Limit = request.Limit,
            SessionId = request.SessionId
        }, ct);

        var response = new AddressLookupSuggestionsResponseDto
        {
            Success = result.Success,
            ErrorMessage = result.ErrorMessage,
            Suggestions = result.Suggestions
                .Select(s => new AddressLookupSuggestionDto
                {
                    Id = s.Id,
                    Label = s.Label,
                    Description = s.Description
                })
                .ToList()
        };

        return Ok(response);
    }

    /// <summary>
    /// Resolve an address lookup suggestion into a full address.
    /// </summary>
    [HttpPost("address-lookup/resolve")]
    [ProducesResponseType<AddressLookupResolveResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResolveAddressLookup(
        [FromBody] AddressLookupResolveRequestDto request,
        CancellationToken ct)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Id))
        {
            return BadRequest(new AddressLookupResolveResponseDto
            {
                Success = false,
                ErrorMessage = "Address id is required."
            });
        }

        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var rateLimitKey = $"address-lookup:resolve:{clientIp}";
        var rateLimitResult = rateLimiter.TryAcquire(
            rateLimitKey,
            MaxAddressLookupResolvesPerMinute,
            AddressLookupRateLimitWindow);

        if (!rateLimitResult.IsAllowed)
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new AddressLookupResolveResponseDto
            {
                Success = false,
                ErrorMessage = "Too many address lookup requests. Please try again shortly."
            });
        }

        var result = await addressLookupService.ResolveAddressAsync(new AddressLookupResolveParameters
        {
            Id = request.Id!,
            CountryCode = request.CountryCode,
            SessionId = request.SessionId
        }, ct);

        AddressLookupAddressDto? addressDto = null;
        if (result.Address != null)
        {
            addressDto = new AddressLookupAddressDto
            {
                Company = result.Address.Company,
                AddressOne = result.Address.AddressOne,
                AddressTwo = result.Address.AddressTwo,
                TownCity = result.Address.TownCity,
                CountyState = result.Address.CountyState,
                RegionCode = result.Address.RegionCode,
                PostalCode = result.Address.PostalCode,
                Country = result.Address.Country,
                CountryCode = result.Address.CountryCode
            };
        }

        return Ok(new AddressLookupResolveResponseDto
        {
            Success = result.Success,
            ErrorMessage = result.ErrorMessage,
            Address = addressDto
        });
    }

    /// <summary>
    /// Apply a discount code to the basket.
    /// </summary>
    [HttpPost("discount/apply")]
    public async Task<IActionResult> ApplyDiscount([FromBody] ApplyDiscountRequestDto request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Code))
        {
            return BadRequest(new ApplyDiscountResponseDto
            {
                Success = false,
                Message = "Discount code is required."
            });
        }

        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);
        if (basket == null)
        {
            return BadRequest(new ApplyDiscountResponseDto
            {
                Success = false,
                Message = "No basket found."
            });
        }

        var result = await checkoutDiscountService.ApplyDiscountCodeAsync(
            basket,
            request.Code.Trim(),
            basket.ShippingAddress?.CountryCode,
            ct);

        if (!result.Success)
        {
            var errorMessage = result.Messages
                .FirstOrDefault(m => m.ResultMessageType == ResultMessageType.Error)?.Message
                ?? "Failed to apply discount code.";

            return BadRequest(new ApplyDiscountResponseDto
            {
                Success = false,
                Message = errorMessage
            });
        }

        // Update per-request cache with the updated basket (automatic discounts already refreshed in service)
        var updatedBasket = result.ResultObject;
        if (updatedBasket != null)
        {
            checkoutSessionService.CacheBasket(updatedBasket);
        }

        logger.LogInformation("Discount code {Code} applied to basket {BasketId}", request.Code, basket.Id);

        return Ok(new ApplyDiscountResponseDto
        {
            Success = true,
            Message = "Discount applied successfully.",
            Basket = updatedBasket != null ? await checkoutDtoMapper.MapBasketToDtoWithCurrencyAsync(updatedBasket, ct) : null
        });
    }

    /// <summary>
    /// Initialize single-page checkout with pre-selected country/state.
    /// Auto-calculates shipping and selects the cheapest option for each group.
    /// Used for single-page checkout and express checkout flows.
    /// </summary>
    [HttpPost("initialize")]
    public async Task<IActionResult> InitializeCheckout(
        [FromBody] InitializeCheckoutRequestDto request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.CountryCode))
        {
            return BadRequest(new InitializeCheckoutResponseDto
            {
                Success = false,
                Message = "Country code is required."
            });
        }

        storefrontContext.SetShippingCountry(request.CountryCode, request.StateCode);

        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);
        if (basket == null || basket.LineItems.Count == 0)
        {
            return BadRequest(new InitializeCheckoutResponseDto
            {
                Success = false,
                Message = "No items in basket."
            });
        }

        // Sync basket currency from storefront context (centralized service method)
        var currencyCtx = await storefrontContext.GetCurrencyContextAsync(ct);
        basket = await checkoutService.EnsureBasketCurrencyAsync(new EnsureBasketCurrencyParameters
        {
            Basket = basket,
            CurrencyCode = currencyCtx.CurrencyCode,
            CurrencySymbol = currencyCtx.CurrencySymbol
        }, ct);

        var result = await checkoutService.InitializeCheckoutAsync(new InitializeCheckoutParameters
        {
            Basket = basket,
            CountryCode = request.CountryCode,
            StateCode = request.StateCode,
            AutoSelectShipping = request.AutoSelectShipping,
            Email = request.Email,
            PreviousShippingSelections = request.PreviousShippingSelections
        }, ct);

        if (!result.Success)
        {
            var errorMessage = result.Messages
                .FirstOrDefault(m => m.ResultMessageType == ResultMessageType.Error)?.Message
                ?? "Failed to initialize checkout.";

            // Include basket in error response so frontend can display item-level shipping errors
            // The basket.Errors collection contains specific messages like "Product X cannot ship to Country Y"
            var errorResult = result.ResultObject;

            return UnprocessableEntity(new InitializeCheckoutResponseDto
            {
                Success = false,
                Message = errorMessage,
                Basket = errorResult?.Basket != null ? await checkoutDtoMapper.MapBasketToDtoWithCurrencyAsync(errorResult.Basket, ct) : null,
                Errors = result.Messages
                    .Where(m => m.ResultMessageType == ResultMessageType.Error)
                    .Select((m, i) => new { Key = $"error{i}", Value = m.Message ?? "Unknown error" })
                    .ToDictionary(x => x.Key, x => x.Value)
            });
        }

        var initResult = result.ResultObject!;

        // Get display context for tax-inclusive pricing
        var displayContext = await storefrontContext.GetDisplayContextAsync(ct);
        var displayCurrencySymbol = displayContext.CurrencySymbol;

        var shippingGroups = checkoutDtoMapper.MapOrderGroupsToDto(
            initResult.GroupingResult,
            initResult.AutoSelectedShippingOptions,
            displayContext,
            initResult.Basket.EffectiveShippingTaxRate);

        // Use basket's effective shipping tax rate for combined total when context rate is null (proportional mode)
        var effectiveContext = displayContext.ShippingTaxRate.HasValue
            ? displayContext
            : displayContext with { ShippingTaxRate = initResult.Basket.EffectiveShippingTaxRate };

        // Apply same tax-inclusive logic to combined shipping total for consistency
        var displayCombinedShippingTotal = DisplayCurrencyExtensions.GetDisplayShippingOptionCost(
            initResult.CombinedShippingTotal,
            effectiveContext,
            currencyService);

        return Ok(new InitializeCheckoutResponseDto
        {
            Success = true,
            Basket = checkoutDtoMapper.MapBasketToDto(initResult.Basket, displayContext),
            ShippingGroups = shippingGroups,
            CombinedShippingTotal = displayCombinedShippingTotal,
            FormattedCombinedShippingTotal = currencyConversion.Format(displayCombinedShippingTotal, displayCurrencySymbol),
            ShippingAutoSelected = initResult.ShippingAutoSelected,
            CurrencyDecimalPlaces = displayContext.DecimalPlaces
        });
    }

    /// <summary>
    /// Get shipping groups with available shipping options.
    /// Groups items by warehouse/fulfillment source with shipping options for each.
    /// </summary>
    [HttpGet("shipping-groups")]
    public async Task<IActionResult> GetShippingGroups(CancellationToken ct)
    {
        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);
        if (basket == null)
        {
            return BadRequest(new SelectShippingResponseDto
            {
                Success = false,
                Message = "No basket found."
            });
        }

        var session = await checkoutSessionService.GetSessionAsync(basket.Id, ct);
        var groupingResult = await checkoutService.GetOrderGroupsAsync(
            new GetOrderGroupsParameters
            {
                Basket = basket,
                Session = session
            },
            ct);

        if (!groupingResult.Success)
        {
            return UnprocessableEntity(new SelectShippingResponseDto
            {
                Success = false,
                Message = "Unable to determine shipping options.",
                Errors = groupingResult.Errors
                    .Select((e, i) => new { Key = $"error{i}", Value = e })
                    .ToDictionary(x => x.Key, x => x.Value)
            });
        }

        // Get display context for tax-inclusive pricing
        var displayContext = await storefrontContext.GetDisplayContextAsync(ct);
        var shippingGroups = checkoutDtoMapper.MapOrderGroupsToDto(
            groupingResult,
            session.SelectedShippingOptions,
            displayContext,
            basket.EffectiveShippingTaxRate);

        return Ok(new SelectShippingResponseDto
        {
            Success = true,
            Basket = checkoutDtoMapper.MapBasketToDto(basket, displayContext),
            ShippingGroups = shippingGroups
        });
    }

    /// <summary>
    /// Save shipping selections for each group.
    /// </summary>
    [HttpPost("shipping")]
    public async Task<IActionResult> SaveShippingSelections([FromBody] SelectShippingRequestDto request, CancellationToken ct)
    {
        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);
        if (basket == null)
        {
            return BadRequest(new SelectShippingResponseDto
            {
                Success = false,
                Message = "No basket found."
            });
        }

        var session = await checkoutSessionService.GetSessionAsync(basket.Id, ct);

        // Get current groups to validate selections
        var groupingResult = await checkoutService.GetOrderGroupsAsync(
            new GetOrderGroupsParameters
            {
                Basket = basket,
                Session = session
            },
            ct);
        if (!groupingResult.Success)
        {
            return UnprocessableEntity(new SelectShippingResponseDto
            {
                Success = false,
                Message = "Unable to validate shipping options.",
                Errors = groupingResult.Errors
                    .Select((e, i) => new { Key = $"error{i}", Value = e })
                    .ToDictionary(x => x.Key, x => x.Value)
            });
        }

        var requestedSelections = request.Selections ?? [];

        // Validate that all groups have a valid shipping selection
        var errors = checkoutValidator.ValidateShippingSelections(groupingResult.Groups, requestedSelections);
        if (errors.Count > 0)
        {
            return UnprocessableEntity(new SelectShippingResponseDto
            {
                Success = false,
                Message = "Please select shipping for all items.",
                Errors = errors
            });
        }

        // Augment selections with WarehouseId and GroupId keys for stable lookups
        var augmentedSelections = checkoutValidator.AugmentShippingSelections(groupingResult.Groups, requestedSelections);

        // Delegate to service (handles calculation, discounts, DB save, and session updates)
        var saveResult = await checkoutService.SaveShippingSelectionsAsync(new SaveShippingSelectionsParameters
        {
            Basket = basket,
            Session = session,
            Selections = augmentedSelections,
            QuotedCosts = request.QuotedCosts,
            DeliveryDates = request.DeliveryDates
        }, ct);

        if (!saveResult.Success)
        {
            var errorMessage = saveResult.Messages
                .FirstOrDefault(m => m.ResultMessageType == ResultMessageType.Error)?.Message
                ?? "Failed to save shipping selections.";

            return UnprocessableEntity(new SelectShippingResponseDto
            {
                Success = false,
                Message = errorMessage
            });
        }

        var updatedBasket = saveResult.ResultObject!;
        logger.LogInformation("Shipping selections saved for basket {BasketId}", basket.Id);

        // Re-fetch groups with updated selections
        var updatedSession = await checkoutSessionService.GetSessionAsync(basket.Id, ct);
        var updatedGroupingResult = await checkoutService.GetOrderGroupsAsync(
            new GetOrderGroupsParameters
            {
                Basket = updatedBasket,
                Session = updatedSession
            },
            ct);

        // Get display context for tax-inclusive pricing
        var displayContext = await storefrontContext.GetDisplayContextAsync(ct);

        return Ok(new SelectShippingResponseDto
        {
            Success = true,
            Message = "Shipping selections saved successfully.",
            Basket = checkoutDtoMapper.MapBasketToDto(updatedBasket, displayContext),
            ShippingGroups = checkoutDtoMapper.MapOrderGroupsToDto(
                updatedGroupingResult,
                updatedSession.SelectedShippingOptions,
                displayContext,
                updatedBasket.EffectiveShippingTaxRate)
        });
    }

    /// <summary>
    /// Remove a discount from the basket.
    /// </summary>
    [HttpDelete("discount/{discountId:guid}")]
    public async Task<IActionResult> RemoveDiscount(Guid discountId, CancellationToken ct)
    {
        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);
        if (basket == null)
        {
            return BadRequest(new ApplyDiscountResponseDto
            {
                Success = false,
                Message = "No basket found."
            });
        }

        var result = await checkoutDiscountService.RemovePromotionalDiscountAsync(
            basket,
            discountId,
            basket.ShippingAddress?.CountryCode,
            ct);

        if (!result.Success)
        {
            var errorMessage = result.Messages
                .FirstOrDefault(m => m.ResultMessageType == ResultMessageType.Error)?.Message
                ?? "Failed to remove discount.";

            return BadRequest(new ApplyDiscountResponseDto
            {
                Success = false,
                Message = errorMessage
            });
        }

        // Update per-request cache with the updated basket (automatic discounts already refreshed in service)
        var updatedBasket = result.ResultObject;
        if (updatedBasket != null)
        {
            checkoutSessionService.CacheBasket(updatedBasket);
        }

        logger.LogInformation("Discount {DiscountId} removed from basket {BasketId}", discountId, basket.Id);

        return Ok(new ApplyDiscountResponseDto
        {
            Success = true,
            Message = "Discount removed successfully.",
            Basket = updatedBasket != null ? await checkoutDtoMapper.MapBasketToDtoWithCurrencyAsync(updatedBasket, ct) : null
        });
    }

    /// <summary>
    /// Render a terms/policy Razor view by key.
    /// The key maps to ~/Views/Checkout/{Key}.cshtml (PascalCase).
    /// </summary>
    [HttpGet("terms/{key}")]
    public async Task<IActionResult> GetTermsContent(
        string key,
        [FromServices] IRazorViewEngine razorViewEngine,
        [FromServices] IModelMetadataProvider modelMetadataProvider,
        [FromServices] ITempDataDictionaryFactory tempDataDictionaryFactory)
    {
        // Sanitize key to alpha characters only
        var sanitized = new string(key.Where(char.IsLetter).ToArray());
        if (string.IsNullOrEmpty(sanitized))
        {
            return Ok(new { success = false, message = "Invalid terms key." });
        }

        // PascalCase the key
        var viewName = char.ToUpperInvariant(sanitized[0]) + sanitized[1..].ToLowerInvariant();
        var viewPath = $"~/Views/Checkout/{viewName}.cshtml";

        var viewResult = razorViewEngine.GetView(null, viewPath, false);
        if (viewResult.View == null)
        {
            return Ok(new { success = false, message = "No terms view found." });
        }

        try
        {
            var viewData = new ViewDataDictionary(modelMetadataProvider, new ModelStateDictionary());
            var tempData = tempDataDictionaryFactory.GetTempData(HttpContext);
            var routeData = HttpContext.GetRouteData();
            var actionContext = new ActionContext(HttpContext, routeData, new ActionDescriptor());

            await using var writer = new StringWriter();
            var viewContext = new ViewContext(
                actionContext,
                viewResult.View,
                viewData,
                tempData,
                writer,
                new HtmlHelperOptions());

            await viewResult.View.RenderAsync(viewContext);
            return Ok(new { success = true, html = writer.ToString() });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to render terms view: {ViewName}", viewName);
            return Ok(new { success = false, message = "Failed to load terms content." });
        }
    }

    #region Member Account Endpoints

    /// <summary>
    /// Check if an email has an existing member account.
    /// Always returns a neutral result to prevent account enumeration.
    /// </summary>
    [HttpPost("check-email")]
    public IActionResult CheckEmail([FromBody] CheckEmailRequestDto request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || !checkoutValidator.IsValidEmail(request.Email))
        {
            return BadRequest(new CheckEmailResultDto { HasExistingAccount = false });
        }

        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var rateLimitKey = $"check-email:{clientIp}";
        var rateLimitResult = rateLimiter.TryAcquire(rateLimitKey, MaxCheckEmailAttemptsPerMinute, CheckEmailRateLimitWindow);

        if (!rateLimitResult.IsAllowed)
        {
            logger.LogWarning("Rate limit exceeded for check-email from IP: {IP}", clientIp);
            return Ok(new CheckEmailResultDto { HasExistingAccount = false });
        }

        // Intentionally return a neutral response regardless of account existence.
        // This endpoint is used for UI hints only and must not leak membership data.
        return Ok(new CheckEmailResultDto { HasExistingAccount = false });
    }

    /// <summary>
    /// Validate a password against Umbraco's configured password requirements.
    /// Used for real-time validation during account creation.
    /// </summary>
    [HttpPost("validate-password")]
    public async Task<IActionResult> ValidatePassword([FromBody] ValidatePasswordRequestDto request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Password))
        {
            return Ok(new ValidatePasswordResultDto
            {
                IsValid = false,
                Errors = ["Password is required"]
            });
        }

        var result = await checkoutMemberService.ValidatePasswordAsync(request.Password, ct);
        return Ok(result);
    }

    /// <summary>
    /// Sign in with an existing member account during checkout.
    /// </summary>
    [HttpPost("sign-in")]
    public async Task<IActionResult> SignIn([FromBody] SignInRequestDto request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
        {
            return Ok(new SignInResultDto
            {
                Success = false,
                ErrorMessage = "Email and password are required"
            });
        }

        var result = await checkoutMemberService.SignInAsync(request.Email, request.Password, ct);

        if (result.Success)
        {
            logger.LogInformation("Member signed in during checkout: {Email}", request.Email);

            // Link member to customer record
            if (result.MemberKey.HasValue && customerService != null)
            {
                try
                {
                    var customer = await customerService.GetOrCreateByEmailAsync(
                        new GetOrCreateCustomerParameters { Email = request.Email }, ct);
                    if (!customer.MemberKey.HasValue)
                    {
                        await customerService.UpdateAsync(new UpdateCustomerParameters
                        {
                            Id = customer.Id,
                            MemberKey = result.MemberKey
                        }, ct);
                        logger.LogInformation(
                            "Linked member {MemberKey} to customer {CustomerId} during sign-in",
                            result.MemberKey, customer.Id);
                    }
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Failed to link member to customer for {Email} during sign-in", request.Email);
                }
            }
        }

        return Ok(result);
    }

    /// <summary>
    /// Request a password reset email.
    /// Always returns success to prevent email enumeration attacks.
    /// </summary>
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDto request, CancellationToken ct)
    {
        // Rate limit by IP address to prevent abuse
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var rateLimitKey = $"forgot-password:{clientIp}";
        var rateLimitResult = rateLimiter.TryAcquire(rateLimitKey, 5, TimeSpan.FromMinutes(15));

        if (!rateLimitResult.IsAllowed)
        {
            // Still return success to prevent enumeration, but log
            logger.LogWarning("Rate limit exceeded for password reset from IP: {IP}", clientIp);
            return Ok(new ForgotPasswordResultDto());
        }

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return Ok(new ForgotPasswordResultDto());
        }

        var result = await checkoutMemberService.InitiatePasswordResetAsync(
            request.Email.Trim(),
            request.ResetBaseUrl,
            ct);

        return Ok(result);
    }

    /// <summary>
    /// Validate a password reset token.
    /// </summary>
    [HttpPost("validate-reset-token")]
    public async Task<IActionResult> ValidateResetToken([FromBody] ValidateResetTokenRequestDto request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Token))
        {
            return Ok(new ValidateResetTokenResultDto
            {
                IsValid = false,
                ErrorMessage = "Invalid reset link."
            });
        }

        var result = await checkoutMemberService.ValidateResetTokenAsync(request.Email, request.Token, ct);
        return Ok(result);
    }

    /// <summary>
    /// Reset password using a valid token.
    /// </summary>
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequestDto request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Token) ||
            string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return BadRequest(new ResetPasswordResultDto
            {
                Success = false,
                ErrorMessage = "All fields are required."
            });
        }

        var result = await checkoutMemberService.ResetPasswordAsync(
            new ResetPasswordParameters
            {
                Email = request.Email,
                Token = request.Token,
                NewPassword = request.NewPassword
            },
            ct);

        return Ok(result);
    }

    #endregion

    #region Cart Recovery

    /// <summary>
    /// Capture email early for abandoned cart recovery.
    /// Call this on email field blur/change to start tracking immediately.
    /// </summary>
    [HttpPost("capture-email")]
    public async Task<IActionResult> CaptureEmail([FromBody] CheckEmailRequestDto request, CancellationToken ct)
    {
        if (!checkoutValidator.IsValidEmail(request.Email))
        {
            return BadRequest(new { success = false, message = "Invalid email format." });
        }

        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);
        if (basket == null || basket.LineItems.Count == 0)
        {
            return BadRequest(new { success = false, message = "No items in basket." });
        }

        var email = request.Email.Trim();

        // Save email to checkout session for payment initialization
        await checkoutSessionService.SaveEmailAsync(basket.Id, email, ct);

        // Save email to basket for persistence across sessions
        basket.BillingAddress.Email = email;
        await checkoutService.SaveBasketAsync(new SaveBasketParameters { Basket = basket }, ct);

        // Track for abandoned checkout (optional service)
        if (abandonedCheckoutService != null)
        {
            await abandonedCheckoutService.TrackCheckoutActivityAsync(basket, email, ct);
        }

        logger.LogDebug("Email captured for basket: {BasketId}", basket.Id);

        return Ok(new { success = true });
    }

    /// <summary>
    /// Capture address data early for persistence.
    /// Call this on address field blur to auto-save as user enters data.
    /// </summary>
    [HttpPost("capture-address")]
    public async Task<IActionResult> CaptureAddress([FromBody] SaveAddressesRequestDto request, CancellationToken ct)
    {
        try
        {
            var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);
            if (basket == null || basket.LineItems.Count == 0)
            {
                return BadRequest(new { success = false, message = "No items in basket." });
            }

            var result = await checkoutService.SaveAddressesAsync(new SaveAddressesParameters
            {
                Basket = basket,
                Email = request.Email,
                BillingAddress = request.BillingAddress,
                ShippingAddress = request.ShippingAddress,
                ShippingSameAsBilling = request.ShippingSameAsBilling,
                AcceptsMarketing = request.AcceptsMarketing,
                IsPartial = true
            }, ct);

            if (!result.Success)
            {
                var message = result.Messages.FirstOrDefault()?.Message ?? "Failed to capture address.";
                return BadRequest(new { success = false, message });
            }

            logger.LogDebug("Address captured for basket: {BasketId}", basket.Id);

            return Ok(new { success = true });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error capturing address");
            return StatusCode(500, new { success = false, message = "Failed to capture address." });
        }
    }

    /// <summary>
    /// Restore a basket from an abandoned cart recovery token.
    /// </summary>
    [HttpGet("recover/{token}")]
    public async Task<IActionResult> RecoverBasket(string token, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return BadRequest(new { success = false, message = "Recovery token is required." });
        }

        // Rate limit by IP address
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var rateLimitKey = $"cart-recovery:{clientIp}";
        var rateLimitResult = rateLimiter.TryAcquire(rateLimitKey, MaxRecoveryAttemptsPerMinute, RecoveryRateLimitWindow);

        if (!rateLimitResult.IsAllowed)
        {
            return StatusCode(429, new
            {
                success = false,
                message = "Too many recovery attempts. Please try again later.",
                retryAfterSeconds = rateLimitResult.RetryAfter?.TotalSeconds
            });
        }

        if (abandonedCheckoutService == null)
        {
            return StatusCode(503, new { success = false, message = "Cart recovery service is not available." });
        }

        var result = await abandonedCheckoutService.RestoreBasketFromRecoveryAsync(token, ct);

        if (result.ResultObject == null)
        {
            var errorMessage = result.Messages.FirstOrDefault()?.Message ?? "Unable to recover basket.";
            return NotFound(new { success = false, message = errorMessage });
        }

        var basket = result.ResultObject;
        await checkoutService.SaveBasketAsync(new SaveBasketParameters { Basket = basket }, ct);
        EnsureBasketCookie(basket);

        // Check availability of recovered items (stock may have changed since abandonment)
        var availability = await storefrontContext.GetBasketAvailabilityAsync(
            basket.LineItems,
            basket.ShippingAddress.CountryCode,
            basket.ShippingAddress.CountyState?.RegionCode,
            ct);

        // Build a lookup of line items by ID for enriching availability info
        var lineItemLookup = basket.LineItems.ToDictionary(li => li.Id);

        var unavailableItems = availability.Items
            .Where(i => !i.CanShipToLocation || !i.HasStock)
            .Select(i =>
            {
                lineItemLookup.TryGetValue(i.LineItemId, out var lineItem);
                return new
                {
                    lineItemId = i.LineItemId,
                    sku = lineItem?.Sku,
                    name = lineItem?.Name,
                    hasStock = i.HasStock,
                    canShipToLocation = i.CanShipToLocation,
                    statusMessage = i.StatusMessage
                };
            })
            .ToList();

        // Return the recovered basket as a checkout basket DTO
        var basketDto = await checkoutDtoMapper.MapBasketToDtoWithCurrencyAsync(basket, ct);
        return Ok(new
        {
            success = true,
            message = unavailableItems.Count > 0
                ? "Your basket has been restored, but some items may no longer be available."
                : "Your basket has been restored.",
            basket = basketDto,
            hasUnavailableItems = unavailableItems.Count > 0,
            unavailableItems
        });
    }

    /// <summary>
    /// Validate a recovery token without restoring the basket.
    /// </summary>
    [HttpGet("recover/{token}/validate")]
    public async Task<IActionResult> ValidateRecoveryToken(string token, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return BadRequest(new { valid = false, message = "Recovery token is required." });
        }

        // Rate limit by IP address
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var rateLimitKey = $"cart-recovery:{clientIp}";
        var rateLimitResult = rateLimiter.TryAcquire(rateLimitKey, MaxRecoveryAttemptsPerMinute, RecoveryRateLimitWindow);

        if (!rateLimitResult.IsAllowed)
        {
            return StatusCode(429, new
            {
                valid = false,
                message = "Too many recovery attempts. Please try again later.",
                retryAfterSeconds = rateLimitResult.RetryAfter?.TotalSeconds
            });
        }

        if (abandonedCheckoutService == null)
        {
            return StatusCode(503, new { valid = false, message = "Cart recovery service is not available." });
        }

        var abandonedCheckout = await abandonedCheckoutService.GetByRecoveryTokenAsync(token, ct);

        if (abandonedCheckout == null)
        {
            return Ok(new { valid = false, message = "Invalid recovery link." });
        }

        if (abandonedCheckout.RecoveryTokenExpiresUtc < DateTime.UtcNow)
        {
            return Ok(new { valid = false, message = "This recovery link has expired." });
        }

        if (abandonedCheckout.Status == AbandonedCheckoutStatus.Expired)
        {
            return Ok(new { valid = false, message = "This recovery link has expired." });
        }

        if (abandonedCheckout.Status == AbandonedCheckoutStatus.Converted)
        {
            return Ok(new { valid = false, message = "This checkout has already been completed." });
        }

        return Ok(new
        {
            valid = true,
            basketTotal = abandonedCheckout.BasketTotal,
            formattedTotal = (abandonedCheckout.CurrencySymbol ?? "") + abandonedCheckout.BasketTotal.ToString("N2"),
            itemCount = abandonedCheckout.ItemCount,
            customerEmail = abandonedCheckout.Email
        });
    }

    private void EnsureBasketCookie(Basket basket)
    {
        if (basket.CustomerId.HasValue)
        {
            return;
        }

        Response.Cookies.Append(
            Core.Constants.Cookies.BasketId,
            basket.Id.ToString(),
            new CookieOptions
            {
                Expires = DateTimeOffset.UtcNow.AddDays(30),
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Lax
            });
    }

    #endregion

}

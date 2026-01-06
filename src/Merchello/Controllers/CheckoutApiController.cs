using Merchello.Core;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Microsoft.AspNetCore.Mvc;
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
    IOptions<MerchelloSettings> merchelloSettings,
    ILogger<CheckoutApiController> logger) : ControllerBase
{
    private readonly MerchelloSettings _settings = merchelloSettings.Value;

    /// <summary>
    /// Get the current basket with formatted totals.
    /// </summary>
    [HttpGet("basket")]
    public async Task<IActionResult> GetBasket(CancellationToken ct)
    {
        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);

        if (basket == null || basket.LineItems.Count == 0)
        {
            return Ok(new CheckoutBasketDto
            {
                IsEmpty = true,
                CurrencySymbol = _settings.CurrencySymbol
            });
        }

        return Ok(MapBasketToDto(basket));
    }

    /// <summary>
    /// Get available countries for shipping (based on warehouse service regions).
    /// </summary>
    [HttpGet("shipping/countries")]
    public async Task<IActionResult> GetShippingCountries(CancellationToken ct)
    {
        var countries = await checkoutService.GetAvailableCountriesAsync(ct);
        var dtos = countries.Select(c => new CountryDto(c.Code, c.Name)).ToList();
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

        var regions = await checkoutService.GetAvailableRegionsAsync(countryCode, ct);
        var dtos = regions.Select(r => new RegionDto(r.RegionCode, r.Name)).ToList();
        return Ok(dtos);
    }

    /// <summary>
    /// Get all countries for billing (no restrictions).
    /// </summary>
    [HttpGet("billing/countries")]
    public async Task<IActionResult> GetBillingCountries(CancellationToken ct)
    {
        var countries = await checkoutService.GetAllCountriesAsync(ct);
        var dtos = countries.Select(c => new CountryDto(c.Code, c.Name)).ToList();
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

        var regions = await checkoutService.GetAllRegionsAsync(countryCode, ct);
        var dtos = regions.Select(r => new RegionDto(r.RegionCode, r.Name)).ToList();
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
            ShippingSameAsBilling = request.ShippingSameAsBilling
        }, ct);

        if (!result.Successful)
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

        return Ok(new SaveAddressesResponseDto
        {
            Success = true,
            Message = "Addresses saved successfully.",
            Basket = MapBasketToDto(result.ResultObject!)
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

        var result = await checkoutService.ApplyDiscountCodeAsync(
            basket,
            request.Code.Trim(),
            basket.ShippingAddress?.CountryCode,
            ct);

        if (!result.Successful)
        {
            var errorMessage = result.Messages
                .FirstOrDefault(m => m.ResultMessageType == ResultMessageType.Error)?.Message
                ?? "Failed to apply discount code.";

            return Ok(new ApplyDiscountResponseDto
            {
                Success = false,
                Message = errorMessage
            });
        }

        // Refresh automatic discounts - the applied code may conflict with existing automatic discounts
        var updatedBasket = result.ResultObject;
        if (updatedBasket != null)
        {
            updatedBasket = await checkoutService.RefreshAutomaticDiscountsAsync(
                updatedBasket,
                updatedBasket.ShippingAddress?.CountryCode,
                ct);
        }

        // Update session with the updated basket
        if (updatedBasket != null)
        {
            checkoutSessionService.SaveBasketToSession(updatedBasket);
        }

        logger.LogInformation("Discount code {Code} applied to basket {BasketId}", request.Code, basket.Id);

        return Ok(new ApplyDiscountResponseDto
        {
            Success = true,
            Message = "Discount applied successfully.",
            Basket = updatedBasket != null ? MapBasketToDto(updatedBasket) : null
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

        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);
        if (basket == null || basket.LineItems.Count == 0)
        {
            return BadRequest(new InitializeCheckoutResponseDto
            {
                Success = false,
                Message = "No items in basket."
            });
        }

        var result = await checkoutService.InitializeCheckoutAsync(new InitializeCheckoutParameters
        {
            Basket = basket,
            CountryCode = request.CountryCode,
            StateCode = request.StateCode,
            AutoSelectCheapestShipping = request.AutoSelectCheapestShipping,
            Email = request.Email
        }, ct);

        if (!result.Successful)
        {
            var errorMessage = result.Messages
                .FirstOrDefault(m => m.ResultMessageType == ResultMessageType.Error)?.Message
                ?? "Failed to initialize checkout.";

            return Ok(new InitializeCheckoutResponseDto
            {
                Success = false,
                Message = errorMessage,
                Errors = result.Messages
                    .Where(m => m.ResultMessageType == ResultMessageType.Error)
                    .Select((m, i) => new { Key = $"error{i}", Value = m.Message ?? "Unknown error" })
                    .ToDictionary(x => x.Key, x => x.Value)
            });
        }

        var initResult = result.ResultObject!;
        var currencySymbol = initResult.Basket.CurrencySymbol ?? _settings.CurrencySymbol;

        var shippingGroups = MapOrderGroupsToDto(
            initResult.GroupingResult,
            currencySymbol,
            initResult.AutoSelectedShippingOptions);

        return Ok(new InitializeCheckoutResponseDto
        {
            Success = true,
            Basket = MapBasketToDto(initResult.Basket),
            ShippingGroups = shippingGroups,
            CombinedShippingTotal = initResult.CombinedShippingTotal,
            FormattedCombinedShippingTotal = FormatPrice(initResult.CombinedShippingTotal, currencySymbol),
            ShippingAutoSelected = initResult.ShippingAutoSelected
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
        var groupingResult = await checkoutService.GetOrderGroupsAsync(basket, session, ct);

        if (!groupingResult.Success)
        {
            return Ok(new SelectShippingResponseDto
            {
                Success = false,
                Message = "Unable to determine shipping options.",
                Errors = groupingResult.Errors
                    .Select((e, i) => new { Key = $"error{i}", Value = e })
                    .ToDictionary(x => x.Key, x => x.Value)
            });
        }

        var currencySymbol = basket.CurrencySymbol ?? _settings.CurrencySymbol;
        var shippingGroups = MapOrderGroupsToDto(groupingResult, currencySymbol, session.SelectedShippingOptions);

        return Ok(new SelectShippingResponseDto
        {
            Success = true,
            Basket = MapBasketToDto(basket),
            ShippingGroups = shippingGroups
        });
    }

    /// <summary>
    /// Save shipping selections for each group.
    /// </summary>
    [HttpPost("shipping")]
    public async Task<IActionResult> SaveShippingSelections([FromBody] SelectShippingRequestDto request, CancellationToken ct)
    {
        if (request.Selections.Count == 0)
        {
            return BadRequest(new SelectShippingResponseDto
            {
                Success = false,
                Message = "No shipping selections provided."
            });
        }

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
        var groupingResult = await checkoutService.GetOrderGroupsAsync(basket, session, ct);
        if (!groupingResult.Success)
        {
            return Ok(new SelectShippingResponseDto
            {
                Success = false,
                Message = "Unable to validate shipping options.",
                Errors = groupingResult.Errors
                    .Select((e, i) => new { Key = $"error{i}", Value = e })
                    .ToDictionary(x => x.Key, x => x.Value)
            });
        }

        // Validate that all groups have a selection
        var errors = new Dictionary<string, string>();
        foreach (var group in groupingResult.Groups)
        {
            if (!request.Selections.TryGetValue(group.GroupId, out var selectedOptionId))
            {
                errors[group.GroupId.ToString()] = $"Please select a shipping method for {group.GroupName}.";
                continue;
            }

            // Validate the selected option exists
            if (!group.AvailableShippingOptions.Any(o => o.ShippingOptionId == selectedOptionId))
            {
                errors[group.GroupId.ToString()] = $"Invalid shipping option selected for {group.GroupName}.";
            }
        }

        if (errors.Count > 0)
        {
            return Ok(new SelectShippingResponseDto
            {
                Success = false,
                Message = "Please select shipping for all items.",
                Errors = errors
            });
        }

        // Delegate to service (handles calculation, discounts, DB save, and session updates)
        var saveResult = await checkoutService.SaveShippingSelectionsAsync(new SaveShippingSelectionsParameters
        {
            Basket = basket,
            Session = session,
            Selections = request.Selections,
            DeliveryDates = request.DeliveryDates
        }, ct);

        if (!saveResult.Successful)
        {
            var errorMessage = saveResult.Messages
                .FirstOrDefault(m => m.ResultMessageType == ResultMessageType.Error)?.Message
                ?? "Failed to save shipping selections.";

            return Ok(new SelectShippingResponseDto
            {
                Success = false,
                Message = errorMessage
            });
        }

        var updatedBasket = saveResult.ResultObject!;
        logger.LogInformation("Shipping selections saved for basket {BasketId}", basket.Id);

        // Re-fetch groups with updated selections
        var updatedSession = await checkoutSessionService.GetSessionAsync(basket.Id, ct);
        var updatedGroupingResult = await checkoutService.GetOrderGroupsAsync(updatedBasket, updatedSession, ct);
        var currencySymbol = updatedBasket.CurrencySymbol ?? _settings.CurrencySymbol;

        return Ok(new SelectShippingResponseDto
        {
            Success = true,
            Message = "Shipping selections saved successfully.",
            Basket = MapBasketToDto(updatedBasket),
            ShippingGroups = MapOrderGroupsToDto(updatedGroupingResult, currencySymbol, updatedSession.SelectedShippingOptions)
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

        var result = await checkoutService.RemovePromotionalDiscountAsync(
            basket,
            discountId,
            basket.ShippingAddress?.CountryCode,
            ct);

        if (!result.Successful)
        {
            var errorMessage = result.Messages
                .FirstOrDefault(m => m.ResultMessageType == ResultMessageType.Error)?.Message
                ?? "Failed to remove discount.";

            return Ok(new ApplyDiscountResponseDto
            {
                Success = false,
                Message = errorMessage
            });
        }

        // Refresh automatic discounts - a removed code may have been blocking automatic discounts
        var updatedBasket = result.ResultObject;
        if (updatedBasket != null)
        {
            updatedBasket = await checkoutService.RefreshAutomaticDiscountsAsync(
                updatedBasket,
                updatedBasket.ShippingAddress?.CountryCode,
                ct);
        }

        // Update session with the updated basket
        if (updatedBasket != null)
        {
            checkoutSessionService.SaveBasketToSession(updatedBasket);
        }

        logger.LogInformation("Discount {DiscountId} removed from basket {BasketId}", discountId, basket.Id);

        return Ok(new ApplyDiscountResponseDto
        {
            Success = true,
            Message = "Discount removed successfully.",
            Basket = updatedBasket != null ? MapBasketToDto(updatedBasket) : null
        });
    }

    #region Private Helpers

    private CheckoutBasketDto MapBasketToDto(Basket basket)
    {
        var currencySymbol = basket.CurrencySymbol ?? _settings.CurrencySymbol;

        var lineItems = basket.LineItems
            .Where(li => li.LineItemType == LineItemType.Product
                      || li.LineItemType == LineItemType.Custom
                      || li.LineItemType == LineItemType.Addon)
            .Select(li => new CheckoutLineItemDto
            {
                Id = li.Id,
                Sku = li.Sku ?? "",
                Name = li.Name ?? "",
                Quantity = li.Quantity,
                UnitPrice = li.Amount,
                LineTotal = li.Amount * li.Quantity,
                FormattedUnitPrice = FormatPrice(li.Amount, currencySymbol),
                FormattedLineTotal = FormatPrice(li.Amount * li.Quantity, currencySymbol),
                LineItemType = li.LineItemType
            })
            .ToList();

        var appliedDiscounts = basket.LineItems
            .Where(li => li.LineItemType == LineItemType.Discount)
            .Select(li =>
            {
                li.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountId, out var discountIdObj);
                li.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountCode, out var discountCodeObj);

                return new AppliedDiscountDto
                {
                    Id = discountIdObj is string discountIdStr && Guid.TryParse(discountIdStr, out var discountId)
                        ? discountId
                        : li.Id,
                    Name = li.Name ?? "Discount",
                    Code = discountCodeObj?.ToString(),
                    Amount = Math.Abs(li.Amount * li.Quantity),
                    FormattedAmount = FormatPrice(Math.Abs(li.Amount * li.Quantity), currencySymbol),
                    IsAutomatic = discountCodeObj == null
                };
            })
            .ToList();

        return new CheckoutBasketDto
        {
            Id = basket.Id,
            LineItems = lineItems,
            SubTotal = basket.SubTotal,
            Discount = basket.Discount,
            AdjustedSubTotal = basket.AdjustedSubTotal,
            Tax = basket.Tax,
            Shipping = basket.Shipping,
            Total = basket.Total,
            FormattedSubTotal = FormatPrice(basket.SubTotal, currencySymbol),
            FormattedDiscount = FormatPrice(basket.Discount, currencySymbol),
            FormattedAdjustedSubTotal = FormatPrice(basket.AdjustedSubTotal, currencySymbol),
            FormattedTax = FormatPrice(basket.Tax, currencySymbol),
            FormattedShipping = FormatPrice(basket.Shipping, currencySymbol),
            FormattedTotal = FormatPrice(basket.Total, currencySymbol),
            Currency = basket.Currency ?? _settings.StoreCurrencyCode,
            CurrencySymbol = currencySymbol,
            BillingAddress = MapAddressToDto(basket.BillingAddress),
            ShippingAddress = MapAddressToDto(basket.ShippingAddress),
            AppliedDiscounts = appliedDiscounts,
            IsEmpty = basket.LineItems.Count == 0
        };
    }

    private static CheckoutAddressDto? MapAddressToDto(Address? address)
    {
        if (address == null || string.IsNullOrWhiteSpace(address.Name))
        {
            return null;
        }

        return new CheckoutAddressDto
        {
            Name = address.Name,
            Company = address.Company,
            Address1 = address.AddressOne,
            Address2 = address.AddressTwo,
            City = address.TownCity,
            State = address.CountyState?.Name,
            StateCode = address.CountyState?.RegionCode,
            PostalCode = address.PostalCode,
            Country = address.Country,
            CountryCode = address.CountryCode,
            Phone = address.Phone
        };
    }

    private static string FormatPrice(decimal price, string currencySymbol)
    {
        return $"{currencySymbol}{price:N2}";
    }

    private static List<ShippingGroupDto> MapOrderGroupsToDto(
        OrderGroupingResult result,
        string currencySymbol,
        Dictionary<Guid, Guid>? selectedOptions)
    {
        return result.Groups.Select(group => new ShippingGroupDto
        {
            GroupId = group.GroupId,
            GroupName = group.GroupName,
            WarehouseId = group.WarehouseId,
            LineItems = group.LineItems.Select(li => new ShippingGroupLineItemDto
            {
                Id = li.LineItemId,
                Sku = li.Sku ?? "",
                Name = li.Name,
                Quantity = li.Quantity,
                Amount = li.Amount * li.Quantity,
                FormattedAmount = FormatPrice(li.Amount * li.Quantity, currencySymbol)
            }).ToList(),
            ShippingOptions = group.AvailableShippingOptions.Select(opt => new ShippingOptionDto
            {
                Id = opt.ShippingOptionId,
                Name = opt.Name,
                DaysFrom = opt.DaysFrom,
                DaysTo = opt.DaysTo,
                IsNextDay = opt.IsNextDay,
                Cost = opt.Cost,
                FormattedCost = FormatPrice(opt.Cost, currencySymbol),
                DeliveryDescription = opt.DeliveryTimeDescription,
                ProviderKey = opt.ProviderKey
            }).ToList(),
            SelectedShippingOptionId = selectedOptions?.TryGetValue(group.GroupId, out var selectedId) == true
                ? selectedId
                : group.SelectedShippingOptionId
        }).ToList();
    }

    #endregion
}

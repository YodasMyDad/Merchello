using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Shared.Models;
using Merchello.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewEngines;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Web;
using Umbraco.Cms.Web.Common.Controllers;

namespace Merchello.Controllers;

/// <summary>
/// Renders checkout pages using fixed views from the Merchello RCL.
/// Automatically invoked via Umbraco's route hijacking when ContentType.Alias = "MerchelloCheckout".
/// </summary>
public class MerchelloCheckoutController(
    ILogger<MerchelloCheckoutController> logger,
    ICompositeViewEngine compositeViewEngine,
    IUmbracoContextAccessor umbracoContextAccessor,
    IOptions<CheckoutSettings> checkoutSettings,
    IOptions<MerchelloSettings> merchelloSettings,
    ICheckoutService checkoutService,
    ICheckoutSessionService checkoutSessionService)
    : RenderController(logger, compositeViewEngine, umbracoContextAccessor)
{
    private readonly CheckoutSettings _settings = checkoutSettings.Value;
    private readonly MerchelloSettings _merchelloSettings = merchelloSettings.Value;

    /// <summary>
    /// Renders the checkout view for the current step.
    /// </summary>
    public override IActionResult Index()
    {
        return IndexAsync(HttpContext.RequestAborted).GetAwaiter().GetResult();
    }

    private async Task<IActionResult> IndexAsync(CancellationToken ct)
    {
        if (CurrentPage is not MerchelloCheckoutPage checkoutPage)
        {
            logger.LogWarning("CurrentPage is not a MerchelloCheckoutPage");
            return NotFound();
        }

        // Handle confirmation step - load confirmation data once and reuse
        if (checkoutPage.Step == CheckoutStep.Confirmation && checkoutPage.InvoiceId.HasValue)
        {
            var confirmation = await checkoutService.GetOrderConfirmationAsync(checkoutPage.InvoiceId.Value, ct);

            // Check if we should redirect to custom confirmation URL
            if (confirmation != null && !string.IsNullOrWhiteSpace(_settings.ConfirmationRedirectUrl))
            {
                var encodedNumber = Uri.EscapeDataString((string)confirmation.InvoiceNumber);
                var redirectUrl = _settings.ConfirmationRedirectUrl + "?invoiceId=" + confirmation.InvoiceId + "&invoiceNumber=" + encodedNumber;
                return Redirect(redirectUrl);
            }

            // Clear basket cookie after successful order
            if (confirmation != null)
            {
                Response.Cookies.Delete(Core.Constants.Cookies.BasketId);
            }

            var confirmationViewModel = new CheckoutViewModel(
                checkoutPage.Step,
                _settings,
                basket: null,
                session: null,
                billingCountries: null,
                shippingCountries: null,
                shippingGroups: null,
                confirmation: confirmation);

            return View("~/Views/Checkout/Confirmation.cshtml", confirmationViewModel);
        }

        // Handle payment return/cancel steps
        if (checkoutPage.Step == CheckoutStep.PaymentReturn)
        {
            return View("~/Views/Checkout/Return.cshtml", new CheckoutViewModel(checkoutPage.Step, _settings));
        }

        if (checkoutPage.Step == CheckoutStep.PaymentCancelled)
        {
            return View("~/Views/Checkout/Cancel.cshtml", new CheckoutViewModel(checkoutPage.Step, _settings));
        }

        // For all other steps (Information, Shipping, Payment), render single-page checkout
        return await RenderSinglePageCheckoutAsync(ct);
    }

    /// <summary>
    /// Renders the single-page checkout view.
    /// </summary>
    private async Task<IActionResult> RenderSinglePageCheckoutAsync(CancellationToken ct)
    {
        // Load basket
        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);

        if (basket == null || basket.LineItems.Count == 0)
        {
            // Redirect to cart or home if no basket
            return Redirect("/");
        }

        // Load checkout session if basket exists
        var session = await checkoutSessionService.GetSessionAsync(basket.Id, ct);

        // Load available countries for billing (all countries) and shipping (restricted by warehouse regions)
        var billingCountriesResult = await checkoutService.GetAllCountriesAsync(ct);
        var billingCountries = billingCountriesResult.Select(c => new CountryDto(c.Code, c.Name)).ToList();

        var shippingCountriesResult = await checkoutService.GetAvailableCountriesAsync(ct);
        var shippingCountries = shippingCountriesResult.Select(c => new CountryDto(c.Code, c.Name)).ToList();

        // Determine default country from basket or settings
        var defaultCountryCode = session?.ShippingAddress?.CountryCode
            ?? basket.ShippingAddress?.CountryCode
            ?? _merchelloSettings.DefaultShippingCountry
            ?? "US";

        var defaultStateCode = session?.ShippingAddress?.CountyState?.RegionCode
            ?? basket.ShippingAddress?.CountyState?.RegionCode;

        // Initialize checkout with default country to get shipping groups
        List<ShippingGroupDto>? shippingGroups = null;
        if (!string.IsNullOrEmpty(defaultCountryCode))
        {
            var initResult = await checkoutService.InitializeCheckoutAsync(
                new InitializeCheckoutParameters
                {
                    Basket = basket,
                    CountryCode = defaultCountryCode,
                    StateCode = defaultStateCode,
                    AutoSelectCheapestShipping = true,
                    Email = session?.BillingAddress.Email
                }, ct);

            if (initResult.Successful && initResult.ResultObject != null)
            {
                // Update basket with calculated totals
                basket = initResult.ResultObject.Basket;

                // Get shipping groups with selections
                var currencySymbol = basket.CurrencySymbol ?? _merchelloSettings.CurrencySymbol;
                shippingGroups = MapOrderGroupsToDto(initResult.ResultObject.GroupingResult, currencySymbol, initResult.ResultObject.AutoSelectedShippingOptions);
            }
        }

        // Reload session after initialization (may have been updated)
        session = await checkoutSessionService.GetSessionAsync(basket.Id, ct);

        var viewModel = new CheckoutViewModel(
            CheckoutStep.Information,
            _settings,
            basket,
            session,
            billingCountries,
            shippingCountries,
            shippingGroups)
        {
            DefaultCountryCode = defaultCountryCode,
            DefaultStateCode = defaultStateCode,
            IsSinglePageCheckout = true
        };

        return View("~/Views/Checkout/SinglePage.cshtml", viewModel);
    }

    private static List<ShippingGroupDto> MapOrderGroupsToDto(
        Core.Checkout.Strategies.Models.OrderGroupingResult result,
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

    private static string FormatPrice(decimal price, string currencySymbol)
    {
        return $"{currencySymbol}{price:N2}";
    }

}

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
        OrderConfirmationDto? confirmation = null;
        if (checkoutPage.Step == CheckoutStep.Confirmation && checkoutPage.InvoiceId.HasValue)
        {
            confirmation = await checkoutService.GetOrderConfirmationAsync(checkoutPage.InvoiceId.Value, ct);

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
        }

        var viewModel = await CreateViewModelAsync(checkoutPage, confirmation, ct);
        var viewPath = ResolveViewPath(checkoutPage.Step);

        logger.LogDebug("Rendering checkout step {Step} with view {ViewPath}", checkoutPage.Step, viewPath);

        return View(viewPath, viewModel);
    }

    /// <summary>
    /// Creates the view model for the checkout page.
    /// </summary>
    private async Task<CheckoutViewModel> CreateViewModelAsync(
        MerchelloCheckoutPage checkoutPage,
        OrderConfirmationDto? confirmation,
        CancellationToken ct)
    {
        // For confirmation step, use pre-loaded confirmation data
        if (checkoutPage.Step == CheckoutStep.Confirmation)
        {
            return new CheckoutViewModel(
                checkoutPage.Step,
                _settings,
                basket: null,
                session: null,
                billingCountries: null,
                shippingCountries: null,
                shippingGroups: null,
                confirmation: confirmation);
        }

        // Load basket
        var basket = await checkoutService.GetBasket(new GetBasketParameters(), ct);

        // Load checkout session if basket exists
        CheckoutSession? session = null;
        if (basket != null)
        {
            session = await checkoutSessionService.GetSessionAsync(basket.Id, ct);
        }

        // Load available countries for billing (all countries) and shipping (restricted by warehouse regions)
        var billingCountriesResult = await checkoutService.GetAllCountriesAsync(ct);
        var billingCountries = billingCountriesResult.Select(c => new CountryDto(c.Code, c.Name)).ToList();

        var shippingCountriesResult = await checkoutService.GetAvailableCountriesAsync(ct);
        var shippingCountries = shippingCountriesResult.Select(c => new CountryDto(c.Code, c.Name)).ToList();

        // Load shipping groups if on shipping step
        List<ShippingGroupDto>? shippingGroups = null;
        if (checkoutPage.Step == CheckoutStep.Shipping && basket != null && session != null)
        {
            var groupingResult = await checkoutService.GetOrderGroupsAsync(basket, session, ct);
            if (groupingResult.Success)
            {
                var currencySymbol = basket.CurrencySymbol ?? _merchelloSettings.CurrencySymbol;
                shippingGroups = MapOrderGroupsToDto(groupingResult, currencySymbol, session.SelectedShippingOptions);
            }
        }

        return new CheckoutViewModel(
            checkoutPage.Step,
            _settings,
            basket,
            session,
            billingCountries,
            shippingCountries,
            shippingGroups);
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

    /// <summary>
    /// Resolves the view path for the checkout step.
    /// Views are served from the Merchello RCL.
    /// </summary>
    private static string ResolveViewPath(CheckoutStep step)
    {
        var viewName = step switch
        {
            CheckoutStep.Information => "Information",
            CheckoutStep.Shipping => "Shipping",
            CheckoutStep.Payment => "Payment",
            CheckoutStep.Confirmation => "Confirmation",
            CheckoutStep.PaymentReturn => "Return",
            CheckoutStep.PaymentCancelled => "Cancel",
            _ => "Information"
        };

        return $"~/Views/Checkout/{viewName}.cshtml";
    }
}

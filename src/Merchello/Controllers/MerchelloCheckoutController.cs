using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Discounts.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Storefront.Services;
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
    ICheckoutSessionService checkoutSessionService,
    IStorefrontContextService storefrontContext,
    IDiscountService discountService)
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
            // Prevent browser caching of confirmation page (security: prevents shared computer users from seeing previous orders)
            Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0";
            Response.Headers["Pragma"] = "no-cache";
            Response.Headers["Expires"] = "0";

            // Security: Verify the user has permission to view this confirmation
            // The confirmation token is set when payment succeeds and contains the invoice ID
            var confirmationToken = Request.Cookies[Core.Constants.Cookies.ConfirmationToken];
            if (string.IsNullOrEmpty(confirmationToken) ||
                !Guid.TryParse(confirmationToken, out var tokenInvoiceId) ||
                tokenInvoiceId != checkoutPage.InvoiceId.Value)
            {
                logger.LogWarning(
                    "Unauthorized confirmation access attempt for invoice {InvoiceId}. Token: {Token}",
                    checkoutPage.InvoiceId.Value,
                    confirmationToken ?? "missing");

                // Show "order not found" instead of revealing whether the invoice exists
                var unauthorizedViewModel = new CheckoutViewModel(
                    checkoutPage.Step,
                    _settings,
                    basket: null,
                    session: null,
                    billingCountries: null,
                    shippingCountries: null,
                    shippingGroups: null,
                    confirmation: null);

                return View("~/Views/Checkout/Confirmation.cshtml", unauthorizedViewModel);
            }

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

            // Pre-serialize line items for analytics (avoid JSON in view)
            string? lineItemsJson = null;
            if (confirmation?.LineItems != null)
            {
                lineItemsJson = System.Text.Json.JsonSerializer.Serialize(
                    confirmation.LineItems.Select(li => new
                    {
                        item_id = string.IsNullOrEmpty(li.Sku) ? li.Id.ToString() : li.Sku,
                        item_name = li.Name,
                        price = li.UnitPrice,
                        quantity = li.Quantity
                    }));
            }

            var confirmationViewModel = new CheckoutViewModel(
                checkoutPage.Step,
                _settings,
                basket: null,
                session: null,
                billingCountries: null,
                shippingCountries: null,
                shippingGroups: null,
                confirmation: confirmation)
            {
                LineItemsJson = lineItemsJson
            };

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

        // Get customer's currency context for display
        var currencyContext = await storefrontContext.GetCurrencyContextAsync(ct);
        var displayCurrencyCode = currencyContext.CurrencyCode;
        var displayCurrencySymbol = currencyContext.CurrencySymbol;
        var exchangeRate = currencyContext.ExchangeRate;

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

                // Get shipping groups with selections - use display currency for formatted costs
                shippingGroups = MapOrderGroupsToDto(
                    initResult.ResultObject.GroupingResult,
                    displayCurrencySymbol,
                    initResult.ResultObject.AutoSelectedShippingOptions,
                    exchangeRate);
            }
        }

        // Reload session after initialization (may have been updated)
        session = await checkoutSessionService.GetSessionAsync(basket.Id, ct);

        // Check if there are any active discount codes to show the discount input
        var showDiscountCode = await discountService.HasActiveCodeDiscountsAsync(ct);

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
            IsSinglePageCheckout = true,
            DisplayCurrencyCode = displayCurrencyCode,
            DisplayCurrencySymbol = displayCurrencySymbol,
            ExchangeRate = exchangeRate,
            ShowDiscountCode = showDiscountCode
        };

        return View("~/Views/Checkout/SinglePage.cshtml", viewModel);
    }

    private static List<ShippingGroupDto> MapOrderGroupsToDto(
        Core.Checkout.Strategies.Models.OrderGroupingResult result,
        string currencySymbol,
        Dictionary<Guid, Guid>? selectedOptions,
        decimal exchangeRate = 1m)
    {
        return result.Groups.Select(group => new ShippingGroupDto
        {
            GroupId = group.GroupId,
            GroupName = group.GroupName,
            WarehouseId = group.WarehouseId,
            LineItems = group.LineItems.Select(li =>
            {
                var lineTotal = li.Amount * li.Quantity;
                var displayLineTotal = lineTotal * exchangeRate;
                return new ShippingGroupLineItemDto
                {
                    Id = li.LineItemId,
                    Sku = li.Sku ?? "",
                    Name = li.Name,
                    ProductRootName = li.ProductRootName,
                    SelectedOptions = li.SelectedOptions
                        .Select(o => new SelectedOptionDto
                        {
                            OptionName = o.OptionName,
                            ValueName = o.ValueName
                        }).ToList(),
                    Quantity = li.Quantity,
                    Amount = displayLineTotal,
                    FormattedAmount = displayLineTotal.FormatWithSymbol(currencySymbol)
                };
            }).ToList(),
            ShippingOptions = group.AvailableShippingOptions.Select(opt =>
            {
                var displayCost = opt.Cost * exchangeRate;
                return new ShippingOptionDto
                {
                    Id = opt.ShippingOptionId,
                    Name = opt.Name,
                    DaysFrom = opt.DaysFrom,
                    DaysTo = opt.DaysTo,
                    IsNextDay = opt.IsNextDay,
                    Cost = displayCost,
                    FormattedCost = displayCost.FormatWithSymbol(currencySymbol),
                    DeliveryDescription = opt.DeliveryTimeDescription,
                    ProviderKey = opt.ProviderKey
                };
            }).ToList(),
            SelectedShippingOptionId = selectedOptions?.TryGetValue(group.GroupId, out var selectedId) == true
                ? selectedId
                : group.SelectedShippingOptionId
        }).ToList();
    }
}

using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Extensions;
using Merchello.Core.Shared.Dtos;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.AddressLookup.Services.Interfaces;
using Merchello.Core.Discounts.Services.Interfaces;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Storefront.Models;
using Merchello.Core.Storefront.Services;
using Merchello.Core.Storefront.Services.Interfaces;
using Merchello.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewEngines;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Security;
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
    IDiscountService discountService,
    IAddressLookupService addressLookupService,
    ICurrencyService currencyService,
    IMemberManager memberManager,
    IAbandonedCheckoutService? abandonedCheckoutService = null)
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

        if (TryGetRecoveryTokenFromPath(out var recoveryToken))
        {
            return await HandleRecoveryLinkAsync(recoveryToken, ct);
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
                    _merchelloSettings.Store,
                    basket: null,
                    session: null,
                    billingCountries: null,
                    shippingCountries: null,
                    shippingGroups: null,
                    confirmation: null);

                return View("~/Views/Checkout/Confirmation.cshtml", unauthorizedViewModel);
            }

            var confirmation = await checkoutService.GetOrderConfirmationAsync(checkoutPage.InvoiceId.Value, ct);

            // Clear basket cookie and per-request cache after successful order
            // This must happen BEFORE any redirect to ensure basket is cleared
            if (confirmation != null)
            {
                Response.Cookies.Delete(Core.Constants.Cookies.BasketId);
                HttpContext.Items.Remove("merchello:Basket");
            }

            // Check if we should redirect to custom confirmation URL
            if (confirmation != null && !string.IsNullOrWhiteSpace(_settings.ConfirmationRedirectUrl))
            {
                var encodedNumber = Uri.EscapeDataString((string)confirmation.InvoiceNumber);
                var redirectUrl = _settings.ConfirmationRedirectUrl + "?invoiceId=" + confirmation.InvoiceId + "&invoiceNumber=" + encodedNumber;
                return Redirect(redirectUrl);
            }

            // Enrich confirmation DTO with display currency conversion and tax-inclusive values
            if (confirmation != null)
            {
                var displayContext = await storefrontContext.GetDisplayContextAsync(ct);

                // Check if invoice currency matches display currency
                // Invoice amounts are already stored in presentment currency (e.g., GBP)
                // Only convert if customer is now viewing in a different currency
                var invoiceCurrency = confirmation.DisplayCurrencyCode;
                var needsConversion = !string.Equals(
                    invoiceCurrency,
                    displayContext.CurrencyCode,
                    StringComparison.OrdinalIgnoreCase);

                var symbol = displayContext.CurrencySymbol;
                var format = $"N{displayContext.DecimalPlaces}";
                var currency = displayContext.CurrencyCode;

                if (needsConversion)
                {
                    // Different currency - apply conversion
                    // Note: This converts using the current exchange rate from store currency
                    // A future improvement could convert from invoice currency to display currency

                    // Use invoice's effective shipping tax rate when context rate is null (proportional mode)
                    // This allows tax-inclusive shipping display even when no specific rate is configured
                    var effectiveContext = displayContext.ShippingTaxRate.HasValue
                        ? displayContext
                        : displayContext with { ShippingTaxRate = confirmation.EffectiveShippingTaxRate };

                    var displayAmounts = DisplayCurrencyExtensions.GetDisplayAmounts(
                        confirmation.Total,
                        confirmation.SubTotal,
                        confirmation.Shipping,
                        confirmation.Tax,
                        confirmation.Discount,
                        effectiveContext,
                        currencyService);

                    confirmation.ExchangeRate = displayContext.ExchangeRate;
                    confirmation.DisplayCurrencyCode = displayContext.CurrencyCode;
                    confirmation.DisplayCurrencySymbol = displayContext.CurrencySymbol;
                    confirmation.DisplayPricesIncTax = displayAmounts.DisplayPricesIncTax;

                    confirmation.DisplayTotal = displayAmounts.Total;
                    confirmation.FormattedDisplayTotal = $"{symbol}{displayAmounts.Total.ToString(format)}";
                    confirmation.DisplaySubTotal = displayAmounts.SubTotal;
                    confirmation.FormattedDisplaySubTotal = $"{symbol}{displayAmounts.SubTotal.ToString(format)}";
                    confirmation.DisplayShipping = displayAmounts.Shipping;
                    confirmation.FormattedDisplayShipping = $"{symbol}{displayAmounts.Shipping.ToString(format)}";
                    confirmation.DisplayTax = displayAmounts.Tax;
                    confirmation.FormattedDisplayTax = $"{symbol}{displayAmounts.Tax.ToString(format)}";
                    confirmation.DisplayDiscount = displayAmounts.Discount;
                    confirmation.FormattedDisplayDiscount = $"{symbol}{displayAmounts.Discount.ToString(format)}";
                    confirmation.TaxIncludedMessage = displayAmounts.TaxIncludedMessage;

                    // Convert line item display values
                    var rate = displayContext.ExchangeRate;
                    foreach (var li in confirmation.LineItems)
                    {
                        li.DisplayUnitPrice = currencyService.Round(li.UnitPrice * rate, currency);
                        li.DisplayLineTotal = currencyService.Round(li.LineTotal * rate, currency);
                        li.FormattedDisplayUnitPrice = $"{symbol}{li.DisplayUnitPrice.ToString(format)}";
                        li.FormattedDisplayLineTotal = $"{symbol}{li.DisplayLineTotal.ToString(format)}";
                    }
                }
                else
                {
                    // Same currency - invoice amounts are already correct, just format them
                    confirmation.ExchangeRate = 1m;
                    confirmation.DisplayCurrencyCode = displayContext.CurrencyCode;
                    confirmation.DisplayCurrencySymbol = displayContext.CurrencySymbol;
                    confirmation.DisplayPricesIncTax = displayContext.DisplayPricesIncTax;

                    // Use invoice amounts directly (already in correct currency)
                    confirmation.FormattedDisplayTotal = $"{symbol}{confirmation.DisplayTotal.ToString(format)}";
                    confirmation.FormattedDisplaySubTotal = $"{symbol}{confirmation.DisplaySubTotal.ToString(format)}";
                    confirmation.FormattedDisplayShipping = $"{symbol}{confirmation.DisplayShipping.ToString(format)}";
                    confirmation.FormattedDisplayTax = $"{symbol}{confirmation.DisplayTax.ToString(format)}";
                    confirmation.FormattedDisplayDiscount = $"{symbol}{confirmation.DisplayDiscount.ToString(format)}";

                    // Generate tax included message if applicable
                    if (displayContext.DisplayPricesIncTax && confirmation.DisplayTax > 0)
                    {
                        confirmation.TaxIncludedMessage = $"Including {symbol}{confirmation.DisplayTax.ToString(format)} in taxes";
                    }

                    // Line item display values are already set from GetOrderConfirmationAsync
                    // Just format them
                    foreach (var li in confirmation.LineItems)
                    {
                        li.FormattedDisplayUnitPrice = $"{symbol}{li.DisplayUnitPrice.ToString(format)}";
                        li.FormattedDisplayLineTotal = $"{symbol}{li.DisplayLineTotal.ToString(format)}";
                    }
                }

                foreach (var li in confirmation.LineItems)
                {
                    var displayUnitPriceWithAddons = li.GetDisplayLineItemUnitPriceWithAddons(confirmation.LineItems);
                    var displayLineTotalWithAddons = li.GetDisplayLineItemTotalWithAddons(confirmation.LineItems);
                    li.DisplayUnitPriceWithAddons = displayUnitPriceWithAddons;
                    li.DisplayLineTotalWithAddons = displayLineTotalWithAddons;
                    li.FormattedDisplayUnitPriceWithAddons = $"{symbol}{displayUnitPriceWithAddons.ToString(format)}";
                    li.FormattedDisplayLineTotalWithAddons = $"{symbol}{displayLineTotalWithAddons.ToString(format)}";
                }

                // Calculate tax-inclusive subtotal from line items
                var (rawTaxInclusiveSubTotal, productItemCount) = confirmation.LineItems
                    .GetRawTaxInclusiveSubTotal(displayContext.DisplayPricesIncTax, currencyService, currency);

                // Calculate tax-inclusive shipping and discount for reconciliation
                decimal taxInclusiveShipping = confirmation.DisplayShipping;
                decimal taxInclusiveDiscount = confirmation.DisplayDiscount;

                if (displayContext.DisplayPricesIncTax)
                {
                    // Apply shipping tax if needed (same currency case where it's not already applied)
                    // Use provider rate if available, otherwise use invoice's effective rate (for proportional mode)
                    if (displayContext.IsShippingTaxable && confirmation.DisplayShipping > 0 && !needsConversion)
                    {
                        // Try to get the shipping tax rate - first from provider, then from invoice's effective rate
                        var shippingTaxRate = displayContext.ShippingTaxRate ?? confirmation.EffectiveShippingTaxRate;

                        if (shippingTaxRate.HasValue && shippingTaxRate.Value > 0)
                        {
                            taxInclusiveShipping = currencyService.Round(
                                confirmation.DisplayShipping * (1 + (shippingTaxRate.Value / 100m)),
                                currency);

                            // Update the displayed shipping to show tax-inclusive value
                            confirmation.DisplayShipping = taxInclusiveShipping;
                            confirmation.FormattedDisplayShipping = $"{symbol}{taxInclusiveShipping.ToString(format)}";
                        }
                    }

                    // Calculate tax-inclusive discount using effective tax rate
                    if (confirmation.DisplayDiscount > 0 && confirmation.DisplaySubTotal > 0)
                    {
                        var effectiveTaxRate = confirmation.DisplayTax / confirmation.DisplaySubTotal;
                        taxInclusiveDiscount = currencyService.Round(
                            confirmation.DisplayDiscount * (1 + effectiveTaxRate),
                            currency);
                    }
                }

                // Use centralized reconciliation method
                var taxInclusiveSubTotal = DisplayCurrencyExtensions.ReconcileTaxInclusiveSubTotal(
                    rawTaxInclusiveSubTotal,
                    productItemCount,
                    confirmation.DisplayTotal,
                    taxInclusiveShipping,
                    taxInclusiveDiscount);

                confirmation.TaxInclusiveDisplaySubTotal = taxInclusiveSubTotal;
                confirmation.FormattedTaxInclusiveDisplaySubTotal = $"{symbol}{taxInclusiveSubTotal.ToString(format)}";
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
                _merchelloSettings.Store,
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

        // Handle post-purchase upsell step
        if (checkoutPage.Step == CheckoutStep.PostPurchase)
        {
            // Prevent caching of post-purchase page
            Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0";
            Response.Headers["Pragma"] = "no-cache";
            Response.Headers["Expires"] = "0";

            var postPurchaseViewModel = new CheckoutViewModel(
                checkoutPage.Step,
                _settings,
                _merchelloSettings.Store);

            if (!checkoutPage.InvoiceId.HasValue)
            {
                return View("~/Views/Checkout/PostPurchase.cshtml", postPurchaseViewModel);
            }

            // Security: Verify the user has permission to view this post-purchase flow
            var confirmationToken = Request.Cookies[Core.Constants.Cookies.ConfirmationToken];
            if (string.IsNullOrEmpty(confirmationToken) ||
                !Guid.TryParse(confirmationToken, out var tokenInvoiceId) ||
                tokenInvoiceId != checkoutPage.InvoiceId.Value)
            {
                logger.LogWarning(
                    "Unauthorized post-purchase access attempt for invoice {InvoiceId}. Token: {Token}",
                    checkoutPage.InvoiceId.Value,
                    confirmationToken ?? "missing");

                return View("~/Views/Checkout/PostPurchase.cshtml", postPurchaseViewModel);
            }

            ViewData["InvoiceId"] = checkoutPage.InvoiceId.Value;
            ViewData["ConfirmationUrl"] = $"/checkout/confirmation/{checkoutPage.InvoiceId.Value}";

            return View("~/Views/Checkout/PostPurchase.cshtml", postPurchaseViewModel);
        }

        // Handle payment return/cancel steps
        if (checkoutPage.Step == CheckoutStep.PaymentReturn)
        {
            return View("~/Views/Checkout/Return.cshtml", new CheckoutViewModel(checkoutPage.Step, _settings, _merchelloSettings.Store));
        }

        if (checkoutPage.Step == CheckoutStep.PaymentCancelled)
        {
            return View("~/Views/Checkout/Cancel.cshtml", new CheckoutViewModel(checkoutPage.Step, _settings, _merchelloSettings.Store));
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

        // Get full display context (currency + tax-inclusive settings)
        var displayContext = await storefrontContext.GetDisplayContextAsync(ct);
        var displayCurrencyCode = displayContext.CurrencyCode;
        var displayCurrencySymbol = displayContext.CurrencySymbol;
        var exchangeRate = displayContext.ExchangeRate;

        // Load checkout session if basket exists
        var session = await checkoutSessionService.GetSessionAsync(basket.Id, ct);

        // Load available countries for billing (all countries) and shipping (restricted by warehouse regions)
        var billingCountriesResult = await checkoutService.GetAllCountriesAsync(
            new GetAvailableBillingCountriesParameters(),
            ct);
        var billingCountries = billingCountriesResult.Select(c => new CountryDto { Code = c.Code, Name = c.Name }).ToList();

        var shippingCountriesResult = await checkoutService.GetAvailableCountriesAsync(
            new GetAvailableShippingCountriesParameters(),
            ct);
        var shippingCountries = shippingCountriesResult.Select(c => new CountryDto { Code = c.Code, Name = c.Name }).ToList();

        // Determine default country - prioritize storefront cookie (user's current selection) over saved data
        var storefrontLocation = await storefrontContext.GetShippingLocationAsync(ct);
        var defaultCountryCode = storefrontLocation.CountryCode
            ?? session?.ShippingAddress?.CountryCode
            ?? basket.ShippingAddress?.CountryCode
            ?? _merchelloSettings.DefaultShippingCountry
            ?? "US";

        var defaultStateCode = storefrontLocation.RegionCode
            ?? session?.ShippingAddress?.CountyState?.RegionCode
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
                    AutoSelectShipping = true,
                    Email = session?.BillingAddress.Email
                }, ct);

            if (initResult.Success && initResult.ResultObject != null)
            {
                // Update basket with calculated totals
                basket = initResult.ResultObject.Basket;

                // Get shipping groups with selections - use display context for tax-inclusive pricing
                shippingGroups = MapOrderGroupsToDto(
                    initResult.ResultObject.GroupingResult,
                    displayCurrencySymbol,
                    initResult.ResultObject.AutoSelectedShippingOptions,
                    displayContext,
                    currencyService,
                    basket.EffectiveShippingTaxRate);
            }
        }

        // Reload session after initialization (may have been updated)
        session = await checkoutSessionService.GetSessionAsync(basket.Id, ct);

        // Check if there are any active discount codes to show the discount input
        var showDiscountCode = await discountService.HasActiveCodeDiscountsAsync(ct);

        // Check if the current user is logged in as a member
        var currentMember = await memberManager.GetCurrentMemberAsync();
        var isLoggedIn = currentMember != null;

        // Check if basket contains digital products (requires account creation)
        var hasDigitalProducts = await checkoutService.BasketHasDigitalProductsAsync(
            new BasketHasDigitalProductsParameters { Basket = basket },
            ct);

        // Calculate display amounts using centralized method (includes tax-inclusive calculations and GROSS reconciliation)
        var displayAmounts = basket.GetDisplayAmounts(displayContext, currencyService);

        var addressLookupConfig = await addressLookupService.GetClientConfigAsync(null, ct);

        var viewModel = new CheckoutViewModel(
            CheckoutStep.Information,
            _settings,
            _merchelloSettings.Store,
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
            CurrencyDecimalPlaces = displayContext.DecimalPlaces,
            ShowDiscountCode = showDiscountCode,
            IsLoggedIn = isLoggedIn,
            HasDigitalProducts = hasDigitalProducts,
            DisplayTotal = displayAmounts.Total,
            DisplaySubTotal = displayAmounts.SubTotal,
            DisplayShipping = displayAmounts.Shipping,
            DisplayTax = displayAmounts.Tax,
            DisplayDiscount = displayAmounts.Discount,
            // Tax-inclusive display properties (use reconciled values from DisplayAmounts)
            DisplayPricesIncTax = displayAmounts.DisplayPricesIncTax,
            TaxInclusiveDisplaySubTotal = displayAmounts.TaxInclusiveSubTotal,
            FormattedTaxInclusiveDisplaySubTotal = $"{displayCurrencySymbol}{displayAmounts.TaxInclusiveSubTotal.ToString($"N{displayContext.DecimalPlaces}")}",
            TaxIncludedMessage = displayAmounts.TaxIncludedMessage,
            AddressLookup = addressLookupConfig
        };

        return View("~/Views/Checkout/SinglePage.cshtml", viewModel);
    }

    private bool TryGetRecoveryTokenFromPath(out string token)
    {
        token = string.Empty;

        var segments = Request.Path.Value?
            .Trim('/')
            .Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        if (segments is not { Length: 3 })
        {
            return false;
        }

        if (!segments[0].Equals("checkout", StringComparison.OrdinalIgnoreCase) ||
            !segments[1].Equals("recover", StringComparison.OrdinalIgnoreCase) ||
            string.IsNullOrWhiteSpace(segments[2]))
        {
            return false;
        }

        token = segments[2];
        return true;
    }

    private async Task<IActionResult> HandleRecoveryLinkAsync(string token, CancellationToken ct)
    {
        if (abandonedCheckoutService == null)
        {
            logger.LogWarning("Abandoned checkout service unavailable for recovery token route.");
            return Redirect("/checkout/information");
        }

        var recoveryResult = await abandonedCheckoutService.RestoreBasketFromRecoveryAsync(token, ct);
        if (recoveryResult.ResultObject == null)
        {
            var message = recoveryResult.Messages.FirstOrDefault()?.Message ?? "Unable to recover basket.";
            logger.LogInformation("Checkout recovery link failed: {Message}", message);
            return Redirect("/checkout/information");
        }

        var basket = recoveryResult.ResultObject;
        await checkoutService.SaveBasketAsync(new SaveBasketParameters { Basket = basket }, ct);
        EnsureBasketCookie(basket);

        return Redirect("/checkout/information");
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

    private static List<ShippingGroupDto> MapOrderGroupsToDto(
        Core.Checkout.Strategies.Models.OrderGroupingResult result,
        string currencySymbol,
        Dictionary<Guid, string>? selectedOptions,
        StorefrontDisplayContext displayContext,
        ICurrencyService currencyService,
        decimal? effectiveShippingTaxRate = null)
    {
        var exchangeRate = displayContext.ExchangeRate;

        // Use basket's effective shipping tax rate when context rate is null (proportional mode)
        var effectiveContext = displayContext.ShippingTaxRate.HasValue
            ? displayContext
            : displayContext with { ShippingTaxRate = effectiveShippingTaxRate };

        return result.Groups.Select(group => new ShippingGroupDto
        {
            GroupId = group.GroupId,
            GroupName = group.GroupName,
            WarehouseId = group.WarehouseId,
            LineItems = group.LineItems.Select(li =>
            {
                var lineTotal = li.Amount * li.Quantity;
                var displayLineTotal = currencyService.Round(lineTotal * exchangeRate, displayContext.CurrencyCode);
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
                var displayCost = DisplayCurrencyExtensions.GetDisplayShippingOptionCost(
                    opt.Cost, effectiveContext, currencyService);
                return new CheckoutShippingOptionDto
                {
                    Id = opt.ShippingOptionId,
                    Name = opt.Name,
                    DaysFrom = opt.DaysFrom,
                    DaysTo = opt.DaysTo,
                    IsNextDay = opt.IsNextDay,
                    Cost = displayCost,
                    FormattedCost = displayCost.FormatWithSymbol(currencySymbol),
                    DeliveryDescription = opt.DeliveryTimeDescription,
                    ProviderKey = opt.ProviderKey,
                    SelectionKey = opt.SelectionKey,
                    ServiceCode = opt.ServiceCode,
                    EstimatedDeliveryDate = opt.EstimatedDeliveryDate,
                    IsFallbackRate = opt.IsFallbackRate,
                    FallbackReason = opt.FallbackReason
                };
            }).ToList(),
            SelectedShippingOptionId = selectedOptions?.TryGetValue(group.GroupId, out var selectedId) == true
                ? selectedId
                : group.SelectedShippingOptionId,
            HasFallbackRates = group.AvailableShippingOptions.Any(o => o.IsFallbackRate)
        }).ToList();
    }
}

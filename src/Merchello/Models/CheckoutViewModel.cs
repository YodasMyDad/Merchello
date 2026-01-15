using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Models;

namespace Merchello.Models;

/// <summary>
/// View model for checkout pages.
/// Passed to Razor views to render the checkout UI.
/// </summary>
public class CheckoutViewModel
{
    public CheckoutViewModel(
        CheckoutStep step,
        CheckoutSettings settings,
        Basket? basket = null,
        CheckoutSession? session = null,
        IReadOnlyCollection<CountryDto>? billingCountries = null,
        IReadOnlyCollection<CountryDto>? shippingCountries = null,
        IReadOnlyCollection<ShippingGroupDto>? shippingGroups = null,
        OrderConfirmationDto? confirmation = null)
    {
        Step = step;
        Settings = settings;
        Basket = basket;
        Session = session;
        BillingCountries = billingCountries ?? [];
        ShippingCountries = shippingCountries ?? [];
        ShippingGroups = shippingGroups ?? [];
        Confirmation = confirmation;
    }

    /// <summary>
    /// The current checkout step.
    /// </summary>
    public CheckoutStep Step { get; }

    /// <summary>
    /// Checkout branding and configuration settings.
    /// </summary>
    public CheckoutSettings Settings { get; }

    /// <summary>
    /// The shopping basket (null if no basket exists).
    /// </summary>
    public Basket? Basket { get; }

    /// <summary>
    /// The checkout session tracking progress (null if not started).
    /// </summary>
    public CheckoutSession? Session { get; }

    /// <summary>
    /// Available countries for billing address (all countries, no restrictions).
    /// </summary>
    public IReadOnlyCollection<CountryDto> BillingCountries { get; }

    /// <summary>
    /// Available countries for shipping address (only countries we can ship to).
    /// </summary>
    public IReadOnlyCollection<CountryDto> ShippingCountries { get; }

    /// <summary>
    /// Shipping groups with available options (for Shipping step).
    /// </summary>
    public IReadOnlyCollection<ShippingGroupDto> ShippingGroups { get; }

    /// <summary>
    /// Order confirmation data (for Confirmation step).
    /// </summary>
    public OrderConfirmationDto? Confirmation { get; }

    /// <summary>
    /// Whether the basket has items.
    /// </summary>
    public bool HasItems => Basket is not null && Basket.LineItems.Count > 0;

    /// <summary>
    /// CSS class for logo position.
    /// </summary>
    public string LogoPositionClass => Settings.LogoPosition switch
    {
        LogoPosition.Left => "justify-start",
        LogoPosition.Center => "justify-center",
        LogoPosition.Right => "justify-end",
        _ => "justify-start"
    };

    /// <summary>
    /// Default country code for single-page checkout initialization.
    /// </summary>
    public string? DefaultCountryCode { get; init; }

    /// <summary>
    /// Default state/region code for single-page checkout initialization.
    /// </summary>
    public string? DefaultStateCode { get; init; }

    /// <summary>
    /// Whether this is a single-page checkout view.
    /// </summary>
    public bool IsSinglePageCheckout { get; init; }

    /// <summary>
    /// Customer's selected display currency code (e.g., "GBP").
    /// </summary>
    public string? DisplayCurrencyCode { get; init; }

    /// <summary>
    /// Customer's selected display currency symbol (e.g., "£").
    /// </summary>
    public string? DisplayCurrencySymbol { get; init; }

    /// <summary>
    /// Exchange rate from store currency to display currency.
    /// </summary>
    public decimal ExchangeRate { get; init; } = 1m;

    /// <summary>
    /// Number of decimal places for the display currency (e.g., 2 for GBP, 0 for JPY).
    /// Used for proper formatting in views.
    /// </summary>
    public int CurrencyDecimalPlaces { get; init; } = 2;

    /// <summary>
    /// Whether to show the discount code input.
    /// True when there are active code-based discounts available.
    /// </summary>
    public bool ShowDiscountCode { get; init; }

    /// <summary>
    /// Pre-serialized line items JSON for analytics tracking.
    /// Set by the controller to avoid JSON serialization in views.
    /// </summary>
    public string? LineItemsJson { get; init; }

    /// <summary>
    /// Pre-calculated display total in customer's selected currency.
    /// Properly rounded using ICurrencyService.
    /// </summary>
    public decimal DisplayTotal { get; init; }

    /// <summary>
    /// Pre-calculated display subtotal in customer's selected currency.
    /// </summary>
    public decimal DisplaySubTotal { get; init; }

    /// <summary>
    /// Pre-calculated display shipping in customer's selected currency.
    /// </summary>
    public decimal DisplayShipping { get; init; }

    /// <summary>
    /// Pre-calculated display tax in customer's selected currency.
    /// </summary>
    public decimal DisplayTax { get; init; }

    /// <summary>
    /// Pre-calculated display discount in customer's selected currency.
    /// </summary>
    public decimal DisplayDiscount { get; init; }

    // Tax-inclusive display (when DisplayPricesIncTax setting is enabled)

    /// <summary>
    /// Whether prices are displayed including tax.
    /// </summary>
    public bool DisplayPricesIncTax { get; init; }

    /// <summary>
    /// Subtotal including tax in display currency (for tax-inclusive display).
    /// </summary>
    public decimal TaxInclusiveDisplaySubTotal { get; init; }

    /// <summary>
    /// Formatted subtotal including tax in display currency.
    /// </summary>
    public string? FormattedTaxInclusiveDisplaySubTotal { get; init; }

    /// <summary>
    /// Tax included message (e.g., "Including £10.17 in taxes").
    /// </summary>
    public string? TaxIncludedMessage { get; init; }
}

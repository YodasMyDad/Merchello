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
        IReadOnlyCollection<CountryDto>? countries = null,
        IReadOnlyCollection<ShippingGroupDto>? shippingGroups = null,
        OrderConfirmationDto? confirmation = null)
    {
        Step = step;
        Settings = settings;
        Basket = basket;
        Session = session;
        Countries = countries ?? [];
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
    /// Available countries for address selection.
    /// </summary>
    public IReadOnlyCollection<CountryDto> Countries { get; }

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
}

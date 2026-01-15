using Merchello.Core.Checkout.Models;

namespace Merchello.Core.Checkout.Services.Parameters;

/// <summary>
/// Parameters for calculating a basket
/// </summary>
public class CalculateBasketParameters
{
    /// <summary>
    /// The basket to calculate
    /// </summary>
    public required Basket Basket { get; init; }

    /// <summary>
    /// Country code for shipping/tax. When null, uses DefaultShippingCountry from settings.
    /// </summary>
    public string? CountryCode { get; init; }

    /// <summary>
    /// Default tax rate percentage. Defaults to 20%.
    /// </summary>
    public decimal DefaultTaxRate { get; init; } = 20m;

    /// <summary>
    /// Whether shipping should be taxable. When null (default), queries the tax provider config.
    /// </summary>
    public bool? IsShippingTaxable { get; init; }

    /// <summary>
    /// When set, use this shipping amount instead of auto-selecting from quotes.
    /// Used when the user has explicitly selected a shipping option.
    /// </summary>
    public decimal? ShippingAmountOverride { get; init; }
}

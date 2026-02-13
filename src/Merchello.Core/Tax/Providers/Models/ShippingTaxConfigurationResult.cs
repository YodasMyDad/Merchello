namespace Merchello.Core.Tax.Providers.Models;

public class ShippingTaxConfigurationResult
{
    public ShippingTaxMode Mode { get; init; }

    /// <summary>
    /// Rate percentage (0-100) when <see cref="Mode"/> is <see cref="ShippingTaxMode.FixedRate"/>.
    /// Null for proportional/provider-calculated modes.
    /// </summary>
    public decimal? Rate { get; init; }

    public static ShippingTaxConfigurationResult NotTaxed() => new()
    {
        Mode = ShippingTaxMode.NotTaxed,
        Rate = 0m
    };

    public static ShippingTaxConfigurationResult FixedRate(decimal rate) => new()
    {
        Mode = ShippingTaxMode.FixedRate,
        Rate = rate
    };

    public static ShippingTaxConfigurationResult Proportional() => new()
    {
        Mode = ShippingTaxMode.Proportional,
        Rate = null
    };

    public static ShippingTaxConfigurationResult ProviderCalculated() => new()
    {
        Mode = ShippingTaxMode.ProviderCalculated,
        Rate = null
    };
}

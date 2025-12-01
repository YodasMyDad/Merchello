namespace Merchello.Core.Shipping.Providers;

/// <summary>
/// Snapshot of a shipping cost entry for a shipping option.
/// </summary>
public class ShippingCostSnapshot
{
    public string CountryCode { get; init; } = null!;
    public string? StateOrProvinceCode { get; init; }
    public decimal Cost { get; init; }
}

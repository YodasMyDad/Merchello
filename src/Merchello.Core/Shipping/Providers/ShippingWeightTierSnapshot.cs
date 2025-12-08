namespace Merchello.Core.Shipping.Providers;

/// <summary>
/// Snapshot of a weight tier entry for a shipping option.
/// </summary>
public class ShippingWeightTierSnapshot
{
    public string CountryCode { get; init; } = null!;
    public string? StateOrProvinceCode { get; init; }
    public decimal MinWeightKg { get; init; }
    public decimal? MaxWeightKg { get; init; }
    public decimal Surcharge { get; init; }
}

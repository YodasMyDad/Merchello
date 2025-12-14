namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// DTO for weight tier entries.
/// </summary>
public class ShippingWeightTierDto
{
    public Guid Id { get; set; }
    public string CountryCode { get; set; } = null!;
    public string? StateOrProvinceCode { get; set; }
    public decimal MinWeightKg { get; set; }
    public decimal? MaxWeightKg { get; set; }
    public decimal Surcharge { get; set; }

    /// <summary>
    /// Display-friendly weight range (e.g., "5-10 kg" or "20+ kg").
    /// </summary>
    public string? WeightRangeDisplay { get; set; }

    /// <summary>
    /// Display-friendly region name.
    /// </summary>
    public string? RegionDisplay { get; set; }
}

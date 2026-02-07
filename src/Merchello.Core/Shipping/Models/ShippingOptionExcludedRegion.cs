using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Shipping.Models;

/// <summary>
/// Explicit destination exclusion for a shipping option.
/// Country-level exclusions block all regions for that country.
/// </summary>
public class ShippingOptionExcludedRegion
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// ISO 3166-1 alpha-2 country code or "*" for all countries.
    /// </summary>
    public string CountryCode { get; set; } = null!;

    /// <summary>
    /// Optional region code (ISO 3166-2 where available).
    /// </summary>
    [System.Text.Json.Serialization.JsonPropertyName("StateOrProvinceCode")]
    public string? RegionCode { get; set; }
}

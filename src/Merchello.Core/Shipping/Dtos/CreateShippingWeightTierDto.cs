namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// DTO for creating/updating a weight tier.
/// </summary>
public class CreateShippingWeightTierDto
{
    public required string CountryCode { get; set; }
    public string? RegionCode { get; set; }
    public required decimal MinWeightKg { get; set; }
    public decimal? MaxWeightKg { get; set; }
    public required decimal Surcharge { get; set; }
}

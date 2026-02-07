namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Destination exclusion configured on a shipping option.
/// </summary>
public class ShippingDestinationExclusionDto
{
    public Guid Id { get; set; }
    public string CountryCode { get; set; } = null!;
    public string? RegionCode { get; set; }
    public string? RegionDisplay { get; set; }
}

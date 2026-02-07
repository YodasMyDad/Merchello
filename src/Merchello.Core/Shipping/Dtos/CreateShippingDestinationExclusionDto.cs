namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Destination exclusion payload for shipping option create/update.
/// </summary>
public class CreateShippingDestinationExclusionDto
{
    public required string CountryCode { get; set; }
    public string? RegionCode { get; set; }
}

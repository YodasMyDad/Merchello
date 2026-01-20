namespace Merchello.Core.Storefront.Dtos;

/// <summary>
/// Request to set shipping country/region
/// </summary>
public class SetCountryDto
{
    public required string CountryCode { get; set; }
    public string? RegionCode { get; set; }
}

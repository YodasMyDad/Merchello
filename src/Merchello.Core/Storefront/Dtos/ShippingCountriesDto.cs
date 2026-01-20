namespace Merchello.Core.Storefront.Dtos;

/// <summary>
/// Available shipping countries with current selection
/// </summary>
public class ShippingCountriesDto
{
    public required List<StorefrontCountryDto> Countries { get; set; }
    public required StorefrontCountryDto Current { get; set; }
    public string? CurrentRegionCode { get; set; }
    public string? CurrentRegionName { get; set; }
    public required StorefrontCurrencyDto Currency { get; set; }
}

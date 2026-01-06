namespace Merchello.Core.Storefront.Dtos;

/// <summary>
/// Country information for storefront
/// </summary>
public class StorefrontCountryDto
{
    public required string CountryCode { get; set; }
    public required string CountryName { get; set; }
}

/// <summary>
/// Result of setting country (includes currency change info)
/// </summary>
public class SetCountryResultDto
{
    public required string CountryCode { get; set; }
    public required string CountryName { get; set; }
    public required string CurrencyCode { get; set; }
    public required string CurrencySymbol { get; set; }
}

/// <summary>
/// Currency information for storefront
/// </summary>
public class StorefrontCurrencyDto
{
    public required string CurrencyCode { get; set; }
    public required string CurrencySymbol { get; set; }
    public int DecimalPlaces { get; set; }
}

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

/// <summary>
/// Region/state information for storefront
/// </summary>
public class StorefrontRegionDto
{
    public required string RegionCode { get; set; }
    public required string RegionName { get; set; }
}

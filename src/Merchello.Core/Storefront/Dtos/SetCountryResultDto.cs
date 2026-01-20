namespace Merchello.Core.Storefront.Dtos;

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

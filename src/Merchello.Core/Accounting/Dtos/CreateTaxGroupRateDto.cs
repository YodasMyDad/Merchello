namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// DTO for creating a new geographic tax rate
/// </summary>
public class CreateTaxGroupRateDto
{
    /// <summary>
    /// ISO 3166-1 alpha-2 country code (e.g., "US", "GB")
    /// </summary>
    public string CountryCode { get; set; } = string.Empty;

    /// <summary>
    /// Optional ISO 3166-2 state/province code (e.g., "CA" for California).
    /// When null or empty, the rate applies to the entire country.
    /// </summary>
    public string? RegionCode { get; set; }

    /// <summary>
    /// Tax percentage rate (0-100)
    /// </summary>
    public decimal TaxPercentage { get; set; }
}

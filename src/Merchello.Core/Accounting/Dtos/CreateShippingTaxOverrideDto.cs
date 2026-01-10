namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// DTO for creating a new shipping tax override
/// </summary>
public class CreateShippingTaxOverrideDto
{
    /// <summary>
    /// ISO 3166-1 alpha-2 country code (e.g., "US", "GB")
    /// </summary>
    public string CountryCode { get; set; } = string.Empty;

    /// <summary>
    /// Optional ISO 3166-2 state/province code (e.g., "CA" for California).
    /// When null or empty, the override applies to the entire country.
    /// </summary>
    public string? StateOrProvinceCode { get; set; }

    /// <summary>
    /// Tax group ID for shipping. Null means shipping is never taxed in this region.
    /// </summary>
    public Guid? ShippingTaxGroupId { get; set; }
}

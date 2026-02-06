namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Geographic tax rate data transfer object
/// </summary>
public class TaxGroupRateDto
{
    /// <summary>
    /// Rate ID
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Parent tax group ID
    /// </summary>
    public Guid TaxGroupId { get; set; }

    /// <summary>
    /// ISO 3166-1 alpha-2 country code (e.g., "US", "GB")
    /// </summary>
    public string CountryCode { get; set; } = string.Empty;

    /// <summary>
    /// Optional ISO 3166-2 state/province code (e.g., "CA" for California)
    /// </summary>
    public string? RegionCode { get; set; }

    /// <summary>
    /// Tax percentage rate (0-100)
    /// </summary>
    public decimal TaxPercentage { get; set; }

    /// <summary>
    /// Country display name (for UI)
    /// </summary>
    public string? CountryName { get; set; }

    /// <summary>
    /// State/province display name (for UI)
    /// </summary>
    public string? RegionName { get; set; }
}

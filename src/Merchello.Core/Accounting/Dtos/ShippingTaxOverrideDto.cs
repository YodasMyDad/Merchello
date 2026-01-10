namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Shipping tax override data transfer object
/// </summary>
public class ShippingTaxOverrideDto
{
    /// <summary>
    /// Override ID
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// ISO 3166-1 alpha-2 country code (e.g., "US", "GB")
    /// </summary>
    public string CountryCode { get; set; } = string.Empty;

    /// <summary>
    /// Optional ISO 3166-2 state/province code (e.g., "CA" for California)
    /// </summary>
    public string? StateOrProvinceCode { get; set; }

    /// <summary>
    /// Tax group ID for shipping in this region. Null means shipping is never taxed.
    /// </summary>
    public Guid? ShippingTaxGroupId { get; set; }

    /// <summary>
    /// Tax group name (for UI display)
    /// </summary>
    public string? ShippingTaxGroupName { get; set; }

    /// <summary>
    /// Tax group percentage (for UI display)
    /// </summary>
    public decimal? ShippingTaxGroupPercentage { get; set; }

    /// <summary>
    /// Country display name (for UI)
    /// </summary>
    public string? CountryName { get; set; }

    /// <summary>
    /// State/province display name (for UI)
    /// </summary>
    public string? RegionName { get; set; }

    /// <summary>
    /// Date created
    /// </summary>
    public DateTime DateCreated { get; set; }

    /// <summary>
    /// Date updated
    /// </summary>
    public DateTime DateUpdated { get; set; }
}

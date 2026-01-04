using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Accounting.Models;

/// <summary>
/// Geographic-specific tax rate for a tax group.
/// Allows different tax rates per country and optionally per state/province.
/// </summary>
public class TaxGroupRate
{
    /// <summary>
    /// Unique identifier
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// Parent tax group ID
    /// </summary>
    public Guid TaxGroupId { get; set; }

    /// <summary>
    /// Parent tax group
    /// </summary>
    public TaxGroup TaxGroup { get; set; } = null!;

    /// <summary>
    /// ISO 3166-1 alpha-2 country code (e.g., "US", "GB", "CA")
    /// </summary>
    public string CountryCode { get; set; } = null!;

    /// <summary>
    /// Optional ISO 3166-2 state/province code (e.g., "CA" for California, "ON" for Ontario).
    /// When null, this rate applies to the entire country.
    /// </summary>
    public string? StateOrProvinceCode { get; set; }

    /// <summary>
    /// Tax percentage rate (0-100)
    /// </summary>
    public decimal TaxPercentage { get; set; }

    /// <summary>
    /// Date created
    /// </summary>
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Date updated
    /// </summary>
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;
}

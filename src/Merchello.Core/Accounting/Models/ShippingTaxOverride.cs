using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Accounting.Models;

/// <summary>
/// Regional shipping tax override for specific countries/states.
/// Allows configuring whether shipping is taxable and which tax group to use.
/// </summary>
public class ShippingTaxOverride
{
    /// <summary>
    /// Unique identifier
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// ISO 3166-1 alpha-2 country code (e.g., "US", "GB", "CA")
    /// </summary>
    public string CountryCode { get; set; } = null!;

    /// <summary>
    /// Optional ISO 3166-2 state/province code (e.g., "CA" for California, "ON" for Ontario).
    /// When null, this override applies to the entire country.
    /// </summary>
    public string? StateOrProvinceCode { get; set; }

    /// <summary>
    /// Tax group to use for shipping in this region.
    /// When null, shipping is never taxed in this region.
    /// </summary>
    public Guid? ShippingTaxGroupId { get; set; }

    /// <summary>
    /// Navigation property to the tax group
    /// </summary>
    public TaxGroup? ShippingTaxGroup { get; set; }

    /// <summary>
    /// Date created
    /// </summary>
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Date updated
    /// </summary>
    public DateTime DateUpdated { get; set; } = DateTime.UtcNow;
}

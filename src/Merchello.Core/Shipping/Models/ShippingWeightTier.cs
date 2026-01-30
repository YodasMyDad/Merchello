using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Shipping.Models;

/// <summary>
/// Weight-based surcharge tier for a shipping option.
/// Surcharge is added to the base ShippingCost when total weight falls within the tier range.
/// </summary>
public class ShippingWeightTier
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    // Optional: parent option for admin lookups (JSON-stored)
    public Guid ShippingOptionId { get; set; }

    /// <summary>
    /// Country code (ISO 3166-1 alpha-2) or "*" for universal default
    /// </summary>
    public string CountryCode { get; set; } = null!;

    /// <summary>
    /// Optional state/province code for more specific targeting
    /// </summary>
    public string? StateOrProvinceCode { get; set; }

    /// <summary>
    /// Minimum weight in kg (inclusive) for this tier
    /// </summary>
    public decimal MinWeightKg { get; set; }

    /// <summary>
    /// Maximum weight in kg (exclusive) for this tier. Null means unlimited.
    /// </summary>
    public decimal? MaxWeightKg { get; set; }

    /// <summary>
    /// Surcharge amount to add to base shipping cost
    /// </summary>
    public decimal Surcharge { get; set; }

    public DateTime CreateDate { get; set; } = DateTime.UtcNow;
    public DateTime UpdateDate { get; set; } = DateTime.UtcNow;
}

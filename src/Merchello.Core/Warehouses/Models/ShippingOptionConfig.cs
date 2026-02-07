namespace Merchello.Core.Warehouses.Models;

/// <summary>
/// Configuration for a shipping option (used in seeding)
/// </summary>
public class ShippingOptionConfig
{
    public required string Name { get; set; }
    public int DaysFrom { get; set; }
    public int DaysTo { get; set; }
    public decimal? Cost { get; set; }
    public bool IsNextDay { get; set; }
    public TimeSpan? NextDayCutOffTime { get; set; }
    public Dictionary<string, decimal>? CountrySpecificCosts { get; set; }

    /// <summary>
    /// Destination exclusions for this shipping option.
    /// Tuple values are (CountryCode, RegionCode).
    /// </summary>
    public List<(string CountryCode, string? RegionCode)>? ExcludedRegions { get; set; }

    /// <summary>
    /// The provider key (e.g., "flat-rate", "fedex", "ups").
    /// Defaults to "flat-rate" for manual pricing.
    /// </summary>
    public string ProviderKey { get; set; } = "flat-rate";

    /// <summary>
    /// The service type code for external providers (e.g., "FEDEX_GROUND", "UPS_NEXT_DAY_AIR").
    /// Required for external providers, null for flat-rate.
    /// </summary>
    public string? ServiceType { get; set; }

    /// <summary>
    /// Provider-specific settings as JSON (e.g., markup percentage).
    /// Used by external providers for configuration beyond standard fields.
    /// </summary>
    public string? ProviderSettings { get; set; }

    /// <summary>
    /// Whether this shipping method is enabled.
    /// </summary>
    public bool IsEnabled { get; set; } = true;
}


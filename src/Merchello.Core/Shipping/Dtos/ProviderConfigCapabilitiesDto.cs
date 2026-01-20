namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Configuration capabilities for a shipping provider.
/// </summary>
public class ProviderConfigCapabilitiesDto
{
    /// <summary>
    /// Whether this provider uses location-based cost tables.
    /// </summary>
    public bool HasLocationBasedCosts { get; set; }

    /// <summary>
    /// Whether this provider uses weight tier surcharge tables.
    /// </summary>
    public bool HasWeightTiers { get; set; }

    /// <summary>
    /// Whether this provider fetches rates from an external API.
    /// </summary>
    public bool UsesLiveRates { get; set; }

    /// <summary>
    /// Whether global configuration (API credentials) is required before use.
    /// </summary>
    public bool RequiresGlobalConfig { get; set; }
}

namespace Merchello.Core.Shipping.Providers;

/// <summary>
/// Declares what configuration capabilities a shipping provider supports.
/// Used by the UI to determine which config sections to display.
/// </summary>
public record ProviderConfigCapabilities
{
    /// <summary>
    /// Whether this provider uses location-based cost tables.
    /// If true, UI shows the ShippingCosts table editor.
    /// </summary>
    public bool HasLocationBasedCosts { get; init; }

    /// <summary>
    /// Whether this provider uses weight tier surcharge tables.
    /// If true, UI shows the WeightTiers table editor.
    /// </summary>
    public bool HasWeightTiers { get; init; }

    /// <summary>
    /// Whether this provider fetches rates from an external carrier API (e.g. FedEx, UPS).
    /// When true:
    /// - ShippingQuoteService calls GetRatesForServicesAsync (per-ShippingOption path)
    ///   and GetRatesForAllServicesAsync (warehouse-level dynamic path)
    /// - WarehouseProviderConfig controls per-warehouse markup and service exclusions
    /// - Provider discovers available services for the route at runtime
    /// When false: rates come from static cost tables (flat-rate).
    /// </summary>
    public bool UsesLiveRates { get; init; }

    /// <summary>
    /// Whether global configuration (API credentials) is required before use.
    /// If true, provider must be configured in Providers section first.
    /// </summary>
    public bool RequiresGlobalConfig { get; init; }
}

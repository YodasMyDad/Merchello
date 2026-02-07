namespace Merchello.Core.Shipping.Models;

/// <summary>
/// Represents a shipping option that is eligible for a destination after
/// exclusion, provider, warehouse, and cost/live-rate checks are applied.
/// </summary>
public sealed record EligibleShippingOption
{
    /// <summary>
    /// The underlying shipping option.
    /// </summary>
    public required ShippingOption Option { get; init; }

    /// <summary>
    /// Resolved cost for local-rate providers. Can be null for live-rate providers.
    /// </summary>
    public decimal? Cost { get; init; }

    /// <summary>
    /// Whether this option is priced by a live-rate provider.
    /// </summary>
    public bool UsesLiveRates { get; init; }
}


namespace Merchello.Core.Shipping.Providers;

/// <summary>
/// Result returned by a provider, including its service levels.
/// </summary>
public record ShippingRateQuote
{
    public required string ProviderKey { get; init; }
    public required string ProviderName { get; init; }
    public IReadOnlyCollection<ShippingServiceLevel> ServiceLevels { get; init; } = [];
    public IDictionary<string, string>? ExtendedProperties { get; init; }
    public IReadOnlyCollection<string> Errors { get; init; } = [];

    /// <summary>
    /// Provider metadata for downstream processing (e.g., checking UsesLiveRates capability).
    /// </summary>
    public ShippingProviderMetadata? Metadata { get; init; }

    /// <summary>
    /// True if these rates are from cache due to carrier API failure.
    /// </summary>
    public bool IsFallbackRate { get; init; }

    /// <summary>
    /// Reason for using fallback rate (e.g., "carrier_api_unavailable", "rate_limit_exceeded").
    /// </summary>
    public string? FallbackReason { get; init; }
}

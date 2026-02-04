namespace Merchello.Core.Caching.Refreshers;

/// <summary>
/// Payload for cache refresh messages.
/// </summary>
public sealed class MerchelloCachePayload
{
    /// <summary>
    /// Cache key prefix to clear (e.g., "exchange-rates", "locality", "shipping").
    /// </summary>
    public string? Prefix { get; init; }

    /// <summary>
    /// Specific cache key to clear.
    /// </summary>
    public string? Key { get; init; }

    /// <summary>
    /// When true, clears all Merchello cache entries.
    /// </summary>
    public bool ClearAll { get; init; }
}

namespace Merchello.Core.Caching.Models;

/// <summary>
/// Configuration options for Merchello caching.
/// Domain-specific TTLs should be configured in their respective options classes
/// (e.g., ExchangeRateOptions.CacheTtlMinutes).
/// </summary>
public class CacheOptions
{
    /// <summary>
    /// Default TTL for cache entries, in seconds.
    /// Used when no specific TTL is provided to the cache service.
    /// </summary>
    public int DefaultTtlSeconds { get; set; } = 300;
}

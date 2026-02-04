using Merchello.Core.Caching.Refreshers;
using Umbraco.Cms.Core.Cache;

namespace Merchello.Core.Caching.Extensions;

/// <summary>
/// Extension methods for distributed cache operations across load-balanced servers.
/// </summary>
public static class DistributedCacheExtensions
{
    /// <summary>
    /// Clears Merchello cache by prefix across all servers.
    /// </summary>
    /// <param name="cache">The distributed cache instance.</param>
    /// <param name="prefix">The cache key prefix to clear (e.g., "exchange-rates", "locality", "shipping").</param>
    public static void ClearMerchelloCache(this DistributedCache cache, string prefix)
    {
        cache.RefreshByPayload(
            MerchelloCacheRefresher.UniqueId,
            [new MerchelloCachePayload { Prefix = prefix }]);
    }

    /// <summary>
    /// Clears a specific Merchello cache key across all servers.
    /// </summary>
    /// <param name="cache">The distributed cache instance.</param>
    /// <param name="key">The specific cache key to clear.</param>
    public static void ClearMerchelloCacheKey(this DistributedCache cache, string key)
    {
        cache.RefreshByPayload(
            MerchelloCacheRefresher.UniqueId,
            [new MerchelloCachePayload { Key = key }]);
    }

    /// <summary>
    /// Clears all Merchello cache across all servers.
    /// </summary>
    /// <param name="cache">The distributed cache instance.</param>
    public static void ClearAllMerchelloCache(this DistributedCache cache)
    {
        cache.RefreshByPayload(
            MerchelloCacheRefresher.UniqueId,
            [new MerchelloCachePayload { ClearAll = true }]);
    }
}

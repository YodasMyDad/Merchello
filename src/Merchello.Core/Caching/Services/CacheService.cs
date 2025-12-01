using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Options;
using Merchello.Core.Shared.Options;
using Merchello.Core;

namespace Merchello.Core.Shared.Services;

public class CacheService(HybridCache cache, IOptions<CacheOptions> options)
{
    private readonly CacheOptions _options = options.Value;

    public async Task<T> GetOrCreateAsync<T>(string key,
        Func<CancellationToken, Task<T>> factory,
        TimeSpan? ttl = null,
        IEnumerable<string>? tags = null,
        CancellationToken cancellationToken = default)
    {
        var entryOptions = new HybridCacheEntryOptions
        {
            Expiration = ttl ?? TimeSpan.FromSeconds(_options.DefaultTtlSeconds),
            LocalCacheExpiration = ttl ?? TimeSpan.FromSeconds(_options.DefaultTtlSeconds)
        };
        var value = await cache.GetOrCreateAsync(
            key,
            async cancel => await factory(cancel),
            entryOptions,
            tags,
            cancellationToken);
        return value;
    }

    public Task RemoveAsync(string key, CancellationToken cancellationToken = default)
        => cache.RemoveAsync(key, cancellationToken).AsTask();

    public Task RemoveByTagAsync(string tag, CancellationToken cancellationToken = default)
        => cache.RemoveByTagAsync(tag, cancellationToken).AsTask();

    // Legacy convenience wrapper (sync)
    public T? GetSetCachedItem<T>(string cacheKey, Func<T> getCacheItem, int cacheTimeInMinutes = Constants.CacheKeys.MemoryCacheInMinutes)
    {
        var result = cache.GetOrCreateAsync(
            cacheKey,
            _ => new ValueTask<T>(getCacheItem()),
            new HybridCacheEntryOptions
            {
                Expiration = TimeSpan.FromMinutes(cacheTimeInMinutes),
                LocalCacheExpiration = TimeSpan.FromMinutes(cacheTimeInMinutes)
            });
        return result.GetAwaiter().GetResult();
    }
}

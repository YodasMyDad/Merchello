using Merchello.Core.Caching.Models;
using Merchello.Core.Caching.Services.Interfaces;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.Options;

namespace Merchello.Core.Caching.Services;

/// <summary>
/// Service for caching operations using HybridCache.
/// </summary>
public class CacheService(HybridCache cache, IOptions<CacheOptions> options) : ICacheService
{
    private readonly CacheOptions _options = options.Value;

    /// <inheritdoc />
    public async Task<T> GetOrCreateAsync<T>(
        string key,
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

    /// <inheritdoc />
    public Task RemoveAsync(string key, CancellationToken cancellationToken = default)
        => cache.RemoveAsync(key, cancellationToken).AsTask();

    /// <inheritdoc />
    public Task RemoveByTagAsync(string tag, CancellationToken cancellationToken = default)
        => cache.RemoveByTagAsync(tag, cancellationToken).AsTask();
}

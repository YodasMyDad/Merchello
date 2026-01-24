using Merchello.Core.Caching.Models;
using Merchello.Core.Caching.Services.Interfaces;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Cache;
using Umbraco.Extensions;

namespace Merchello.Core.Caching.Services;

/// <summary>
/// Cache service using Umbraco's AppCaches for automatic distributed cache support.
/// </summary>
/// <remarks>
/// Uses sync-over-async (.GetAwaiter().GetResult()) in the cache factory because Umbraco's
/// AppCaches/RuntimeCache API is synchronous. This is a known Umbraco platform limitation.
/// </remarks>
public class CacheService(AppCaches appCaches, IOptions<CacheOptions> options) : ICacheService
{
    private readonly CacheOptions _options = options.Value;

    /// <inheritdoc />
    public Task<T> GetOrCreateAsync<T>(
        string key,
        Func<CancellationToken, Task<T>> factory,
        TimeSpan? ttl = null,
        IEnumerable<string>? tags = null,
        CancellationToken cancellationToken = default)
    {
        var timeout = ttl ?? TimeSpan.FromSeconds(_options.DefaultTtlSeconds);

        // Umbraco's cache is synchronous, so we need to handle the async factory
        var result = appCaches.RuntimeCache.GetCacheItem<T>(
            key,
            () => factory(cancellationToken).GetAwaiter().GetResult(),
            timeout,
            isSliding: false);

        return Task.FromResult(result)!;
    }

    /// <inheritdoc />
    public Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        appCaches.RuntimeCache.ClearByKey(key);
        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task RemoveByTagAsync(string tag, CancellationToken cancellationToken = default)
    {
        // Tags become regex patterns - clear all keys starting with the tag
        appCaches.RuntimeCache.ClearByRegex($"^{System.Text.RegularExpressions.Regex.Escape(tag)}");
        return Task.CompletedTask;
    }
}

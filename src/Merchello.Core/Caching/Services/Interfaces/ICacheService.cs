namespace Merchello.Core.Caching.Services.Interfaces;

/// <summary>
/// Service for caching operations using HybridCache.
/// </summary>
public interface ICacheService
{
    /// <summary>
    /// Gets or creates a cached item asynchronously.
    /// </summary>
    /// <typeparam name="T">The type of the cached item.</typeparam>
    /// <param name="key">The cache key.</param>
    /// <param name="factory">Factory function to create the item if not cached.</param>
    /// <param name="ttl">Optional time-to-live override.</param>
    /// <param name="tags">Optional tags for cache invalidation.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The cached or newly created item.</returns>
    Task<T> GetOrCreateAsync<T>(
        string key,
        Func<CancellationToken, Task<T>> factory,
        TimeSpan? ttl = null,
        IEnumerable<string>? tags = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Removes an item from the cache.
    /// </summary>
    /// <param name="key">The cache key to remove.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task RemoveAsync(string key, CancellationToken cancellationToken = default);

    /// <summary>
    /// Removes all items with the specified tag from the cache.
    /// </summary>
    /// <param name="tag">The tag to remove.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task RemoveByTagAsync(string tag, CancellationToken cancellationToken = default);
}

using Merchello.Core.Caching.Models;
using Merchello.Core.Caching.Services.Interfaces;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Cache;
using Umbraco.Extensions;
using System.Text.RegularExpressions;

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
    private readonly object _tagLock = new();
    private readonly Dictionary<string, HashSet<string>> _tagToKeys = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, HashSet<string>> _keyToTags = new(StringComparer.Ordinal);

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

        RegisterTags(key, tags);

        return Task.FromResult(result)!;
    }

    /// <inheritdoc />
    public Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        appCaches.RuntimeCache.ClearByKey(key);
        RemoveKeyMappings(key);
        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task RemoveByTagAsync(string tag, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(tag))
        {
            return Task.CompletedTask;
        }

        var normalizedTag = tag.Trim();
        List<string> keysToRemove;

        lock (_tagLock)
        {
            if (!_tagToKeys.TryGetValue(normalizedTag, out var keysForTag))
            {
                keysToRemove = [];
            }
            else
            {
                keysToRemove = keysForTag.ToList();
                _tagToKeys.Remove(normalizedTag);
            }
        }

        foreach (var key in keysToRemove)
        {
            appCaches.RuntimeCache.ClearByKey(key);
            RemoveKeyMappings(key);
        }

        // Backward-compatible fallback for legacy key schemes that treated tags as prefixes.
        appCaches.RuntimeCache.ClearByRegex($"^{Regex.Escape(normalizedTag)}");
        return Task.CompletedTask;
    }

    private void RegisterTags(string key, IEnumerable<string>? tags)
    {
        if (string.IsNullOrWhiteSpace(key) || tags == null)
        {
            return;
        }

        var normalizedTags = tags
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Select(t => t.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (normalizedTags.Count == 0)
        {
            return;
        }

        lock (_tagLock)
        {
            if (!_keyToTags.TryGetValue(key, out var existingTags))
            {
                existingTags = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                _keyToTags[key] = existingTags;
            }

            foreach (var tag in normalizedTags)
            {
                existingTags.Add(tag);

                if (!_tagToKeys.TryGetValue(tag, out var keysForTag))
                {
                    keysForTag = new HashSet<string>(StringComparer.Ordinal);
                    _tagToKeys[tag] = keysForTag;
                }

                keysForTag.Add(key);
            }
        }
    }

    private void RemoveKeyMappings(string key)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            return;
        }

        lock (_tagLock)
        {
            if (!_keyToTags.TryGetValue(key, out var tagsForKey))
            {
                return;
            }

            foreach (var tag in tagsForKey)
            {
                if (!_tagToKeys.TryGetValue(tag, out var keysForTag))
                {
                    continue;
                }

                keysForTag.Remove(key);
                if (keysForTag.Count == 0)
                {
                    _tagToKeys.Remove(tag);
                }
            }

            _keyToTags.Remove(key);
        }
    }
}

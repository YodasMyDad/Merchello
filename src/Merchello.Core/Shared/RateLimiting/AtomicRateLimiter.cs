using System.Collections.Concurrent;
using Merchello.Core.Shared.RateLimiting.Interfaces;
using Merchello.Core.Shared.RateLimiting.Models;

namespace Merchello.Core.Shared.RateLimiting;

/// <summary>
/// Thread-safe rate limiter using ConcurrentDictionary with atomic operations.
/// Uses a sliding window approach with automatic cleanup of expired entries.
/// </summary>
public class AtomicRateLimiter : IRateLimiter, IDisposable
{
    private readonly ConcurrentDictionary<string, RateLimitBucket> _buckets = new();
    private readonly Timer _cleanupTimer;
    private bool _disposed;

    /// <summary>
    /// Interval at which expired entries are cleaned up.
    /// </summary>
    private static readonly TimeSpan CleanupInterval = TimeSpan.FromMinutes(5);

    public AtomicRateLimiter()
    {
        // Start background cleanup timer
        _cleanupTimer = new Timer(CleanupExpiredEntries, null, CleanupInterval, CleanupInterval);
    }

    /// <inheritdoc />
    public RateLimitResult TryAcquire(string key, int maxAttempts, TimeSpan window)
    {
        var now = DateTime.UtcNow;

        // Get or create bucket for this key
        var bucket = _buckets.GetOrAdd(key, _ => new RateLimitBucket());

        // Atomically increment and get result
        var (count, expiry) = bucket.IncrementAndGet(now, window);

        // Check if rate limit exceeded
        if (count > maxAttempts)
        {
            var retryAfter = expiry - now;
            return RateLimitResult.RateLimited(count, maxAttempts, retryAfter > TimeSpan.Zero ? retryAfter : null);
        }

        return RateLimitResult.Allowed(count, maxAttempts);
    }

    /// <inheritdoc />
    public int GetCurrentCount(string key)
    {
        if (_buckets.TryGetValue(key, out var bucket))
        {
            return bucket.GetCount(DateTime.UtcNow);
        }
        return 0;
    }

    /// <inheritdoc />
    public void Reset(string key)
    {
        _buckets.TryRemove(key, out _);
    }

    private void CleanupExpiredEntries(object? state)
    {
        if (_disposed) return;

        var now = DateTime.UtcNow;
        var keysToRemove = _buckets
            .Where(kvp => kvp.Value.IsExpired(now))
            .Select(kvp => kvp.Key)
            .ToList();

        foreach (var key in keysToRemove)
        {
            _buckets.TryRemove(key, out _);
        }
    }

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _cleanupTimer.Dispose();
        _buckets.Clear();
    }

    /// <summary>
    /// Thread-safe rate limit bucket with lock-based synchronization.
    /// Uses a per-bucket lock to ensure correctness without global contention.
    /// </summary>
    private sealed class RateLimitBucket
    {
        private readonly object _lock = new();
        private int _count;
        private DateTime _expiry = DateTime.MinValue;

        /// <summary>
        /// Atomically increments the counter, resetting if the window has expired.
        /// </summary>
        /// <returns>The new count and expiry time.</returns>
        public (int count, DateTime expiry) IncrementAndGet(DateTime now, TimeSpan window)
        {
            lock (_lock)
            {
                if (now >= _expiry)
                {
                    // Window expired - reset
                    _count = 1;
                    _expiry = now.Add(window);
                }
                else
                {
                    _count++;
                }
                return (_count, _expiry);
            }
        }

        /// <summary>
        /// Gets the current count if not expired.
        /// </summary>
        public int GetCount(DateTime now)
        {
            lock (_lock)
            {
                return now >= _expiry ? 0 : _count;
            }
        }

        /// <summary>
        /// Checks if this bucket has expired.
        /// </summary>
        public bool IsExpired(DateTime now)
        {
            lock (_lock)
            {
                return now >= _expiry;
            }
        }
    }
}

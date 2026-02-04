namespace Merchello.Core.Shared.RateLimiting;

/// <summary>
/// Thread-safe rate limit bucket with lock-based synchronization.
/// Uses a per-bucket lock to ensure correctness without global contention.
/// </summary>
internal sealed class RateLimitBucket
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

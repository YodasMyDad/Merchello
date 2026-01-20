using Merchello.Core.Shared.RateLimiting.Models;

namespace Merchello.Core.Shared.RateLimiting.Interfaces;

/// <summary>
/// Provides atomic rate limiting with configurable limits and time windows.
/// </summary>
public interface IRateLimiter
{
    /// <summary>
    /// Attempts to acquire a permit for the given key within the rate limit.
    /// This operation is atomic - the check and increment happen together.
    /// </summary>
    /// <param name="key">The rate limit key (e.g., "discount-code:{basketId}", "webhook:{provider}:{ip}").</param>
    /// <param name="maxAttempts">Maximum number of attempts allowed within the window.</param>
    /// <param name="window">The time window for rate limiting.</param>
    /// <returns>A result indicating whether the permit was acquired and current attempt count.</returns>
    RateLimitResult TryAcquire(string key, int maxAttempts, TimeSpan window);

    /// <summary>
    /// Gets the current attempt count for the given key without incrementing.
    /// </summary>
    /// <param name="key">The rate limit key.</param>
    /// <returns>The current attempt count, or 0 if no attempts recorded.</returns>
    int GetCurrentCount(string key);

    /// <summary>
    /// Resets the rate limit for the given key.
    /// </summary>
    /// <param name="key">The rate limit key to reset.</param>
    void Reset(string key);
}

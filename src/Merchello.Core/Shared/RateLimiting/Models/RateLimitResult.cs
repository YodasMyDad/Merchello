namespace Merchello.Core.Shared.RateLimiting.Models;

/// <summary>
/// Result of a rate limit check.
/// </summary>
public class RateLimitResult
{
    /// <summary>
    /// Whether the permit was acquired (request is allowed).
    /// </summary>
    public bool IsAllowed { get; init; }

    /// <summary>
    /// The current attempt count after this request.
    /// </summary>
    public int CurrentCount { get; init; }

    /// <summary>
    /// The maximum number of attempts allowed.
    /// </summary>
    public int MaxAttempts { get; init; }

    /// <summary>
    /// Time until the rate limit window resets.
    /// </summary>
    public TimeSpan? RetryAfter { get; init; }

    /// <summary>
    /// Creates a successful (allowed) result.
    /// </summary>
    public static RateLimitResult Allowed(int currentCount, int maxAttempts) => new()
    {
        IsAllowed = true,
        CurrentCount = currentCount,
        MaxAttempts = maxAttempts
    };

    /// <summary>
    /// Creates a rate-limited (denied) result.
    /// </summary>
    public static RateLimitResult RateLimited(int currentCount, int maxAttempts, TimeSpan? retryAfter = null) => new()
    {
        IsAllowed = false,
        CurrentCount = currentCount,
        MaxAttempts = maxAttempts,
        RetryAfter = retryAfter
    };
}

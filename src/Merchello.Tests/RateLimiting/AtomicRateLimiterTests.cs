using Merchello.Core.Shared.RateLimiting;
using Merchello.Core.Shared.RateLimiting.Interfaces;
using Merchello.Core.Shared.RateLimiting.Models;
using Shouldly;
using Xunit;

namespace Merchello.Tests.RateLimiting;

public class AtomicRateLimiterTests : IDisposable
{
    private readonly AtomicRateLimiter _rateLimiter;

    public AtomicRateLimiterTests()
    {
        _rateLimiter = new AtomicRateLimiter();
    }

    public void Dispose()
    {
        _rateLimiter.Dispose();
    }

    [Fact]
    public void TryAcquire_FirstRequest_ShouldBeAllowed()
    {
        // Arrange
        var key = "test-key-1";
        var maxAttempts = 5;
        var window = TimeSpan.FromMinutes(1);

        // Act
        var result = _rateLimiter.TryAcquire(key, maxAttempts, window);

        // Assert
        result.IsAllowed.ShouldBeTrue();
        result.CurrentCount.ShouldBe(1);
        result.MaxAttempts.ShouldBe(maxAttempts);
        result.RetryAfter.ShouldBeNull();
    }

    [Fact]
    public void TryAcquire_WithinLimit_ShouldAllowAllRequests()
    {
        // Arrange
        var key = "test-key-2";
        var maxAttempts = 5;
        var window = TimeSpan.FromMinutes(1);

        // Act & Assert
        for (var i = 1; i <= maxAttempts; i++)
        {
            var result = _rateLimiter.TryAcquire(key, maxAttempts, window);
            result.IsAllowed.ShouldBeTrue();
            result.CurrentCount.ShouldBe(i);
        }
    }

    [Fact]
    public void TryAcquire_ExceedingLimit_ShouldBlockRequest()
    {
        // Arrange
        var key = "test-key-3";
        var maxAttempts = 3;
        var window = TimeSpan.FromMinutes(1);

        // Exhaust the limit
        for (var i = 0; i < maxAttempts; i++)
        {
            _rateLimiter.TryAcquire(key, maxAttempts, window);
        }

        // Act - one more request should be blocked
        var result = _rateLimiter.TryAcquire(key, maxAttempts, window);

        // Assert
        result.IsAllowed.ShouldBeFalse();
        result.CurrentCount.ShouldBe(maxAttempts + 1);
        result.MaxAttempts.ShouldBe(maxAttempts);
        result.RetryAfter.ShouldNotBeNull();
        result.RetryAfter!.Value.TotalSeconds.ShouldBeGreaterThan(0);
    }

    [Fact]
    public void TryAcquire_DifferentKeys_ShouldTrackSeparately()
    {
        // Arrange
        var key1 = "test-key-4a";
        var key2 = "test-key-4b";
        var maxAttempts = 2;
        var window = TimeSpan.FromMinutes(1);

        // Exhaust limit for key1
        _rateLimiter.TryAcquire(key1, maxAttempts, window);
        _rateLimiter.TryAcquire(key1, maxAttempts, window);
        var key1Blocked = _rateLimiter.TryAcquire(key1, maxAttempts, window);

        // Act - key2 should still be allowed
        var key2Result = _rateLimiter.TryAcquire(key2, maxAttempts, window);

        // Assert
        key1Blocked.IsAllowed.ShouldBeFalse();
        key2Result.IsAllowed.ShouldBeTrue();
        key2Result.CurrentCount.ShouldBe(1);
    }

    [Fact]
    public void GetCurrentCount_NoRequests_ShouldReturnZero()
    {
        // Arrange
        var key = "test-key-5";

        // Act
        var count = _rateLimiter.GetCurrentCount(key);

        // Assert
        count.ShouldBe(0);
    }

    [Fact]
    public void GetCurrentCount_AfterRequests_ShouldReturnCorrectCount()
    {
        // Arrange
        var key = "test-key-6";
        var maxAttempts = 10;
        var window = TimeSpan.FromMinutes(1);

        _rateLimiter.TryAcquire(key, maxAttempts, window);
        _rateLimiter.TryAcquire(key, maxAttempts, window);
        _rateLimiter.TryAcquire(key, maxAttempts, window);

        // Act
        var count = _rateLimiter.GetCurrentCount(key);

        // Assert
        count.ShouldBe(3);
    }

    [Fact]
    public void Reset_ShouldClearCountForKey()
    {
        // Arrange
        var key = "test-key-7";
        var maxAttempts = 3;
        var window = TimeSpan.FromMinutes(1);

        // Exhaust the limit
        for (var i = 0; i < maxAttempts; i++)
        {
            _rateLimiter.TryAcquire(key, maxAttempts, window);
        }

        // Verify blocked
        var blockedResult = _rateLimiter.TryAcquire(key, maxAttempts, window);
        blockedResult.IsAllowed.ShouldBeFalse();

        // Act
        _rateLimiter.Reset(key);

        // Assert - should be allowed again
        var afterResetResult = _rateLimiter.TryAcquire(key, maxAttempts, window);
        afterResetResult.IsAllowed.ShouldBeTrue();
        afterResetResult.CurrentCount.ShouldBe(1);
    }

    [Fact]
    public async Task TryAcquire_AfterWindowExpires_ShouldResetCount()
    {
        // Arrange
        var key = "test-key-8";
        var maxAttempts = 2;
        var window = TimeSpan.FromMilliseconds(100); // Short window for test

        // Exhaust the limit
        _rateLimiter.TryAcquire(key, maxAttempts, window);
        _rateLimiter.TryAcquire(key, maxAttempts, window);
        var blockedResult = _rateLimiter.TryAcquire(key, maxAttempts, window);
        blockedResult.IsAllowed.ShouldBeFalse();

        // Act - wait for window to expire
        await Task.Delay(150);

        // Assert - should be allowed again
        var afterExpiryResult = _rateLimiter.TryAcquire(key, maxAttempts, window);
        afterExpiryResult.IsAllowed.ShouldBeTrue();
        afterExpiryResult.CurrentCount.ShouldBe(1);
    }

    [Fact]
    public void TryAcquire_ConcurrentRequests_ShouldBeThreadSafe()
    {
        // Arrange
        var key = "test-key-9";
        var maxAttempts = 100;
        var window = TimeSpan.FromMinutes(1);
        var concurrentRequests = 50;
        var results = new List<RateLimitResult>();
        var lockObj = new object();

        // Act - make concurrent requests
        Parallel.For(0, concurrentRequests, _ =>
        {
            var result = _rateLimiter.TryAcquire(key, maxAttempts, window);
            lock (lockObj)
            {
                results.Add(result);
            }
        });

        // Assert
        results.Count.ShouldBe(concurrentRequests);
        results.All(r => r.IsAllowed).ShouldBeTrue(); // All should be allowed (under limit)

        // Each result should have a unique count from 1 to concurrentRequests
        var counts = results.Select(r => r.CurrentCount).OrderBy(c => c).ToList();
        counts.ShouldBe(Enumerable.Range(1, concurrentRequests).ToList());
    }

    [Fact]
    public void TryAcquire_ConcurrentRequests_ShouldEnforceLimit()
    {
        // Arrange
        var key = "test-key-10";
        var maxAttempts = 10;
        var window = TimeSpan.FromMinutes(1);
        var concurrentRequests = 50;
        var results = new List<RateLimitResult>();
        var lockObj = new object();

        // Act - make concurrent requests exceeding limit
        Parallel.For(0, concurrentRequests, _ =>
        {
            var result = _rateLimiter.TryAcquire(key, maxAttempts, window);
            lock (lockObj)
            {
                results.Add(result);
            }
        });

        // Assert
        results.Count.ShouldBe(concurrentRequests);

        var allowedCount = results.Count(r => r.IsAllowed);
        var blockedCount = results.Count(r => !r.IsAllowed);

        allowedCount.ShouldBe(maxAttempts);
        blockedCount.ShouldBe(concurrentRequests - maxAttempts);
    }

    [Fact]
    public void RateLimitResult_Allowed_ShouldHaveCorrectProperties()
    {
        // Act
        var result = RateLimitResult.Allowed(5, 10);

        // Assert
        result.IsAllowed.ShouldBeTrue();
        result.CurrentCount.ShouldBe(5);
        result.MaxAttempts.ShouldBe(10);
        result.RetryAfter.ShouldBeNull();
    }

    [Fact]
    public void RateLimitResult_RateLimited_ShouldHaveCorrectProperties()
    {
        // Act
        var retryAfter = TimeSpan.FromSeconds(30);
        var result = RateLimitResult.RateLimited(11, 10, retryAfter);

        // Assert
        result.IsAllowed.ShouldBeFalse();
        result.CurrentCount.ShouldBe(11);
        result.MaxAttempts.ShouldBe(10);
        result.RetryAfter.ShouldBe(retryAfter);
    }

    [Fact]
    public void RateLimitResult_RateLimited_WithoutRetryAfter_ShouldHaveNullRetryAfter()
    {
        // Act
        var result = RateLimitResult.RateLimited(11, 10);

        // Assert
        result.IsAllowed.ShouldBeFalse();
        result.RetryAfter.ShouldBeNull();
    }
}

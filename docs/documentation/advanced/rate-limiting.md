# Rate Limiting

Merchello includes a built-in rate limiter for protecting sensitive endpoints from abuse. It uses a sliding-window approach with atomic operations, making it thread-safe and suitable for high-traffic scenarios.

## When Rate Limiting Is Used

Rate limiting is applied to endpoints and operations that could be abused:

- **Digital product download links** -- prevents excessive downloads
- **Discount code validation** -- prevents brute-force code guessing
- **Webhook endpoints** -- prevents flood attacks

## The IRateLimiter Interface

The rate limiter is available via dependency injection as `IRateLimiter`:

```csharp
public interface IRateLimiter
{
    RateLimitResult TryAcquire(string key, int maxAttempts, TimeSpan window);
    int GetCurrentCount(string key);
    void Reset(string key);
}
```

### TryAcquire

The main method. It atomically checks whether the request is within the rate limit and increments the counter in a single operation. There is no race condition between checking and incrementing.

```csharp
var result = rateLimiter.TryAcquire(
    key: $"download:{linkId}",
    maxAttempts: 10,
    window: TimeSpan.FromHours(1));

if (!result.IsAllowed)
{
    // Rate limit exceeded
    return StatusCode(429, new
    {
        message = "Too many download attempts. Please try again later.",
        retryAfterSeconds = result.RetryAfter?.TotalSeconds
    });
}

// Proceed with the download...
```

### GetCurrentCount

Reads the current attempt count for a key without incrementing. Useful for displaying remaining attempts to the user.

```csharp
var currentCount = rateLimiter.GetCurrentCount($"discount-code:{basketId}");
var remaining = maxAttempts - currentCount;
```

### Reset

Clears the rate limit for a key. Use this when a successful action should reset the counter (e.g., after a successful discount code application).

```csharp
rateLimiter.Reset($"discount-code:{basketId}");
```

## RateLimitResult

The result from `TryAcquire` tells you everything you need to know:

| Property | Type | Description |
|---|---|---|
| `IsAllowed` | `bool` | Whether the request is within the rate limit |
| `CurrentCount` | `int` | The number of attempts so far (including this one) |
| `MaxAttempts` | `int` | The maximum allowed attempts |
| `RetryAfter` | `TimeSpan?` | Time until the rate limit window resets (only set when rate limited) |

## Key Design

The rate limiter consists of three pieces:

### AtomicRateLimiter

The `AtomicRateLimiter` is registered as a singleton and manages a `ConcurrentDictionary` of rate limit buckets. Each unique key gets its own bucket.

```csharp
// Registration (done automatically by Merchello)
services.AddSingleton<IRateLimiter, AtomicRateLimiter>();
```

### RateLimitBucket

Each bucket uses a per-bucket lock for thread safety. When the sliding window expires, the counter resets:

- If the current time is past the bucket's expiry, the counter resets to 1 and a new window starts.
- If the current time is within the window, the counter increments.

### Automatic Cleanup

A background timer runs every 5 minutes to remove expired buckets from memory. This prevents memory growth from abandoned rate limit keys (e.g., old basket IDs that are no longer active).

## Usage Examples

### Protecting a Download Endpoint

```csharp
[HttpGet("download/{token}")]
public async Task<IActionResult> Download(string token, CancellationToken ct)
{
    // Validate the download token
    var link = await downloadService.ValidateTokenAsync(token, ct);
    if (link == null)
        return NotFound();

    // Rate limit by link ID
    var rateResult = rateLimiter.TryAcquire(
        key: $"download:{link.Id}",
        maxAttempts: link.MaxDownloads,
        window: TimeSpan.FromHours(24));

    if (!rateResult.IsAllowed)
    {
        Response.Headers["Retry-After"] = rateResult.RetryAfter?.TotalSeconds.ToString("F0") ?? "3600";
        return StatusCode(429, "Download limit exceeded.");
    }

    // Serve the file...
}
```

### Protecting Discount Code Validation

```csharp
public async Task<DiscountValidationResult> ValidateCodeAsync(
    string code, Guid basketId, CancellationToken ct)
{
    var rateResult = rateLimiter.TryAcquire(
        key: $"discount-code:{basketId}",
        maxAttempts: 5,
        window: TimeSpan.FromMinutes(15));

    if (!rateResult.IsAllowed)
    {
        return new DiscountValidationResult
        {
            IsValid = false,
            Message = "Too many attempts. Please wait before trying again."
        };
    }

    // Validate the code...
}
```

### Key Naming Conventions

Use descriptive, scoped keys to keep rate limits isolated:

| Pattern | Example | Scope |
|---|---|---|
| `download:{linkId}` | `download:a1b2c3d4` | Per download link |
| `discount-code:{basketId}` | `discount-code:e5f6g7h8` | Per basket session |
| `webhook:{provider}:{ip}` | `webhook:stripe:1.2.3.4` | Per provider per IP |
| `api:{userId}` | `api:user-abc-123` | Per authenticated user |

## Key Files

| File | Description |
|---|---|
| `Merchello.Core/Shared/RateLimiting/Interfaces/IRateLimiter.cs` | The interface |
| `Merchello.Core/Shared/RateLimiting/AtomicRateLimiter.cs` | Singleton implementation |
| `Merchello.Core/Shared/RateLimiting/Models/RateLimitResult.cs` | Result model |
| `Merchello.Core/Shared/RateLimiting/RateLimitBucket.cs` | Per-key bucket with sliding window |

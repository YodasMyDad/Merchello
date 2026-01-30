# Rate Limiting System

Enterprise API protection for DDoS prevention, fair usage, and cost control.

## Overview

The rate limiting system controls request frequency to protect APIs from abuse, ensure fair resource distribution, and manage costs from external service calls. Merchello already has `IRateLimiter` / `AtomicRateLimiter` and 6 ad-hoc usages with hardcoded limits. This sprint centralizes those into a configuration-driven system with global middleware, standard headers, and monitoring — extending protection to all public-facing endpoints.

## Design Principles

- **Non-blocking architecture** - Minimal latency impact on allowed requests
- **Configurable per-endpoint** - Different limits for different risk profiles
- **Multiple key strategies** - IP, session, customer, API key identification
- **Standard headers** - RFC 6585 compliant response headers
- **Graceful degradation** - Clear feedback when limits are reached
- **Consolidates existing ad-hoc limiting** - Replaces 6 hardcoded usages with centralized configuration

## Centralized Logic (Target State)

| Operation | Service.Method | Status |
| --------- | -------------- | ------ |
| Rate limit check | `IRateLimiter.TryAcquire()` | Exists |
| Rate limit metrics | `IRateLimitMetrics.RecordRequest()` | New |
| Rate limit stats | `IRateLimitMetrics.GetStatsAsync()` | New |

## Existing Infrastructure

Merchello already has rate limiting foundations:

### Core

| Component | Location | Purpose |
| --------- | -------- | ------- |
| `IRateLimiter` | `Shared/RateLimiting/Interfaces/` | Rate limit abstraction (`TryAcquire`, `GetCurrentCount`, `Reset`) |
| `AtomicRateLimiter` | `Shared/RateLimiting/` | Thread-safe fixed-window implementation |
| `RateLimitResult` | `Shared/RateLimiting/Models/` | Result model (`IsAllowed`, `CurrentCount`, `MaxAttempts`, `RetryAfter`) |

The `AtomicRateLimiter` is registered as a singleton (`Startup.cs`) and provides:

- Thread-safe `ConcurrentDictionary` with per-bucket locks
- Fixed window approach (counter resets when window expires)
- Automatic cleanup of expired entries (5-minute intervals)
- `TryAcquire(key, maxAttempts, window)` returns `RateLimitResult`

### Current Ad-Hoc Usages

All current rate limiting is hardcoded at point-of-use with no centralized configuration:

| Location | Endpoint/Feature | Key Pattern | Limit | Window |
| -------- | ---------------- | ----------- | ----- | ------ |
| `WebhookSecurityService` | Payment webhooks | `webhook_rate_{provider}_{ip}` | 60 | 1 min |
| `CheckoutDiscountService` | Discount code apply | `discount-code-attempts:{basketId}` | 5 | 1 min |
| `PaymentService` | Payment session creation | `payment_rate_{invoiceId}` | 10 | 1 min |
| `CheckoutApiController` | Forgot password | `forgot-password:{ip}` | 5 | 15 min |
| `CheckoutApiController` | Cart recovery | `cart-recovery:{ip}` | 10 | 1 min |
| `DownloadsController` | File downloads | Per-IP (ASP.NET Core built-in) | 30 | 1 min |

The downloads endpoint uses ASP.NET Core's built-in `AddRateLimiter` / `[EnableRateLimiting("downloads")]` registered in `MerchelloComposer.cs`, separate from the `IRateLimiter` infrastructure.

## Architecture

```text
HTTP Request → RateLimitMiddleware
                    ↓
              Identify Client (IP/Session/ApiKey)
                    ↓
              Build Rate Limit Key
                    ↓
              IRateLimiter.TryAcquire()
                    ↓
         ┌─────────┴─────────┐
         │                   │
      Allowed             Denied
         │                   │
    Add Headers         429 Response
    Continue Pipeline   + Retry-After
```

## 1. Configuration

### RateLimitOptions

```csharp
public class RateLimitOptions
{
    /// <summary>
    /// Enable or disable rate limiting globally.
    /// </summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// Default requests per window when no specific policy applies.
    /// </summary>
    public int DefaultLimit { get; set; } = 100;

    /// <summary>
    /// Default time window in seconds.
    /// </summary>
    public int DefaultWindowSeconds { get; set; } = 60;

    /// <summary>
    /// Include rate limit headers in all responses.
    /// </summary>
    public bool IncludeHeaders { get; set; } = true;

    /// <summary>
    /// IP addresses/ranges exempt from rate limiting (e.g., load balancers, monitoring).
    /// </summary>
    public List<string> WhitelistedIps { get; set; } = [];

    /// <summary>
    /// Custom message returned with 429 responses.
    /// </summary>
    public string LimitExceededMessage { get; set; } = "Rate limit exceeded. Please retry later.";

    /// <summary>
    /// Header name for client identification (e.g., X-Api-Key, X-Client-Id).
    /// </summary>
    public string? ClientIdHeader { get; set; }

    /// <summary>
    /// Use X-Forwarded-For header for IP detection behind proxies.
    /// </summary>
    public bool UseForwardedHeaders { get; set; } = true;

    /// <summary>
    /// Endpoint-specific rate limit policies.
    /// </summary>
    public Dictionary<string, RateLimitPolicy> Policies { get; set; } = new()
    {
        ["storefront"] = new RateLimitPolicy { Limit = 100, WindowSeconds = 60 },
        ["checkout"] = new RateLimitPolicy { Limit = 30, WindowSeconds = 60 },
        ["payment"] = new RateLimitPolicy { Limit = 10, WindowSeconds = 60 },
        ["webhook"] = new RateLimitPolicy { Limit = 60, WindowSeconds = 60 },
        ["discount"] = new RateLimitPolicy { Limit = 20, WindowSeconds = 60 },
        ["auth"] = new RateLimitPolicy { Limit = 5, WindowSeconds = 60 }
    };
}

public class RateLimitPolicy
{
    /// <summary>
    /// Maximum requests allowed in the time window.
    /// </summary>
    public int Limit { get; set; }

    /// <summary>
    /// Time window in seconds.
    /// </summary>
    public int WindowSeconds { get; set; }

    /// <summary>
    /// Key strategy for this policy.
    /// </summary>
    public RateLimitKeyStrategy KeyStrategy { get; set; } = RateLimitKeyStrategy.Ip;

    /// <summary>
    /// Burst allowance (additional requests allowed in short bursts).
    /// </summary>
    public int BurstLimit { get; set; } = 0;
}

public enum RateLimitKeyStrategy
{
    /// <summary>
    /// Rate limit by client IP address.
    /// </summary>
    Ip,

    /// <summary>
    /// Rate limit by session/basket ID.
    /// </summary>
    Session,

    /// <summary>
    /// Rate limit by authenticated customer ID.
    /// </summary>
    Customer,

    /// <summary>
    /// Rate limit by API key header.
    /// </summary>
    ApiKey,

    /// <summary>
    /// Combine IP + endpoint for granular control.
    /// </summary>
    IpAndEndpoint,

    /// <summary>
    /// Global limit across all clients (for expensive operations).
    /// </summary>
    Global
}
```

### appsettings.json

```json
{
  "Merchello": {
    "RateLimiting": {
      "Enabled": true,
      "DefaultLimit": 100,
      "DefaultWindowSeconds": 60,
      "IncludeHeaders": true,
      "UseForwardedHeaders": true,
      "ClientIdHeader": "X-Api-Key",
      "LimitExceededMessage": "Rate limit exceeded. Please retry later.",
      "WhitelistedIps": [
        "127.0.0.1",
        "::1",
        "10.0.0.0/8"
      ],
      "Policies": {
        "storefront": {
          "Limit": 100,
          "WindowSeconds": 60,
          "KeyStrategy": "Ip"
        },
        "checkout": {
          "Limit": 30,
          "WindowSeconds": 60,
          "KeyStrategy": "Session"
        },
        "payment": {
          "Limit": 10,
          "WindowSeconds": 60,
          "KeyStrategy": "IpAndEndpoint"
        },
        "webhook": {
          "Limit": 60,
          "WindowSeconds": 60,
          "KeyStrategy": "IpAndEndpoint"
        },
        "discount": {
          "Limit": 20,
          "WindowSeconds": 60,
          "KeyStrategy": "Ip"
        },
        "auth": {
          "Limit": 5,
          "WindowSeconds": 60,
          "KeyStrategy": "Ip"
        }
      }
    }
  }
}
```

## 2. Middleware

### RateLimitMiddleware

```csharp
public class RateLimitMiddleware(
    RequestDelegate next,
    IRateLimiter rateLimiter,
    IOptions<RateLimitOptions> options,
    ILogger<RateLimitMiddleware> logger,
    INotificationPublisher notificationPublisher)
{
    private readonly RateLimitOptions _options = options.Value;

    public async Task InvokeAsync(HttpContext context)
    {
        if (!_options.Enabled)
        {
            await next(context);
            return;
        }

        var path = context.Request.Path.Value ?? "";

        // Skip non-Merchello endpoints
        if (!IsMerchelloEndpoint(path))
        {
            await next(context);
            return;
        }

        var clientIp = GetClientIp(context);

        // Check whitelist
        if (IsWhitelisted(clientIp))
        {
            await next(context);
            return;
        }

        // Determine policy
        var policy = GetPolicyForPath(path);
        var key = BuildRateLimitKey(context, path, policy);

        // Check rate limit
        var result = rateLimiter.TryAcquire(
            key,
            policy.Limit + policy.BurstLimit,
            TimeSpan.FromSeconds(policy.WindowSeconds));

        // Add headers
        if (_options.IncludeHeaders)
        {
            AddRateLimitHeaders(context.Response, result, policy);
        }

        // Publish near-limit notification (>80% threshold)
        if (result.IsAllowed && result.CurrentCount > policy.Limit * 0.8m)
        {
            await notificationPublisher.PublishAsync(new RateLimitNearLimitNotification(
                key, path, result.CurrentCount, policy.Limit,
                (decimal)result.CurrentCount / policy.Limit * 100));
        }

        if (!result.IsAllowed)
        {
            logger.LogWarning(
                "Rate limit exceeded for {ClientIp} on {Path}. Key: {Key}, Count: {Count}/{Limit}",
                clientIp, path, key, result.CurrentCount, policy.Limit);

            // Publish exceeded notification
            await notificationPublisher.PublishAsync(new RateLimitExceededNotification(
                key, path, result.CurrentCount, policy.Limit, clientIp));

            context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
            context.Response.ContentType = "application/json";

            if (result.RetryAfter.HasValue)
            {
                context.Response.Headers.RetryAfter = result.RetryAfter.Value.TotalSeconds.ToString("F0");
            }

            await context.Response.WriteAsJsonAsync(new
            {
                error = "rate_limit_exceeded",
                message = _options.LimitExceededMessage,
                retryAfter = result.RetryAfter?.TotalSeconds
            });

            return;
        }

        await next(context);
    }

    private bool IsMerchelloEndpoint(string path)
    {
        return path.StartsWith("/api/merchello/", StringComparison.OrdinalIgnoreCase)
            || path.StartsWith("/umbraco/merchello/", StringComparison.OrdinalIgnoreCase);
    }

    private string GetClientIp(HttpContext context)
    {
        if (_options.UseForwardedHeaders)
        {
            var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
            if (!string.IsNullOrEmpty(forwardedFor))
            {
                // Take the first IP (original client)
                return forwardedFor.Split(',')[0].Trim();
            }
        }

        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    private bool IsWhitelisted(string clientIp)
    {
        if (string.IsNullOrEmpty(clientIp)) return false;

        foreach (var entry in _options.WhitelistedIps)
        {
            if (entry.Contains('/'))
            {
                // CIDR notation - check if IP is in range
                if (IsIpInCidrRange(clientIp, entry)) return true;
            }
            else if (entry == clientIp)
            {
                return true;
            }
        }

        return false;
    }

    private RateLimitPolicy GetPolicyForPath(string path)
    {
        var pathLower = path.ToLowerInvariant();

        if (pathLower.Contains("/webhook"))
            return _options.Policies.GetValueOrDefault("webhook") ?? GetDefaultPolicy();

        if (pathLower.Contains("/checkout/pay") || pathLower.Contains("/process-payment"))
            return _options.Policies.GetValueOrDefault("payment") ?? GetDefaultPolicy();

        if (pathLower.Contains("/discount"))
            return _options.Policies.GetValueOrDefault("discount") ?? GetDefaultPolicy();

        if (pathLower.Contains("/checkout"))
            return _options.Policies.GetValueOrDefault("checkout") ?? GetDefaultPolicy();

        if (pathLower.Contains("/storefront"))
            return _options.Policies.GetValueOrDefault("storefront") ?? GetDefaultPolicy();

        return GetDefaultPolicy();
    }

    private RateLimitPolicy GetDefaultPolicy() => new()
    {
        Limit = _options.DefaultLimit,
        WindowSeconds = _options.DefaultWindowSeconds
    };

    private string BuildRateLimitKey(HttpContext context, string path, RateLimitPolicy policy)
    {
        var clientIp = GetClientIp(context);

        return policy.KeyStrategy switch
        {
            RateLimitKeyStrategy.Ip => $"rate:{clientIp}",
            RateLimitKeyStrategy.Session => $"rate:session:{GetSessionId(context)}",
            RateLimitKeyStrategy.Customer => $"rate:customer:{GetCustomerId(context)}",
            RateLimitKeyStrategy.ApiKey => $"rate:apikey:{GetApiKey(context)}",
            RateLimitKeyStrategy.IpAndEndpoint => $"rate:{clientIp}:{GetEndpointKey(path)}",
            RateLimitKeyStrategy.Global => $"rate:global:{GetEndpointKey(path)}",
            _ => $"rate:{clientIp}"
        };
    }

    private string GetSessionId(HttpContext context)
    {
        // Try basket ID from cookie first
        var basketId = context.Request.Cookies["merchello_basket"];
        if (!string.IsNullOrEmpty(basketId)) return basketId;

        // Fall back to IP
        return GetClientIp(context);
    }

    private string GetCustomerId(HttpContext context)
    {
        // Check for authenticated customer
        var customerId = context.User.FindFirst("customer_id")?.Value;
        if (!string.IsNullOrEmpty(customerId)) return customerId;

        // Fall back to session
        return GetSessionId(context);
    }

    private string GetApiKey(HttpContext context)
    {
        if (string.IsNullOrEmpty(_options.ClientIdHeader))
            return GetClientIp(context);

        var apiKey = context.Request.Headers[_options.ClientIdHeader].FirstOrDefault();
        return !string.IsNullOrEmpty(apiKey) ? apiKey : GetClientIp(context);
    }

    private static string GetEndpointKey(string path)
    {
        // Normalize path to endpoint category
        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length >= 3)
        {
            // e.g., api/merchello/checkout -> checkout
            return segments[2];
        }
        return "default";
    }

    private static void AddRateLimitHeaders(HttpResponse response, RateLimitResult result, RateLimitPolicy policy)
    {
        response.Headers["X-RateLimit-Limit"] = policy.Limit.ToString();
        response.Headers["X-RateLimit-Remaining"] = Math.Max(0, policy.Limit - result.CurrentCount).ToString();
        response.Headers["X-RateLimit-Reset"] = DateTimeOffset.UtcNow
            .AddSeconds(policy.WindowSeconds)
            .ToUnixTimeSeconds()
            .ToString();
    }

    private static bool IsIpInCidrRange(string ip, string cidr)
    {
        try
        {
            var parts = cidr.Split('/');
            if (parts.Length != 2) return false;

            var networkAddress = IPAddress.Parse(parts[0]);
            var prefixLength = int.Parse(parts[1]);
            var clientAddress = IPAddress.Parse(ip);

            var networkBytes = networkAddress.GetAddressBytes();
            var clientBytes = clientAddress.GetAddressBytes();

            if (networkBytes.Length != clientBytes.Length) return false;

            var fullBytes = prefixLength / 8;
            var remainingBits = prefixLength % 8;

            for (var i = 0; i < fullBytes; i++)
            {
                if (networkBytes[i] != clientBytes[i]) return false;
            }

            if (remainingBits > 0 && fullBytes < networkBytes.Length)
            {
                var mask = (byte)(0xFF << (8 - remainingBits));
                if ((networkBytes[fullBytes] & mask) != (clientBytes[fullBytes] & mask)) return false;
            }

            return true;
        }
        catch
        {
            return false;
        }
    }
}
```

## 3. Attribute-Based Rate Limiting

For fine-grained control on specific endpoints:

### RateLimitAttribute

```csharp
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public class RateLimitAttribute : Attribute
{
    public int Limit { get; }
    public int WindowSeconds { get; }
    public RateLimitKeyStrategy KeyStrategy { get; set; } = RateLimitKeyStrategy.Ip;
    public string? PolicyName { get; set; }

    public RateLimitAttribute(int limit, int windowSeconds)
    {
        Limit = limit;
        WindowSeconds = windowSeconds;
    }

    public RateLimitAttribute(string policyName)
    {
        PolicyName = policyName;
    }
}
```

### RateLimitActionFilter

```csharp
public class RateLimitActionFilter(
    IRateLimiter rateLimiter,
    IOptions<RateLimitOptions> options,
    ILogger<RateLimitActionFilter> logger) : IAsyncActionFilter
{
    private readonly RateLimitOptions _options = options.Value;

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (!_options.Enabled)
        {
            await next();
            return;
        }

        var rateLimitAttr = context.ActionDescriptor.EndpointMetadata
            .OfType<RateLimitAttribute>()
            .FirstOrDefault();

        if (rateLimitAttr == null)
        {
            await next();
            return;
        }

        var policy = ResolvePolicy(rateLimitAttr);
        var clientIp = GetClientIp(context.HttpContext);
        var key = BuildKey(context.HttpContext, context.ActionDescriptor.DisplayName ?? "unknown", policy);

        var result = rateLimiter.TryAcquire(
            key,
            policy.Limit,
            TimeSpan.FromSeconds(policy.WindowSeconds));

        if (_options.IncludeHeaders)
        {
            context.HttpContext.Response.Headers["X-RateLimit-Limit"] = policy.Limit.ToString();
            context.HttpContext.Response.Headers["X-RateLimit-Remaining"] =
                Math.Max(0, policy.Limit - result.CurrentCount).ToString();
        }

        if (!result.IsAllowed)
        {
            logger.LogWarning(
                "Rate limit exceeded for {ClientIp} on {Action}. Count: {Count}/{Limit}",
                clientIp, context.ActionDescriptor.DisplayName, result.CurrentCount, policy.Limit);

            context.Result = new ObjectResult(new
            {
                error = "rate_limit_exceeded",
                message = _options.LimitExceededMessage,
                retryAfter = result.RetryAfter?.TotalSeconds
            })
            {
                StatusCode = StatusCodes.Status429TooManyRequests
            };

            if (result.RetryAfter.HasValue)
            {
                context.HttpContext.Response.Headers.RetryAfter =
                    result.RetryAfter.Value.TotalSeconds.ToString("F0");
            }

            return;
        }

        await next();
    }

    private RateLimitPolicy ResolvePolicy(RateLimitAttribute attr)
    {
        if (!string.IsNullOrEmpty(attr.PolicyName) &&
            _options.Policies.TryGetValue(attr.PolicyName, out var policy))
        {
            return policy;
        }

        return new RateLimitPolicy
        {
            Limit = attr.Limit,
            WindowSeconds = attr.WindowSeconds,
            KeyStrategy = attr.KeyStrategy
        };
    }

    private static string GetClientIp(HttpContext context) =>
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    private static string BuildKey(HttpContext context, string action, RateLimitPolicy policy)
    {
        var clientIp = GetClientIp(context);
        return policy.KeyStrategy switch
        {
            RateLimitKeyStrategy.Global => $"rate:action:{action}",
            _ => $"rate:{clientIp}:action:{action}"
        };
    }
}
```

## 4. Controller Usage Examples

### Attribute-Based Limiting

```csharp
[ApiController]
[Route("api/merchello/checkout")]
public class CheckoutApiController(
    ICheckoutService checkoutService) : ControllerBase
{
    // Use named policy
    [HttpPost("discount/apply")]
    [RateLimit("discount")]
    public async Task<IActionResult> ApplyDiscount([FromBody] ApplyDiscountDto dto, CancellationToken ct)
    {
        var result = await checkoutService.ApplyDiscountCodeAsync(dto.Code, ct);
        return Ok(result);
    }

    // Custom inline limits
    [HttpPost("pay")]
    [RateLimit(10, 60, KeyStrategy = RateLimitKeyStrategy.IpAndEndpoint)]
    public async Task<IActionResult> InitiatePayment([FromBody] PaymentRequestDto dto, CancellationToken ct)
    {
        // Payment initiation logic
    }

    // Global rate limit for expensive operations
    [HttpGet("shipping-groups")]
    [RateLimit(100, 60, KeyStrategy = RateLimitKeyStrategy.Global)]
    public async Task<IActionResult> GetShippingGroups(CancellationToken ct)
    {
        // This calls external shipping APIs - limit globally
    }
}
```

### Service-Level Limiting (Existing Pattern)

For complex scenarios, use the existing service pattern from `WebhookSecurityService`:

```csharp
public class CheckoutSecurityService(
    IRateLimiter rateLimiter,
    IOptions<RateLimitOptions> options,
    ILogger<CheckoutSecurityService> logger) : ICheckoutSecurityService
{
    public bool IsDiscountRateLimited(string clientIp)
    {
        var policy = options.Value.Policies.GetValueOrDefault("discount")
            ?? new RateLimitPolicy { Limit = 20, WindowSeconds = 60 };

        var key = $"discount_rate_{clientIp}";
        var result = rateLimiter.TryAcquire(
            key,
            policy.Limit,
            TimeSpan.FromSeconds(policy.WindowSeconds));

        if (!result.IsAllowed)
        {
            logger.LogWarning(
                "Discount rate limit exceeded for {ClientIp}. Count: {Count}/{Limit}",
                clientIp, result.CurrentCount, policy.Limit);
        }

        return !result.IsAllowed;
    }
}
```

## 5. Registration

### Startup.cs

```csharp
// Configuration binding
builder.Services.Configure<RateLimitOptions>(
    builder.Config.GetSection("Merchello:RateLimiting"));

// IRateLimiter already registered as singleton (existing)
// builder.Services.AddSingleton<IRateLimiter, AtomicRateLimiter>();

// Action filter for attribute-based limiting
builder.Services.AddScoped<RateLimitActionFilter>();
builder.Services.AddControllers(options =>
{
    options.Filters.AddService<RateLimitActionFilter>();
});
```

### Middleware Registration (Program.cs or Startup.Configure)

```csharp
// Add early in pipeline, before routing
app.UseMiddleware<RateLimitMiddleware>();

// Or as extension method:
app.UseMerchelloRateLimiting();
```

### Extension Method

```csharp
public static class RateLimitMiddlewareExtensions
{
    public static IApplicationBuilder UseMerchelloRateLimiting(this IApplicationBuilder app)
    {
        return app.UseMiddleware<RateLimitMiddleware>();
    }
}
```

## 6. Response Headers

All rate-limited responses include standard headers:

| Header | Description | Example |
|--------|-------------|---------|
| `X-RateLimit-Limit` | Maximum requests allowed | `100` |
| `X-RateLimit-Remaining` | Requests remaining in window | `87` |
| `X-RateLimit-Reset` | Unix timestamp when window resets | `1704067200` |
| `Retry-After` | Seconds until retry (on 429 only) | `45` |

### Example Response (429)

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1704067200
Retry-After: 45

{
  "error": "rate_limit_exceeded",
  "message": "Rate limit exceeded. Please retry later.",
  "retryAfter": 45
}
```

## 7. Endpoint Protection Matrix

| Endpoint Category | Route Pattern | Default Limit | Window | Key Strategy | Risk Level |
|-------------------|---------------|---------------|--------|--------------|------------|
| Storefront Read | `/storefront/basket`, `/storefront/currency` | 100/min | 60s | IP | Low |
| Storefront Write | `/storefront/basket/add`, `/storefront/basket/update` | 30/min | 60s | Session | Medium |
| Checkout | `/checkout/addresses`, `/checkout/shipping` | 30/min | 60s | Session | Medium |
| Discount | `/checkout/discount/apply` | 20/min | 60s | IP | High |
| Payment Init | `/checkout/pay`, `/checkout/process-payment` | 10/min | 60s | IP+Endpoint | Critical |
| Payment Webhook | `/webhooks/payments/*` | 60/min | 60s | IP+Provider | High |
| Express Checkout | `/checkout/express/*` | 20/min | 60s | Session | High |
| Shipping Quotes | `/checkout/shipping-groups` | 50/min | 60s | Global | Medium |

## 8. Distributed Rate Limiting (Future)

For multi-instance deployments, replace `AtomicRateLimiter` with Redis-backed implementation:

### IDistributedRateLimiter

```csharp
public interface IDistributedRateLimiter : IRateLimiter
{
    Task<RateLimitResult> TryAcquireAsync(
        string key,
        int maxAttempts,
        TimeSpan window,
        CancellationToken ct = default);
}
```

### Redis Implementation (Future)

```csharp
public class RedisRateLimiter(
    IConnectionMultiplexer redis,
    ILogger<RedisRateLimiter> logger) : IDistributedRateLimiter
{
    public async Task<RateLimitResult> TryAcquireAsync(
        string key,
        int maxAttempts,
        TimeSpan window,
        CancellationToken ct = default)
    {
        var db = redis.GetDatabase();
        var redisKey = $"merchello:ratelimit:{key}";

        // Lua script for atomic increment + expiry
        var script = @"
            local current = redis.call('INCR', KEYS[1])
            if current == 1 then
                redis.call('EXPIRE', KEYS[1], ARGV[1])
            end
            return current
        ";

        var count = (long)await db.ScriptEvaluateAsync(
            script,
            [redisKey],
            [(int)window.TotalSeconds]);

        return new RateLimitResult
        {
            IsAllowed = count <= maxAttempts,
            CurrentCount = (int)count,
            MaxAttempts = maxAttempts,
            RetryAfter = count > maxAttempts ? window : null
        };
    }

    // Sync implementation delegates to async
    public RateLimitResult TryAcquire(string key, int maxAttempts, TimeSpan window)
        => TryAcquireAsync(key, maxAttempts, window).GetAwaiter().GetResult();
}
```

## 9. Notifications

Hook into rate limiting events for monitoring/alerting integrations.

### Events

| Domain | Before | After |
|--------|--------|-------|
| RateLimit | - | Exceeded, NearLimit |

### Notification Classes

```csharp
/// <summary>
/// Fired when a client exceeds their rate limit.
/// </summary>
public class RateLimitExceededNotification(
    string clientKey,
    string endpoint,
    int currentCount,
    int limit,
    string clientIp) : INotification
{
    public string ClientKey { get; } = clientKey;
    public string Endpoint { get; } = endpoint;
    public int CurrentCount { get; } = currentCount;
    public int Limit { get; } = limit;
    public string ClientIp { get; } = clientIp;
    public DateTime OccurredAt { get; } = DateTime.UtcNow;
}

/// <summary>
/// Fired when a client reaches 80% of their rate limit (configurable threshold).
/// </summary>
public class RateLimitNearLimitNotification(
    string clientKey,
    string endpoint,
    int currentCount,
    int limit,
    decimal percentageUsed) : INotification
{
    public string ClientKey { get; } = clientKey;
    public string Endpoint { get; } = endpoint;
    public int CurrentCount { get; } = currentCount;
    public int Limit { get; } = limit;
    public decimal PercentageUsed { get; } = percentageUsed;
}
```

### Example Handler

```csharp
public class RateLimitAlertHandler(
    ILogger<RateLimitAlertHandler> logger,
    IWebhookService webhookService) : INotificationAsyncHandler<RateLimitExceededNotification>
{
    public async Task HandleAsync(RateLimitExceededNotification notification, CancellationToken ct)
    {
        logger.LogWarning(
            "Rate limit exceeded: {ClientIp} on {Endpoint} ({Count}/{Limit})",
            notification.ClientIp,
            notification.Endpoint,
            notification.CurrentCount,
            notification.Limit);

        // Optionally trigger webhook for external alerting
        // await webhookService.QueueDeliveryAsync("ratelimit.exceeded", notification, ct);
    }
}
```

## 10. Services

| Service | Responsibility |
|---------|----------------|
| `IRateLimiter` | Thread-safe sliding window rate limiting, per-bucket locks |
| `IRateLimitMetrics` | Request counting, denial stats, reporting |
| `IDistributedRateLimiter` | Redis-backed rate limiting for multi-instance deployments |

**Principles**: Singleton lifetime for `IRateLimiter`, minimal memory footprint, automatic cleanup of expired entries.

## 11. Monitoring & Alerting

### Rate Limit Metrics

```csharp
public interface IRateLimitMetrics
{
    void RecordRequest(string endpoint, string clientKey, bool allowed);
    Task<RateLimitStats> GetStatsAsync(DateTime from, DateTime to, CancellationToken ct);
}

public class RateLimitStats
{
    public int TotalRequests { get; set; }
    public int AllowedRequests { get; set; }
    public int DeniedRequests { get; set; }
    public decimal DenialRate => TotalRequests > 0 ? (decimal)DeniedRequests / TotalRequests : 0;
    public Dictionary<string, int> DenialsByEndpoint { get; set; } = [];
    public Dictionary<string, int> TopOffenders { get; set; } = [];
}
```

### Logging Events

All rate limit events are logged for monitoring:

```csharp
// Warning level for rate limit hits
logger.LogWarning(
    "Rate limit exceeded for {ClientIp} on {Path}. Key: {Key}, Count: {Count}/{Limit}",
    clientIp, path, key, result.CurrentCount, policy.Limit);

// Info level for near-limit warnings (>80%)
if (result.CurrentCount > policy.Limit * 0.8)
{
    logger.LogInformation(
        "Client {ClientIp} approaching rate limit on {Path}. Count: {Count}/{Limit}",
        clientIp, path, result.CurrentCount, policy.Limit);
}
```

## 12. Security Considerations

### DDoS Protection

- Rate limits apply before expensive operations (DB queries, external API calls)
- Middleware runs early in pipeline
- Minimal memory footprint per client (single counter)

### Bypass Prevention

- IP spoofing mitigated by checking `X-Forwarded-For` chain
- Session-based limits prevent cookie-based bypass
- Global limits protect against distributed attacks

### Cost Protection

External API calls (shipping quotes, tax calculations) are protected:

```csharp
// Global rate limit protects against cost abuse
[RateLimit(100, 60, KeyStrategy = RateLimitKeyStrategy.Global)]
public async Task<IActionResult> GetShippingQuotes()
{
    // Calls external shipping provider APIs
}
```

## 13. Folder Structure

```text
Merchello.Core/
├── Shared/
│   └── RateLimiting/
│       ├── Interfaces/
│       │   ├── IRateLimiter.cs          # Existing
│       │   └── IRateLimitMetrics.cs     # New
│       ├── Models/
│       │   ├── RateLimitResult.cs       # Existing
│       │   ├── RateLimitOptions.cs      # New
│       │   ├── RateLimitPolicy.cs       # New
│       │   └── RateLimitKeyStrategy.cs  # New
│       ├── Notifications/
│       │   ├── RateLimitExceededNotification.cs    # New
│       │   └── RateLimitNearLimitNotification.cs   # New
│       └── AtomicRateLimiter.cs         # Existing

Merchello/
├── Middleware/
│   └── RateLimitMiddleware.cs           # New
├── Filters/
│   └── RateLimitActionFilter.cs         # New
├── Attributes/
│   └── RateLimitAttribute.cs            # New
```

## 14. Migration from Existing Code

All 6 existing ad-hoc usages should be migrated to use `RateLimitOptions` policies instead of hardcoded constants. The `IRateLimiter.TryAcquire()` calls remain the same — only the limit/window values change from constants to configuration.

### Migration targets

| Service | Current Constant | Target Policy |
| ------- | ---------------- | ------------- |
| `WebhookSecurityService` | `MaxWebhooksPerMinute = 60`, 1 min | `"webhook"` |
| `CheckoutDiscountService` | `MAX_DISCOUNT_CODE_ATTEMPTS_PER_MINUTE = 5`, 1 min | `"discount"` |
| `PaymentService` | `MaxPaymentSessionsPerMinute = 10`, 1 min | `"payment"` |
| `CheckoutApiController` | Forgot password: `5`, 15 min | `"auth"` |
| `CheckoutApiController` | Cart recovery: `MaxRecoveryAttemptsPerMinute = 10`, 1 min | `"checkout"` |
| `DownloadsController` | `PermitLimit = 30`, 1 min (ASP.NET Core built-in) | `"downloads"` — consider migrating to `IRateLimiter` for consistency, or keep the built-in middleware |

### Example migration

```csharp
// Before (hardcoded)
private const int MaxWebhooksPerMinute = 60;
private static readonly TimeSpan RateLimitWindow = TimeSpan.FromMinutes(1);
var result = rateLimiter.TryAcquire(key, MaxWebhooksPerMinute, RateLimitWindow);

// After (configuration-driven)
var policy = options.Value.Policies.GetValueOrDefault("webhook")
    ?? new RateLimitPolicy { Limit = 60, WindowSeconds = 60 };
var result = rateLimiter.TryAcquire(key, policy.Limit, TimeSpan.FromSeconds(policy.WindowSeconds));
```

## 15. Testing

### Unit Tests

```csharp
public class RateLimitMiddlewareTests
{
    [Fact]
    public async Task Should_Allow_Request_Under_Limit()
    {
        var rateLimiter = new AtomicRateLimiter();
        var options = Options.Create(new RateLimitOptions { Enabled = true });
        var middleware = new RateLimitMiddleware(
            _ => Task.CompletedTask,
            rateLimiter,
            options,
            NullLogger<RateLimitMiddleware>.Instance);

        var context = CreateHttpContext("/api/merchello/storefront/basket");

        await middleware.InvokeAsync(context);

        context.Response.StatusCode.ShouldBe(200);
    }

    [Fact]
    public async Task Should_Return_429_When_Limit_Exceeded()
    {
        var rateLimiter = new AtomicRateLimiter();
        var options = Options.Create(new RateLimitOptions
        {
            Enabled = true,
            Policies = new Dictionary<string, RateLimitPolicy>
            {
                ["storefront"] = new() { Limit = 2, WindowSeconds = 60 }
            }
        });

        var middleware = new RateLimitMiddleware(
            _ => Task.CompletedTask,
            rateLimiter,
            options,
            NullLogger<RateLimitMiddleware>.Instance);

        var context = CreateHttpContext("/api/merchello/storefront/basket");

        // First two requests succeed
        await middleware.InvokeAsync(context);
        await middleware.InvokeAsync(CreateHttpContext("/api/merchello/storefront/basket"));

        // Third request fails
        var thirdContext = CreateHttpContext("/api/merchello/storefront/basket");
        await middleware.InvokeAsync(thirdContext);

        thirdContext.Response.StatusCode.ShouldBe(429);
    }
}
```

## 16. Implementation Priority

| Phase | Scope | Effort |
| ----- | ----- | ------ |
| 1 | Configuration model (`RateLimitOptions`, `RateLimitPolicy`, `RateLimitKeyStrategy`), middleware, basic IP limiting | Low |
| 2 | Attribute-based limiting, action filter | Low |
| 3 | Session/customer key strategies | Medium |
| 4 | Response headers, metrics | Low |
| 5 | Notifications (`RateLimitExceeded`, `NearLimit`) | Low |
| 6 | Migrate all 6 existing ad-hoc usages to configuration-driven policies (see §14) | Low |
| 7 | Distributed (Redis) implementation | Medium |

## 17. Quick Start

Minimum viable implementation:

1. Add `RateLimitOptions` and `RateLimitPolicy` classes
2. Add configuration section to `appsettings.json`
3. Register configuration: `builder.Services.Configure<RateLimitOptions>(...)`
4. Add `RateLimitMiddleware`
5. Register middleware: `app.UseMiddleware<RateLimitMiddleware>()`

This provides immediate protection for all Merchello endpoints using IP-based rate limiting with configurable per-endpoint policies.

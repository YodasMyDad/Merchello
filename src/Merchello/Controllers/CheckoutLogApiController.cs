using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Shared.RateLimiting.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Merchello.Controllers;

/// <summary>
/// Ingests client-side checkout log entries and writes them to ILogger.
/// Rate-limited, size-limited, always returns 204 (never reveals failures to client).
/// Entries are logged with source "Merchello.Checkout.Client" for easy filtering in Umbraco logs.
/// </summary>
[ApiController]
[Route("api/merchello/checkout")]
[AllowAnonymous]
public class CheckoutLogApiController(
    ILogger<CheckoutLogApiController> logger,
    IRateLimiter rateLimiter,
    IHttpContextAccessor httpContextAccessor) : ControllerBase
{
    private const int MaxEntriesPerBatch = 25;
    private const int MaxMessageLength = 500;
    private const int MaxFieldLength = 200;

    private static readonly HashSet<string> ValidCategories =
    [
        "payment", "shipping", "address", "validation",
        "api", "adapter", "init", "general"
    ];

    /// <summary>
    /// Accepts batched client-side checkout log entries.
    /// Always returns 204 regardless of outcome - never reveals failures or rate limiting.
    /// </summary>
    [HttpPost("log")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [RequestSizeLimit(32_768)]
    public IActionResult IngestLogs([FromBody] CheckoutLogBatchDto? batch)
    {
        try
        {
            // Rate limit: 20 requests per minute per IP
            var ip = httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var rateLimitKey = $"checkout-log:{ip}";
            var result = rateLimiter.TryAcquire(rateLimitKey, maxAttempts: 20, window: TimeSpan.FromMinutes(1));
            if (!result.IsAllowed)
                return NoContent();

            if (batch?.Entries is null || batch.Entries.Count == 0)
                return NoContent();

            foreach (var entry in batch.Entries.Take(MaxEntriesPerBatch))
            {
                var sanitizedMessage = Truncate(entry.Message, MaxMessageLength);
                var category = SanitizeCategory(entry.Category);
                var level = MapLogLevel(entry.Level);

                logger.Log(level,
                    "Client checkout [{Category}]: {Message} | Step={CheckoutStep} ErrorCode={ErrorCode} Path={Path} ClientSessionId={ClientSessionId} UA={UserAgent}",
                    category,
                    sanitizedMessage,
                    Truncate(entry.CheckoutStep, 50) ?? "unknown",
                    Truncate(entry.ErrorCode, 100) ?? "none",
                    Truncate(entry.Url, MaxFieldLength) ?? "unknown",
                    Truncate(entry.SessionId, 50) ?? "none",
                    Truncate(entry.UserAgent, MaxFieldLength) ?? "unknown");
            }
        }
        catch (Exception ex)
        {
            // Log ingestion must never fail visibly - silently log the error internally
            logger.LogDebug(ex, "Failed to process client checkout log batch");
        }

        return NoContent();
    }

    private static LogLevel MapLogLevel(string? level) => level?.ToLowerInvariant() switch
    {
        "debug" => LogLevel.Debug,
        "info" => LogLevel.Information,
        "warning" => LogLevel.Warning,
        "error" => LogLevel.Error,
        "critical" => LogLevel.Critical,
        _ => LogLevel.Warning
    };

    private static string SanitizeCategory(string? category) =>
        category != null && ValidCategories.Contains(category) ? category : "general";

    private static string? Truncate(string? value, int maxLength) =>
        value is { Length: > 0 }
            ? value.Length > maxLength ? value[..maxLength] : value
            : null;
}

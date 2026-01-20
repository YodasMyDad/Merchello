using System.Collections.Concurrent;
using Merchello.Core.Data;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Shared.RateLimiting.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Payments.Services;

/// <summary>
/// Implementation of webhook security service providing rate limiting,
/// idempotency tracking, and audit logging for payment webhooks.
///
/// Deduplication uses the Payment table (WebhookEventId column) for reliable,
/// distributed tracking that survives restarts.
///
/// Note: Timestamp/replay attack prevention is handled by each provider's
/// ValidateWebhookAsync method, as signature validation inherently includes
/// timestamp verification (e.g., Stripe's HMAC includes timestamp in signature).
/// </summary>
public class WebhookSecurityService(
    IEFCoreScopeProvider<MerchelloDbContext> scopeProvider,
    IRateLimiter rateLimiter,
    ILogger<WebhookSecurityService> logger) : IWebhookSecurityService
{
    /// <summary>
    /// Maximum webhook requests per provider per IP per minute.
    /// </summary>
    private const int MaxWebhooksPerMinute = 60;

    /// <summary>
    /// Rate limit window duration.
    /// </summary>
    private static readonly TimeSpan RateLimitWindow = TimeSpan.FromMinutes(1);

    /// <summary>
    /// Duration to hold processing marker (5 minutes max for webhook processing).
    /// </summary>
    private static readonly TimeSpan ProcessingMarkerTtl = TimeSpan.FromMinutes(5);

    /// <summary>
    /// Concurrent set for webhook processing markers - provides atomic TryAdd.
    /// Used to prevent duplicate processing of webhooks with the same event ID
    /// while processing is in-flight (before the Payment record is created).
    /// </summary>
    private static readonly ConcurrentDictionary<string, DateTime> _processingMarkers = new();

    /// <inheritdoc />
    public bool IsRateLimited(string providerAlias, string? remoteIpAddress)
    {
        if (string.IsNullOrEmpty(remoteIpAddress))
        {
            return false;
        }

        var rateLimitKey = $"webhook_rate_{providerAlias}_{remoteIpAddress}";
        var result = rateLimiter.TryAcquire(rateLimitKey, MaxWebhooksPerMinute, RateLimitWindow);

        if (!result.IsAllowed)
        {
            logger.LogWarning(
                "Webhook rate limit exceeded for provider {Provider} from IP {IP}. Count: {Count}",
                providerAlias, remoteIpAddress, result.CurrentCount);
            return true;
        }

        return false;
    }

    /// <inheritdoc />
    public void LogSecurityEvent(
        WebhookSecurityEventType eventType,
        string providerAlias,
        string details,
        string? remoteIpAddress = null)
    {
        var logLevel = eventType switch
        {
            WebhookSecurityEventType.SignatureValidationFailed => LogLevel.Warning,
            WebhookSecurityEventType.RateLimited => LogLevel.Warning,
            WebhookSecurityEventType.DuplicateWebhook => LogLevel.Information,
            WebhookSecurityEventType.ProcessedSuccessfully => LogLevel.Information,
            WebhookSecurityEventType.ProcessingFailed => LogLevel.Error,
            _ => LogLevel.Information
        };

        logger.Log(
            logLevel,
            "Webhook security event: {EventType} for provider {Provider}. Details: {Details}. IP: {IP}",
            eventType,
            providerAlias,
            details,
            remoteIpAddress ?? "unknown");
    }

    /// <inheritdoc />
    /// <remarks>
    /// Checks if a Payment with this WebhookEventId exists in the database.
    /// This provides reliable, distributed deduplication that survives restarts.
    /// </remarks>
    public async Task<bool> HasBeenProcessedAsync(string providerAlias, string webhookEventId, CancellationToken ct = default)
    {
        using var scope = scopeProvider.CreateScope();
        var exists = await scope.ExecuteWithContextAsync(async db =>
            await db.Payments.AnyAsync(p => p.WebhookEventId == webhookEventId, ct));
        scope.Complete();
        return exists;
    }

    /// <inheritdoc />
    /// <remarks>
    /// Uses in-memory markers for in-flight request coordination.
    /// The permanent record is the Payment.WebhookEventId column.
    /// </remarks>
    public async Task<bool> TryMarkAsProcessingAsync(string providerAlias, string webhookEventId, CancellationToken ct = default)
    {
        // First check if already permanently processed in database
        if (await HasBeenProcessedAsync(providerAlias, webhookEventId, ct))
        {
            logger.LogInformation(
                "Webhook {EventId} for provider {Provider} has already been processed",
                webhookEventId, providerAlias);
            return false;
        }

        var markerKey = $"webhook_processing_{providerAlias}_{webhookEventId}";
        var now = DateTime.UtcNow;
        var expiry = now.Add(ProcessingMarkerTtl);

        // Clean up any expired markers
        CleanupExpiredMarkers(now);

        // Atomic TryAdd - returns true only if this thread successfully added the marker
        if (_processingMarkers.TryAdd(markerKey, expiry))
        {
            return true;
        }

        // Key exists - check if it's expired
        if (_processingMarkers.TryGetValue(markerKey, out var existingExpiry) && now >= existingExpiry)
        {
            // Marker expired - try to update it
            if (_processingMarkers.TryUpdate(markerKey, expiry, existingExpiry))
            {
                return true;
            }
        }

        logger.LogInformation(
            "Webhook {EventId} for provider {Provider} is already being processed",
            webhookEventId, providerAlias);

        return false;
    }

    /// <inheritdoc />
    /// <remarks>
    /// The Payment record with WebhookEventId serves as the permanent "processed" marker.
    /// This method clears the in-flight processing marker.
    /// </remarks>
    public void MarkAsProcessed(string providerAlias, string webhookEventId)
    {
        // The Payment.WebhookEventId column is the permanent record.
        // Just clear the in-flight processing marker.
        ClearProcessingMarker(providerAlias, webhookEventId);
    }

    /// <inheritdoc />
    public void ClearProcessingMarker(string providerAlias, string webhookEventId)
    {
        var markerKey = $"webhook_processing_{providerAlias}_{webhookEventId}";
        _processingMarkers.TryRemove(markerKey, out _);
    }

    /// <summary>
    /// Removes expired processing markers to prevent memory buildup.
    /// </summary>
    private static void CleanupExpiredMarkers(DateTime now)
    {
        var expiredKeys = _processingMarkers
            .Where(kvp => now >= kvp.Value)
            .Select(kvp => kvp.Key)
            .ToList();

        foreach (var key in expiredKeys)
        {
            _processingMarkers.TryRemove(key, out _);
        }
    }
}

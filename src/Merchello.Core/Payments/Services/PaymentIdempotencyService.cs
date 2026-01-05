using System.Collections.Concurrent;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Interfaces;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.Payments.Services;

/// <summary>
/// Implementation of payment idempotency service using memory cache.
/// Prevents duplicate payment/refund processing on network retries.
/// </summary>
public class PaymentIdempotencyService(
    IMemoryCache memoryCache,
    ILogger<PaymentIdempotencyService> logger) : IPaymentIdempotencyService
{
    /// <summary>
    /// Duration to cache payment results (24 hours).
    /// </summary>
    private static readonly TimeSpan ResultCacheTtl = TimeSpan.FromHours(24);

    /// <summary>
    /// Duration to hold the processing marker (5 minutes max).
    /// </summary>
    private static readonly TimeSpan ProcessingMarkerTtl = TimeSpan.FromMinutes(5);

    private const string PaymentResultPrefix = "payment_idempotency_";
    private const string RefundResultPrefix = "refund_idempotency_";

    /// <summary>
    /// Concurrent dictionary for processing markers - provides true atomic TryAdd.
    /// Entries are cleaned up when results are cached or explicitly cleared.
    /// </summary>
    private static readonly ConcurrentDictionary<string, DateTime> _processingMarkers = new();

    /// <inheritdoc />
    public PaymentResult? GetCachedPaymentResult(string idempotencyKey)
    {
        var cacheKey = $"{PaymentResultPrefix}{idempotencyKey}";
        if (memoryCache.TryGetValue(cacheKey, out PaymentResult? cachedResult))
        {
            logger.LogInformation(
                "Returning cached payment result for idempotency key {Key}. Success: {Success}",
                idempotencyKey, cachedResult?.Success);
            return cachedResult;
        }
        return null;
    }

    /// <inheritdoc />
    public void CachePaymentResult(string idempotencyKey, PaymentResult result)
    {
        var cacheKey = $"{PaymentResultPrefix}{idempotencyKey}";
        memoryCache.Set(cacheKey, result, ResultCacheTtl);

        // Clear the processing marker since we're done
        ClearProcessingMarker(idempotencyKey);

        logger.LogDebug(
            "Cached payment result for idempotency key {Key}. Success: {Success}",
            idempotencyKey, result.Success);
    }

    /// <inheritdoc />
    public RefundResult? GetCachedRefundResult(string idempotencyKey)
    {
        var cacheKey = $"{RefundResultPrefix}{idempotencyKey}";
        if (memoryCache.TryGetValue(cacheKey, out RefundResult? cachedResult))
        {
            logger.LogInformation(
                "Returning cached refund result for idempotency key {Key}. Success: {Success}",
                idempotencyKey, cachedResult?.Success);
            return cachedResult;
        }
        return null;
    }

    /// <inheritdoc />
    public void CacheRefundResult(string idempotencyKey, RefundResult result)
    {
        var cacheKey = $"{RefundResultPrefix}{idempotencyKey}";
        memoryCache.Set(cacheKey, result, ResultCacheTtl);

        // Clear the processing marker since we're done
        ClearProcessingMarker(idempotencyKey);

        logger.LogDebug(
            "Cached refund result for idempotency key {Key}. Success: {Success}",
            idempotencyKey, result.Success);
    }

    /// <inheritdoc />
    public bool TryMarkAsProcessing(string idempotencyKey)
    {
        var now = DateTime.UtcNow;
        var expiry = now.Add(ProcessingMarkerTtl);

        // Clean up any expired markers first
        CleanupExpiredMarkers(now);

        // Atomic TryAdd - returns true only if this thread successfully added the marker
        if (_processingMarkers.TryAdd(idempotencyKey, expiry))
        {
            return true;
        }

        // Key exists - check if it's expired
        if (_processingMarkers.TryGetValue(idempotencyKey, out var existingExpiry) && now >= existingExpiry)
        {
            // Marker expired - try to update it
            if (_processingMarkers.TryUpdate(idempotencyKey, expiry, existingExpiry))
            {
                return true;
            }
        }

        logger.LogWarning(
            "Duplicate payment request detected for idempotency key {Key} - request already in-flight",
            idempotencyKey);

        return false;
    }

    /// <inheritdoc />
    public void ClearProcessingMarker(string idempotencyKey)
    {
        _processingMarkers.TryRemove(idempotencyKey, out _);
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

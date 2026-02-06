using System.Collections.Concurrent;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Payments.Services;

/// <summary>
/// Implementation of payment idempotency service using database-backed deduplication.
/// Uses the Payment.IdempotencyKey column for reliable, distributed tracking that survives restarts.
/// Prevents duplicate payment/refund processing on network retries.
/// </summary>
public class PaymentIdempotencyService(
    IEFCoreScopeProvider<MerchelloDbContext> scopeProvider,
    ILogger<PaymentIdempotencyService> logger) : IPaymentIdempotencyService
{
    /// <summary>
    /// Duration to hold the processing marker (5 minutes max).
    /// </summary>
    private static readonly TimeSpan ProcessingMarkerTtl = TimeSpan.FromMinutes(5);

    /// <summary>
    /// Concurrent dictionary for processing markers - provides true atomic TryAdd.
    /// Used to prevent concurrent duplicate processing while payment is in-flight
    /// (before the Payment record is created).
    /// </summary>
    private static readonly ConcurrentDictionary<string, DateTime> _processingMarkers = new();

    /// <inheritdoc />
    /// <remarks>
    /// Queries the Payment table by IdempotencyKey and converts to PaymentResult.
    /// This provides reliable, distributed deduplication that survives restarts.
    /// </remarks>
    public async Task<PaymentResult?> GetCachedPaymentResultAsync(string idempotencyKey, CancellationToken ct = default)
    {
        var payment = await GetPaymentByIdempotencyAsync(idempotencyKey, ct, PaymentType.Payment);

        if (payment == null)
        {
            return null;
        }

        logger.LogInformation(
            "Returning existing payment for idempotency key {Key}. Success: {Success}",
            idempotencyKey, payment.PaymentSuccess);

        // Convert Payment to PaymentResult
        return new PaymentResult
        {
            Success = payment.PaymentSuccess,
            TransactionId = payment.TransactionId,
            Amount = payment.Amount,
            Status = payment.PaymentSuccess ? PaymentResultStatus.Completed : PaymentResultStatus.Failed,
            SettlementCurrency = payment.SettlementCurrencyCode,
            SettlementExchangeRate = payment.SettlementExchangeRate,
            SettlementAmount = payment.SettlementAmount,
            RiskScore = payment.RiskScore,
            RiskScoreSource = payment.RiskScoreSource
        };
    }

    /// <inheritdoc />
    /// <remarks>
    /// The Payment record with IdempotencyKey is the permanent "cached" record.
    /// This method just clears the in-flight processing marker.
    /// </remarks>
    public void CachePaymentResult(string idempotencyKey, PaymentResult result)
    {
        CacheResult(idempotencyKey, result.Success, "Payment");
    }

    /// <inheritdoc />
    /// <remarks>
    /// Queries the Payment table for refund records by IdempotencyKey.
    /// </remarks>
    public async Task<RefundResult?> GetCachedRefundResultAsync(string idempotencyKey, CancellationToken ct = default)
    {
        var payment = await GetPaymentByIdempotencyAsync(
            idempotencyKey,
            ct,
            PaymentType.Refund,
            PaymentType.PartialRefund);

        if (payment == null)
        {
            return null;
        }

        logger.LogInformation(
            "Returning existing refund for idempotency key {Key}. Success: {Success}",
            idempotencyKey, payment.PaymentSuccess);

        // Convert Payment to RefundResult (refunds have negative amounts, use absolute value)
        return new RefundResult
        {
            Success = payment.PaymentSuccess,
            RefundTransactionId = payment.TransactionId,
            AmountRefunded = Math.Abs(payment.Amount)
        };
    }

    /// <inheritdoc />
    /// <remarks>
    /// The Payment record with IdempotencyKey is the permanent "cached" record.
    /// This method just clears the in-flight processing marker.
    /// </remarks>
    public void CacheRefundResult(string idempotencyKey, RefundResult result)
    {
        CacheResult(idempotencyKey, result.Success, "Refund");
    }

    /// <inheritdoc />
    /// <remarks>
    /// First checks database for existing payment/refund with this idempotency key,
    /// then uses in-memory markers for in-flight request coordination.
    /// </remarks>
    public async Task<bool> TryMarkAsProcessingAsync(string idempotencyKey, CancellationToken ct = default)
    {
        // First check if already permanently processed in database
        using var scope = scopeProvider.CreateScope();
        var exists = await scope.ExecuteWithContextAsync(async db =>
            await db.Payments.AnyAsync(p => p.IdempotencyKey == idempotencyKey, ct));
        scope.Complete();

        if (exists)
        {
            logger.LogInformation(
                "Payment/refund with idempotency key {Key} already exists in database",
                idempotencyKey);
            return false;
        }

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

    private async Task<Payment?> GetPaymentByIdempotencyAsync(
        string idempotencyKey,
        CancellationToken ct,
        params PaymentType[] paymentTypes)
    {
        using var scope = scopeProvider.CreateScope();
        var payment = await scope.ExecuteWithContextAsync(async db => await db.Payments
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.IdempotencyKey == idempotencyKey && paymentTypes.Contains(p.PaymentType), ct));
        scope.Complete();

        return payment;
    }

    private void CacheResult(string idempotencyKey, bool success, string operation)
    {
        // The Payment record is created by the caller (PaymentService).
        // The IdempotencyKey on the Payment record serves as the permanent deduplication marker.
        // Just clear the in-flight processing marker.
        ClearProcessingMarker(idempotencyKey);

        logger.LogDebug(
            "{Operation} with idempotency key {Key} completed. Success: {Success}",
            operation, idempotencyKey, success);
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

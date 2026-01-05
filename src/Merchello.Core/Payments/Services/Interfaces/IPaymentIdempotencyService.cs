using Merchello.Core.Payments.Models;

namespace Merchello.Core.Payments.Services.Interfaces;

/// <summary>
/// Service for handling payment operation idempotency.
/// Prevents duplicate payment/refund processing on network retries.
/// </summary>
public interface IPaymentIdempotencyService
{
    /// <summary>
    /// Checks if a payment request with the given idempotency key has been processed.
    /// </summary>
    /// <param name="idempotencyKey">The idempotency key to check.</param>
    /// <returns>The cached result if already processed, null otherwise.</returns>
    PaymentResult? GetCachedPaymentResult(string idempotencyKey);

    /// <summary>
    /// Caches the result of a payment request for idempotency.
    /// </summary>
    /// <param name="idempotencyKey">The idempotency key.</param>
    /// <param name="result">The payment result to cache.</param>
    void CachePaymentResult(string idempotencyKey, PaymentResult result);

    /// <summary>
    /// Checks if a refund request with the given idempotency key has been processed.
    /// </summary>
    /// <param name="idempotencyKey">The idempotency key to check.</param>
    /// <returns>The cached result if already processed, null otherwise.</returns>
    RefundResult? GetCachedRefundResult(string idempotencyKey);

    /// <summary>
    /// Caches the result of a refund request for idempotency.
    /// </summary>
    /// <param name="idempotencyKey">The idempotency key.</param>
    /// <param name="result">The refund result to cache.</param>
    void CacheRefundResult(string idempotencyKey, RefundResult result);

    /// <summary>
    /// Marks a key as being processed (in-flight) to prevent concurrent duplicate requests.
    /// </summary>
    /// <param name="idempotencyKey">The idempotency key.</param>
    /// <returns>True if the key was successfully marked, false if already in-flight.</returns>
    bool TryMarkAsProcessing(string idempotencyKey);

    /// <summary>
    /// Clears the in-flight marker for a key (used if processing fails before caching result).
    /// </summary>
    /// <param name="idempotencyKey">The idempotency key.</param>
    void ClearProcessingMarker(string idempotencyKey);
}

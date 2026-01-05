namespace Merchello.Core.Payments.Models;

/// <summary>
/// Request model for processing a refund.
/// </summary>
public class RefundRequest
{
    /// <summary>
    /// The original payment ID to refund.
    /// </summary>
    public required Guid PaymentId { get; init; }

    /// <summary>
    /// The transaction ID from the payment provider.
    /// </summary>
    public required string TransactionId { get; init; }

    /// <summary>
    /// Amount to refund. If null, refunds the full amount.
    /// </summary>
    public decimal? Amount { get; init; }

    /// <summary>
    /// Reason for the refund.
    /// </summary>
    public string? Reason { get; init; }

    /// <summary>
    /// Additional metadata to pass to the payment provider.
    /// </summary>
    public Dictionary<string, string>? Metadata { get; init; }

    /// <summary>
    /// Idempotency key to prevent duplicate refund processing.
    /// <para>If provided, the system will reject duplicate requests with the same key
    /// and return the cached result from the original request.</para>
    /// <para>Keys should be unique per refund attempt (e.g., UUID).</para>
    /// <para>Keys are valid for 24 hours.</para>
    /// </summary>
    public string? IdempotencyKey { get; init; }
}


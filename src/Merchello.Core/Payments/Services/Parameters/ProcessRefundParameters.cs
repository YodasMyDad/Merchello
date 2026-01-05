namespace Merchello.Core.Payments.Services.Parameters;

/// <summary>
/// Parameters for processing a refund via payment provider
/// </summary>
public class ProcessRefundParameters
{
    /// <summary>
    /// The original payment ID to refund
    /// </summary>
    public required Guid PaymentId { get; init; }

    /// <summary>
    /// Amount to refund (null for full refund)
    /// </summary>
    public decimal? Amount { get; init; }

    /// <summary>
    /// Reason for the refund
    /// </summary>
    public required string Reason { get; init; }

    /// <summary>
    /// Idempotency key to prevent duplicate refund processing.
    /// <para>If provided, the system will reject duplicate requests with the same key
    /// and return the cached result from the original request.</para>
    /// </summary>
    public string? IdempotencyKey { get; init; }
}

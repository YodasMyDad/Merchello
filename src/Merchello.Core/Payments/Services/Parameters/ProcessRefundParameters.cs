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
}

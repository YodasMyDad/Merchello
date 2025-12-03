namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request to process a refund
/// </summary>
public class ProcessRefundDto
{
    /// <summary>
    /// Amount to refund. If null or 0, refunds the full refundable amount.
    /// </summary>
    public decimal? Amount { get; set; }

    /// <summary>
    /// Reason for the refund (required)
    /// </summary>
    public required string Reason { get; set; }

    /// <summary>
    /// If true, records a manual refund without calling the provider.
    /// Use when refund has already been processed externally.
    /// </summary>
    public bool IsManualRefund { get; set; }
}

namespace Merchello.Core.Payments.Services.Parameters;

/// <summary>
/// Parameters for recording a manual refund (processed externally)
/// </summary>
public class RecordManualRefundParameters
{
    /// <summary>
    /// The original payment ID
    /// </summary>
    public required Guid PaymentId { get; init; }

    /// <summary>
    /// Refund amount (must be positive)
    /// </summary>
    public required decimal Amount { get; init; }

    /// <summary>
    /// Reason for the refund
    /// </summary>
    public required string Reason { get; init; }
}

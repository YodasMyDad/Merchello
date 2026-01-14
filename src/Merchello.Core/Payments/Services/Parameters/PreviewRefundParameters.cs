namespace Merchello.Core.Payments.Services.Parameters;

/// <summary>
/// Parameters for previewing a refund calculation without actually processing it.
/// </summary>
public class PreviewRefundParameters
{
    /// <summary>
    /// The payment ID to preview refund for.
    /// </summary>
    public required Guid PaymentId { get; init; }

    /// <summary>
    /// Specific amount to refund. If null, previews full refund.
    /// </summary>
    public decimal? Amount { get; init; }

    /// <summary>
    /// Percentage of refundable amount (0-100). Takes precedence over Amount if provided.
    /// </summary>
    public decimal? Percentage { get; init; }
}

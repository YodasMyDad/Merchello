namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Request to preview a refund calculation.
/// </summary>
public class PreviewRefundRequestDto
{
    /// <summary>
    /// Specific amount to preview refund for. If null, previews full refund.
    /// </summary>
    public decimal? Amount { get; set; }

    /// <summary>
    /// Percentage of refundable amount (0-100). Takes precedence over Amount if provided.
    /// </summary>
    public decimal? Percentage { get; set; }
}

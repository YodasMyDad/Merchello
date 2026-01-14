namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Result of a refund preview calculation.
/// </summary>
public class RefundPreviewDto
{
    /// <summary>
    /// The payment ID being previewed.
    /// </summary>
    public Guid PaymentId { get; set; }

    /// <summary>
    /// The total refundable amount for this payment.
    /// </summary>
    public decimal RefundableAmount { get; set; }

    /// <summary>
    /// The calculated refund amount based on request (amount or percentage).
    /// </summary>
    public decimal RequestedAmount { get; set; }

    /// <summary>
    /// The currency code for the refund amounts.
    /// </summary>
    public required string CurrencyCode { get; set; }

    /// <summary>
    /// Whether the payment provider supports partial refunds.
    /// </summary>
    public bool SupportsPartialRefund { get; set; }

    /// <summary>
    /// Whether the payment provider supports refunds at all.
    /// </summary>
    public bool SupportsRefund { get; set; }

    /// <summary>
    /// The payment provider alias handling this payment.
    /// </summary>
    public string? ProviderAlias { get; set; }

    /// <summary>
    /// Formatted refundable amount for display.
    /// </summary>
    public string? FormattedRefundableAmount { get; set; }

    /// <summary>
    /// Formatted requested amount for display.
    /// </summary>
    public string? FormattedRequestedAmount { get; set; }
}

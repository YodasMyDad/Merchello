namespace Merchello.Core.Payments.Models;

/// <summary>
/// Complete payment status details for an invoice.
/// This is the single source of truth for payment status calculations.
/// </summary>
public record PaymentStatusDetails
{
    /// <summary>
    /// The overall payment status.
    /// </summary>
    public InvoicePaymentStatus Status { get; init; }

    /// <summary>
    /// Human-readable status display text.
    /// </summary>
    public string StatusDisplay { get; init; } = string.Empty;

    /// <summary>
    /// Total amount paid (sum of successful Payment type transactions).
    /// </summary>
    public decimal TotalPaid { get; init; }

    /// <summary>
    /// Total amount refunded (sum of Refund/PartialRefund transactions).
    /// </summary>
    public decimal TotalRefunded { get; init; }

    /// <summary>
    /// Net payment amount (TotalPaid - TotalRefunded).
    /// </summary>
    public decimal NetPayment { get; init; }

    /// <summary>
    /// Remaining balance due on the invoice.
    /// </summary>
    public decimal BalanceDue { get; init; }

    /// <summary>
    /// Total amount paid in store currency (for multi-currency orders).
    /// </summary>
    public decimal? TotalPaidInStoreCurrency { get; init; }

    /// <summary>
    /// Total amount refunded in store currency.
    /// </summary>
    public decimal? TotalRefundedInStoreCurrency { get; init; }

    /// <summary>
    /// Net payment amount in store currency.
    /// </summary>
    public decimal? NetPaymentInStoreCurrency { get; init; }

    /// <summary>
    /// Remaining balance due in store currency.
    /// </summary>
    public decimal? BalanceDueInStoreCurrency { get; init; }

    /// <summary>
    /// Maximum fraud/risk score across all payments (0-100 scale).
    /// Null if no payments have risk scores.
    /// </summary>
    public decimal? MaxRiskScore { get; init; }

    /// <summary>
    /// Source of the maximum risk score.
    /// </summary>
    public string? MaxRiskScoreSource { get; init; }

    /// <summary>
    /// Gets the display text for a payment status.
    /// </summary>
    public static string GetStatusDisplay(InvoicePaymentStatus status) => status switch
    {
        InvoicePaymentStatus.Paid => "Paid",
        InvoicePaymentStatus.PartiallyPaid => "Partially Paid",
        InvoicePaymentStatus.PartiallyRefunded => "Partially Refunded",
        InvoicePaymentStatus.Refunded => "Refunded",
        InvoicePaymentStatus.AwaitingPayment => "Awaiting Payment",
        _ => "Unpaid"
    };
}

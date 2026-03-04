using Merchello.Core.Payments.Models;

namespace Merchello.Core.Payments.Dtos;

/// <summary>
/// Invoice payment status response
/// </summary>
public class PaymentStatusDto
{
    public Guid InvoiceId { get; set; }
    public string CurrencyCode { get; set; } = string.Empty;
    public string CurrencySymbol { get; set; } = string.Empty;
    public string StoreCurrencyCode { get; set; } = string.Empty;
    public string StoreCurrencySymbol { get; set; } = string.Empty;
    public InvoicePaymentStatus Status { get; set; }
    public string StatusDisplay { get; set; } = string.Empty;
    /// <summary>
    /// CSS class for payment status badge styling (e.g., "paid", "partial", "refunded").
    /// Calculated by backend to avoid frontend logic duplication.
    /// </summary>
    public string StatusCssClass { get; set; } = "unpaid";
    public decimal InvoiceTotal { get; set; }
    public decimal? InvoiceTotalInStoreCurrency { get; set; }
    public decimal TotalPaid { get; set; }
    public decimal? TotalPaidInStoreCurrency { get; set; }
    public decimal TotalRefunded { get; set; }
    public decimal? TotalRefundedInStoreCurrency { get; set; }
    public decimal NetPayment { get; set; }
    public decimal? NetPaymentInStoreCurrency { get; set; }
    public decimal BalanceDue { get; set; }
    public decimal? BalanceDueInStoreCurrency { get; set; }

    /// <summary>
    /// Amount overpaid beyond the invoice total (always >= 0).
    /// When > 0, indicates funds that should be refunded to the customer.
    /// </summary>
    public decimal CreditDue { get; set; }

    /// <summary>
    /// Amount overpaid in store currency.
    /// </summary>
    public decimal? CreditDueInStoreCurrency { get; set; }

    /// <summary>
    /// Maximum fraud/risk score across all payments (0-100 scale).
    /// </summary>
    public decimal? MaxRiskScore { get; set; }

    /// <summary>
    /// Source of the maximum risk score.
    /// </summary>
    public string? MaxRiskScoreSource { get; set; }

    /// <summary>
    /// Risk level classification based on MaxRiskScore.
    /// Values: "high" (>=75), "medium" (>=50), "low" (>=25), "minimal" (&lt;25), null (no risk score).
    /// Calculated by backend to ensure consistency - frontend should use this instead of local threshold logic.
    /// </summary>
    public string? RiskLevel { get; set; }

    /// <summary>
    /// Balance status classification based on BalanceDue and CreditDue.
    /// Values: "Underpaid" (BalanceDue > 0), "Overpaid" (CreditDue > 0), "Balanced" (neither).
    /// Calculated by backend to ensure consistency - frontend should use this instead of local amount comparisons.
    /// </summary>
    public string BalanceStatus { get; set; } = "Balanced";

    /// <summary>
    /// CSS class for balance status styling (e.g., "balanced", "underpaid", "overpaid").
    /// Calculated by backend to avoid frontend logic duplication.
    /// </summary>
    public string BalanceStatusCssClass { get; set; } = "balanced";

    /// <summary>
    /// Display label for balance due row (e.g., "Balance Due", "Credit Due").
    /// Calculated by backend to avoid frontend logic duplication.
    /// </summary>
    public string BalanceStatusLabel { get; set; } = string.Empty;
}

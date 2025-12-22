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
    /// Balance status classification based on BalanceDue.
    /// Values: "Balanced" (balance = 0), "Underpaid" (balance > 0), "Overpaid" (balance &lt; 0).
    /// Calculated by backend to ensure consistency - frontend should use this instead of local amount comparisons.
    /// </summary>
    public string BalanceStatus { get; set; } = "Balanced";
}

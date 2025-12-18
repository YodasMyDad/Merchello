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
}

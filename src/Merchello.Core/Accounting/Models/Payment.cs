using Merchello.Core.Payments.Models;
using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Accounting.Models;

public class Payment
{
    /// <summary>
    /// Payment Id
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// The invoice id
    /// </summary>
    public Guid InvoiceId { get; set; }

    /// <summary>
    /// Invoice this payment is for
    /// </summary>
    public Invoice Invoice { get; set; } = default!;

    /// <summary>
    /// Amount of this payment (negative for refunds)
    /// </summary>
    public decimal Amount { get; set; }

    /// <summary>
    /// Payment currency (should match the invoice currency) - ISO 4217.
    /// </summary>
    public string CurrencyCode { get; set; } = "USD";

    /// <summary>
    /// Store currency equivalent of this payment amount ("shop money").
    /// </summary>
    public decimal? AmountInStoreCurrency { get; set; }

    /// <summary>
    /// Optional settlement currency reported by the payment provider - ISO 4217.
    /// </summary>
    public string? SettlementCurrencyCode { get; set; }

    /// <summary>
    /// Optional settlement exchange rate reported by the payment provider.
    /// </summary>
    public decimal? SettlementExchangeRate { get; set; }

    /// <summary>
    /// Optional settlement amount reported by the payment provider (may be net of fees).
    /// </summary>
    public decimal? SettlementAmount { get; set; }

    /// <summary>
    /// Optional settlement exchange rate source (e.g. "stripe", "paypal", "manual").
    /// </summary>
    public string? SettlementExchangeRateSource { get; set; }

    /// <summary>
    /// Payment method (legacy field, use PaymentProviderAlias for new payments)
    /// </summary>
    public string? PaymentMethod { get; set; }

    /// <summary>
    /// The payment provider alias used (e.g., "stripe", "paypal")
    /// </summary>
    public string? PaymentProviderAlias { get; set; }

    /// <summary>
    /// Type of payment record
    /// </summary>
    public PaymentType PaymentType { get; set; } = PaymentType.Payment;

    /// <summary>
    /// Transaction Id from the payment provider
    /// </summary>
    public string? TransactionId { get; set; }

    /// <summary>
    /// Details and response from any built in fraud tools
    /// </summary>
    public string? FraudResponse { get; set; }

    /// <summary>
    /// Numeric fraud/risk score (0-100 scale). Higher = higher risk.
    /// </summary>
    public decimal? RiskScore { get; set; }

    /// <summary>
    /// Source of the risk score (e.g., "stripe-radar", "signifyd").
    /// </summary>
    public string? RiskScoreSource { get; set; }

    /// <summary>
    /// Description about the payment
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Whether this payment was a success
    /// </summary>
    public bool PaymentSuccess { get; set; }

    /// <summary>
    /// Reason for refund (if PaymentType is Refund/PartialRefund)
    /// </summary>
    public string? RefundReason { get; set; }

    /// <summary>
    /// Parent payment ID (for refunds linking to original payment)
    /// </summary>
    public Guid? ParentPaymentId { get; set; }

    /// <summary>
    /// Navigation to parent payment (for refunds)
    /// </summary>
    public Payment? ParentPayment { get; set; }

    /// <summary>
    /// Child refund payments
    /// </summary>
    public virtual ICollection<Payment>? Refunds { get; set; }

    /// <summary>
    /// Date created
    /// </summary>
    public DateTime DateCreated { get; set; } = DateTime.UtcNow;
}

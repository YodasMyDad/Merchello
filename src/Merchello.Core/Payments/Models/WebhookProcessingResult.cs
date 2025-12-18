namespace Merchello.Core.Payments.Models;

/// <summary>
/// Result of processing a webhook from a payment provider.
/// </summary>
public class WebhookProcessingResult
{
    /// <summary>
    /// Whether the webhook was processed successfully.
    /// </summary>
    public bool Success { get; init; }

    /// <summary>
    /// The type of event that was processed.
    /// </summary>
    public WebhookEventType? EventType { get; init; }

    /// <summary>
    /// Transaction ID associated with this webhook event.
    /// </summary>
    public string? TransactionId { get; init; }

    /// <summary>
    /// Invoice ID if this webhook is related to an invoice.
    /// </summary>
    public Guid? InvoiceId { get; init; }

    /// <summary>
    /// Amount involved in the event (e.g., payment amount, refund amount).
    /// </summary>
    public decimal? Amount { get; init; }

    /// <summary>
    /// Optional settlement/payout currency reported by provider.
    /// </summary>
    public string? SettlementCurrency { get; init; }

    /// <summary>
    /// Optional settlement exchange rate reported by provider.
    /// </summary>
    public decimal? SettlementExchangeRate { get; init; }

    /// <summary>
    /// Optional settlement amount reported by provider (may be net of fees).
    /// </summary>
    public decimal? SettlementAmount { get; init; }

    /// <summary>
    /// Fraud/risk score (0-100 scale). Higher = higher risk.
    /// </summary>
    public decimal? RiskScore { get; init; }

    /// <summary>
    /// Source of the risk score (e.g., "stripe-radar").
    /// </summary>
    public string? RiskScoreSource { get; init; }

    /// <summary>
    /// Error message if Success is false.
    /// </summary>
    public string? ErrorMessage { get; init; }

    /// <summary>
    /// Whether this webhook event was already processed (idempotency check).
    /// </summary>
    public bool AlreadyProcessed { get; init; }

    /// <summary>
    /// Creates a successful result.
    /// </summary>
    public static WebhookProcessingResult Successful(
        WebhookEventType eventType,
        string transactionId,
        Guid? invoiceId = null,
        decimal? amount = null,
        string? settlementCurrency = null,
        decimal? settlementExchangeRate = null,
        decimal? settlementAmount = null,
        decimal? riskScore = null,
        string? riskScoreSource = null) => new()
    {
        Success = true,
        EventType = eventType,
        TransactionId = transactionId,
        InvoiceId = invoiceId,
        Amount = amount,
        SettlementCurrency = settlementCurrency,
        SettlementExchangeRate = settlementExchangeRate,
        SettlementAmount = settlementAmount,
        RiskScore = riskScore,
        RiskScoreSource = riskScoreSource
    };

    /// <summary>
    /// Creates a result indicating the event was already processed.
    /// </summary>
    public static WebhookProcessingResult Duplicate(string transactionId) => new()
    {
        Success = true,
        AlreadyProcessed = true,
        TransactionId = transactionId
    };

    /// <summary>
    /// Creates a failure result.
    /// </summary>
    public static WebhookProcessingResult Failure(string errorMessage) => new()
    {
        Success = false,
        ErrorMessage = errorMessage
    };
}

/// <summary>
/// Types of webhook events that can be processed.
/// </summary>
public enum WebhookEventType
{
    /// <summary>
    /// Payment was completed successfully.
    /// </summary>
    PaymentCompleted,

    /// <summary>
    /// Payment failed.
    /// </summary>
    PaymentFailed,

    /// <summary>
    /// Payment was cancelled by the customer.
    /// </summary>
    PaymentCancelled,

    /// <summary>
    /// A refund was processed.
    /// </summary>
    RefundCompleted,

    /// <summary>
    /// A chargeback/dispute was opened.
    /// </summary>
    DisputeOpened,

    /// <summary>
    /// A chargeback/dispute was resolved.
    /// </summary>
    DisputeResolved,

    /// <summary>
    /// Unknown or unhandled event type.
    /// </summary>
    Unknown
}

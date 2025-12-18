namespace Merchello.Core.Payments.Services.Parameters;

/// <summary>
/// Parameters for recording a successful payment
/// </summary>
public class RecordPaymentParameters
{
    /// <summary>
    /// The invoice ID
    /// </summary>
    public required Guid InvoiceId { get; init; }

    /// <summary>
    /// The payment provider alias
    /// </summary>
    public required string ProviderAlias { get; init; }

    /// <summary>
    /// Transaction ID from the provider
    /// </summary>
    public required string TransactionId { get; init; }

    /// <summary>
    /// Payment amount
    /// </summary>
    public required decimal Amount { get; init; }

    /// <summary>
    /// Optional description
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Optional fraud check response
    /// </summary>
    public string? FraudResponse { get; init; }

    /// <summary>
    /// Optional fraud/risk score (0-100 scale)
    /// </summary>
    public decimal? RiskScore { get; init; }

    /// <summary>
    /// Optional source of the risk score
    /// </summary>
    public string? RiskScoreSource { get; init; }

    /// <summary>
    /// Optional settlement/payout currency reported by provider (ISO 4217).
    /// </summary>
    public string? SettlementCurrencyCode { get; init; }

    /// <summary>
    /// Optional settlement exchange rate reported by provider.
    /// </summary>
    public decimal? SettlementExchangeRate { get; init; }

    /// <summary>
    /// Optional settlement amount reported by provider (may be net of fees).
    /// </summary>
    public decimal? SettlementAmount { get; init; }

    /// <summary>
    /// Optional settlement exchange rate source identifier.
    /// </summary>
    public string? SettlementExchangeRateSource { get; init; }
}

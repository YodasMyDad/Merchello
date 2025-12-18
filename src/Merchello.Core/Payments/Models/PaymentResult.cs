using System.Collections.Generic;

namespace Merchello.Core.Payments.Models;

/// <summary>
/// Result of processing a payment.
/// </summary>
public class PaymentResult
{
    /// <summary>
    /// Whether the payment was processed successfully.
    /// </summary>
    public required bool Success { get; init; }

    /// <summary>
    /// Error message if Success is false.
    /// </summary>
    public string? ErrorMessage { get; init; }

    /// <summary>
    /// Error code from the payment provider.
    /// </summary>
    public string? ErrorCode { get; init; }

    /// <summary>
    /// Provider's transaction/payment ID.
    /// </summary>
    public string? TransactionId { get; init; }

    /// <summary>
    /// Current status of the payment.
    /// </summary>
    public PaymentResultStatus Status { get; init; }

    /// <summary>
    /// Amount that was charged.
    /// </summary>
    public decimal? Amount { get; init; }

    /// <summary>
    /// Optional settlement/payout currency reported by provider (may differ from invoice currency).
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
    /// Additional data from the provider.
    /// </summary>
    public Dictionary<string, object>? ProviderData { get; init; }

    /// <summary>
    /// Fraud/risk score returned by the provider (0-100 scale).
    /// </summary>
    public decimal? RiskScore { get; init; }

    /// <summary>
    /// Source of the risk score (e.g., "stripe-radar").
    /// </summary>
    public string? RiskScoreSource { get; init; }

    // =====================================================
    // Factory methods
    // =====================================================

    /// <summary>
    /// Creates a failed payment result.
    /// </summary>
    public static PaymentResult Failed(string errorMessage, string? errorCode = null) => new()
    {
        Success = false,
        ErrorMessage = errorMessage,
        ErrorCode = errorCode,
        Status = PaymentResultStatus.Failed
    };

    /// <summary>
    /// Creates a successful completed payment result.
    /// </summary>
    public static PaymentResult Completed(string transactionId, decimal amount) => new()
    {
        Success = true,
        TransactionId = transactionId,
        Amount = amount,
        Status = PaymentResultStatus.Completed
    };

    /// <summary>
    /// Creates a pending payment result (awaiting async confirmation).
    /// </summary>
    public static PaymentResult Pending(string transactionId, decimal amount) => new()
    {
        Success = true,
        TransactionId = transactionId,
        Amount = amount,
        Status = PaymentResultStatus.Pending
    };

    /// <summary>
    /// Creates an authorized (but not captured) payment result.
    /// </summary>
    public static PaymentResult Authorized(string transactionId, decimal amount) => new()
    {
        Success = true,
        TransactionId = transactionId,
        Amount = amount,
        Status = PaymentResultStatus.Authorized
    };

    /// <summary>
    /// Creates a cancelled payment result.
    /// </summary>
    public static PaymentResult Cancelled(string? message = null) => new()
    {
        Success = false,
        ErrorMessage = message ?? "Payment was cancelled",
        Status = PaymentResultStatus.Cancelled
    };
}

/// <summary>
/// Status of a payment result.
/// </summary>
public enum PaymentResultStatus
{
    /// <summary>
    /// Payment initiated but not confirmed (async confirmation via webhook).
    /// </summary>
    Pending = 0,

    /// <summary>
    /// Payment authorized but not captured.
    /// </summary>
    Authorized = 10,

    /// <summary>
    /// Payment completed successfully.
    /// </summary>
    Completed = 20,

    /// <summary>
    /// Payment failed.
    /// </summary>
    Failed = 30,

    /// <summary>
    /// Payment cancelled by customer.
    /// </summary>
    Cancelled = 40
}

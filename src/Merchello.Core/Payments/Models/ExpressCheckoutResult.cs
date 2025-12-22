namespace Merchello.Core.Payments.Models;

/// <summary>
/// Result of processing an express checkout payment.
/// </summary>
public class ExpressCheckoutResult
{
    /// <summary>
    /// Whether the payment was processed successfully.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Error message if the payment failed.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Error code from the provider (if any).
    /// </summary>
    public string? ErrorCode { get; set; }

    /// <summary>
    /// The payment status after processing.
    /// </summary>
    public PaymentResultStatus Status { get; set; }

    /// <summary>
    /// The transaction ID from the payment provider.
    /// </summary>
    public string? TransactionId { get; set; }

    /// <summary>
    /// The amount that was charged.
    /// </summary>
    public decimal Amount { get; set; }

    /// <summary>
    /// Optional provider-specific data to store with the payment.
    /// </summary>
    public Dictionary<string, string>? ProviderData { get; set; }

    /// <summary>
    /// Creates a successful express checkout result.
    /// </summary>
    public static ExpressCheckoutResult Completed(string transactionId, decimal amount) => new()
    {
        Success = true,
        Status = PaymentResultStatus.Completed,
        TransactionId = transactionId,
        Amount = amount
    };

    /// <summary>
    /// Creates a pending express checkout result (awaiting webhook confirmation).
    /// </summary>
    public static ExpressCheckoutResult Pending(string transactionId, decimal amount) => new()
    {
        Success = true,
        Status = PaymentResultStatus.Pending,
        TransactionId = transactionId,
        Amount = amount
    };

    /// <summary>
    /// Creates a failed express checkout result.
    /// </summary>
    public static ExpressCheckoutResult Failed(string error, string? errorCode = null) => new()
    {
        Success = false,
        Status = PaymentResultStatus.Failed,
        ErrorMessage = error,
        ErrorCode = errorCode
    };
}

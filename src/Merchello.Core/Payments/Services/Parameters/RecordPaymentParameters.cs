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
}

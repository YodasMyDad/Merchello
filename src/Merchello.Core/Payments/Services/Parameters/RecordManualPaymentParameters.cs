namespace Merchello.Core.Payments.Services.Parameters;

/// <summary>
/// Parameters for recording a manual/offline payment
/// </summary>
public class RecordManualPaymentParameters
{
    /// <summary>
    /// The invoice ID
    /// </summary>
    public required Guid InvoiceId { get; init; }

    /// <summary>
    /// Payment amount
    /// </summary>
    public required decimal Amount { get; init; }

    /// <summary>
    /// Payment method description (e.g., "Cash", "Check", "Bank Transfer")
    /// </summary>
    public required string PaymentMethod { get; init; }

    /// <summary>
    /// Optional description/notes
    /// </summary>
    public string? Description { get; init; }
}

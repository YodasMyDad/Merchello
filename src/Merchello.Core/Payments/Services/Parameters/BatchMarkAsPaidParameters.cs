namespace Merchello.Core.Payments.Services.Parameters;

/// <summary>
/// Parameters for marking multiple invoices as paid.
/// Each invoice gets its own payment record matching its outstanding balance.
/// </summary>
public class BatchMarkAsPaidParameters
{
    /// <summary>
    /// List of invoice IDs to mark as paid.
    /// </summary>
    public required List<Guid> InvoiceIds { get; init; }

    /// <summary>
    /// Payment method description (e.g., "Bank Transfer (BACS)", "Cheque", "Cash").
    /// </summary>
    public required string PaymentMethod { get; init; }

    /// <summary>
    /// Optional reference number (e.g., "BAC-2026-01-07", "CHQ-12345").
    /// Applied to all created payments for traceability.
    /// </summary>
    public string? Reference { get; init; }

    /// <summary>
    /// Optional date when payment was received.
    /// Defaults to current UTC time if not specified.
    /// </summary>
    public DateTime? DateReceived { get; init; }
}

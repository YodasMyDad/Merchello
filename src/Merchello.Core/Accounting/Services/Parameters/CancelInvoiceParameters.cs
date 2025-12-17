namespace Merchello.Core.Accounting.Services.Parameters;

/// <summary>
/// Parameters for cancelling an invoice
/// </summary>
public class CancelInvoiceParameters
{
    /// <summary>
    /// The invoice ID to cancel
    /// </summary>
    public required Guid InvoiceId { get; init; }

    /// <summary>
    /// Reason for cancellation
    /// </summary>
    public required string Reason { get; init; }

    /// <summary>
    /// Optional author user ID (for audit)
    /// </summary>
    public Guid? AuthorId { get; init; }

    /// <summary>
    /// Optional author name (defaults to "System" if not provided)
    /// </summary>
    public string? AuthorName { get; init; }
}

using Merchello.Core.Accounting.Dtos;

namespace Merchello.Core.Accounting.Services.Parameters;

/// <summary>
/// Parameters for editing an invoice
/// </summary>
public class EditInvoiceParameters
{
    /// <summary>
    /// The invoice ID to edit
    /// </summary>
    public required Guid InvoiceId { get; init; }

    /// <summary>
    /// The edit request details (line item changes, discounts, etc.)
    /// </summary>
    public required EditInvoiceDto Request { get; init; }

    /// <summary>
    /// Optional author user ID for audit trail
    /// </summary>
    public Guid? AuthorId { get; init; }

    /// <summary>
    /// Optional author name (defaults to "System" if not provided)
    /// </summary>
    public string? AuthorName { get; init; }
}

namespace Merchello.Core.Accounting.Services.Parameters;

/// <summary>
/// Parameters for adding a note to an invoice
/// </summary>
public class AddInvoiceNoteParameters
{
    /// <summary>
    /// The invoice ID
    /// </summary>
    public required Guid InvoiceId { get; init; }

    /// <summary>
    /// The note text
    /// </summary>
    public required string Text { get; init; }

    /// <summary>
    /// Whether the note is visible to the customer
    /// </summary>
    public bool VisibleToCustomer { get; init; }

    /// <summary>
    /// Optional author user ID
    /// </summary>
    public Guid? AuthorId { get; init; }

    /// <summary>
    /// Optional author name (defaults to "System" if not provided)
    /// </summary>
    public string? AuthorName { get; init; }
}

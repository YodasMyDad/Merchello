namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Request DTO for adding a note to an invoice
/// </summary>
public class AddInvoiceNoteDto
{
    public string Text { get; set; } = string.Empty;
    public bool VisibleToCustomer { get; set; }
}

namespace Merchello.Core.Accounting.Models;

public class InvoiceNote
{
    /// <summary>
    /// Date the note is created
    /// </summary>
    public DateTime DateCreated { get; set; }

    /// <summary>
    /// Optional author ID if created by a backoffice user
    /// </summary>
    public Guid? AuthorId { get; set; }

    /// <summary>
    /// Optional author name of the note if available
    /// </summary>
    public string? Author { get; set; }

    /// <summary>
    /// Is this note visible to the customer on the invoice
    /// </summary>
    public bool VisibleToCustomer { get; set; }

    /// <summary>
    /// General description of the note
    /// </summary>
    public string? Description { get; set; }
}

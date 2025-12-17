namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Result DTO returned after creating a draft order
/// </summary>
public class CreateDraftOrderResultDto
{
    /// <summary>
    /// Whether the draft order was created successfully
    /// </summary>
    public bool IsSuccessful { get; set; }

    /// <summary>
    /// The ID of the created invoice (if successful)
    /// </summary>
    public Guid? InvoiceId { get; set; }

    /// <summary>
    /// The invoice number of the created order (if successful)
    /// </summary>
    public string? InvoiceNumber { get; set; }

    /// <summary>
    /// Error message if creation failed
    /// </summary>
    public string? ErrorMessage { get; set; }
}

namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Request to cancel an invoice
/// </summary>
public class CancelInvoiceDto
{
    /// <summary>
    /// Reason for cancellation (required)
    /// </summary>
    public required string Reason { get; set; }
}

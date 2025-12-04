namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Response after editing an invoice
/// </summary>
public class EditInvoiceResultDto
{
    /// <summary>
    /// Whether the edit was successful
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Error message if not successful
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Warning messages (stock issues, etc.) - edit still succeeded but user should be notified
    /// </summary>
    public List<string> Warnings { get; set; } = [];

    /// <summary>
    /// The updated invoice data
    /// </summary>
    public OrderDetailDto? Invoice { get; set; }
}


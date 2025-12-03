namespace Merchello.Core.Accounting.Dtos;

/// <summary>
/// Invoice note DTO for timeline
/// </summary>
public class InvoiceNoteDto
{
    public DateTime Date { get; set; }
    public string Text { get; set; } = string.Empty;
    public string? Author { get; set; }
}

namespace Merchello.Core.Shared.Services.Models;

/// <summary>
/// Column definition for PDF tables.
/// </summary>
public record PdfTableColumn(string Header, double Width, PdfTextAlignment Alignment = PdfTextAlignment.Left);

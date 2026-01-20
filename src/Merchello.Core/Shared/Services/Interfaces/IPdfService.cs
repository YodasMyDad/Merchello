using Merchello.Core.Shared.Services.Models;
using PdfSharp.Drawing;
using PdfSharp.Pdf;

namespace Merchello.Core.Shared.Services.Interfaces;

/// <summary>
/// Service for generating PDF documents. Provides common utilities for creating
/// professional documents like statements, invoices, packing slips, and reports.
/// </summary>
public interface IPdfService
{
    /// <summary>
    /// Creates a new PDF document with standard page setup.
    /// </summary>
    /// <param name="title">Document title for metadata.</param>
    /// <param name="pageSize">Page size (defaults to A4).</param>
    /// <returns>A new PdfDocument instance.</returns>
    PdfDocument CreateDocument(string title, PdfPageSize pageSize = PdfPageSize.A4);

    /// <summary>
    /// Adds a new page to the document and returns a graphics context for drawing.
    /// </summary>
    /// <param name="document">The PDF document.</param>
    /// <returns>Graphics context for the new page.</returns>
    (PdfPage Page, XGraphics Graphics) AddPage(PdfDocument document);

    /// <summary>
    /// Draws a standard document header with company branding.
    /// </summary>
    /// <param name="graphics">Graphics context.</param>
    /// <param name="page">The page being drawn on.</param>
    /// <param name="title">Document title (e.g., "Customer Statement").</param>
    /// <param name="companyName">Company name.</param>
    /// <param name="companyAddress">Optional multi-line company address.</param>
    /// <returns>The Y position after the header for continued drawing.</returns>
    double DrawHeader(XGraphics graphics, PdfPage page, string title, string companyName, string? companyAddress = null);

    /// <summary>
    /// Draws a standard document footer with page numbers.
    /// </summary>
    /// <param name="graphics">Graphics context.</param>
    /// <param name="page">The page being drawn on.</param>
    /// <param name="pageNumber">Current page number.</param>
    /// <param name="totalPages">Total number of pages.</param>
    /// <param name="generatedDate">Date the document was generated.</param>
    void DrawFooter(XGraphics graphics, PdfPage page, int pageNumber, int totalPages, DateTime generatedDate);

    /// <summary>
    /// Draws a simple table with headers and rows.
    /// </summary>
    /// <param name="graphics">Graphics context.</param>
    /// <param name="startY">Starting Y position.</param>
    /// <param name="columns">Column definitions (header text, width, alignment).</param>
    /// <param name="rows">Data rows (array of cell values).</param>
    /// <param name="leftMargin">Left margin for the table.</param>
    /// <returns>The Y position after the table.</returns>
    double DrawTable(
        XGraphics graphics,
        double startY,
        IReadOnlyList<PdfTableColumn> columns,
        IReadOnlyList<string[]> rows,
        double leftMargin = 40);

    /// <summary>
    /// Draws text at the specified position.
    /// </summary>
    /// <param name="graphics">Graphics context.</param>
    /// <param name="text">Text to draw.</param>
    /// <param name="x">X position.</param>
    /// <param name="y">Y position.</param>
    /// <param name="font">Font to use (defaults to standard body font).</param>
    /// <param name="brush">Brush for text color (defaults to black).</param>
    void DrawText(XGraphics graphics, string text, double x, double y, XFont? font = null, XBrush? brush = null);

    /// <summary>
    /// Draws a horizontal line.
    /// </summary>
    /// <param name="graphics">Graphics context.</param>
    /// <param name="y">Y position of the line.</param>
    /// <param name="leftMargin">Left margin.</param>
    /// <param name="rightMargin">Right margin.</param>
    /// <param name="page">The page for calculating width.</param>
    /// <param name="thickness">Line thickness (defaults to 0.5).</param>
    void DrawLine(XGraphics graphics, double y, double leftMargin, double rightMargin, PdfPage page, double thickness = 0.5);

    /// <summary>
    /// Saves the document to a byte array.
    /// </summary>
    /// <param name="document">The PDF document.</param>
    /// <returns>PDF file as bytes.</returns>
    byte[] SaveToBytes(PdfDocument document);

    /// <summary>
    /// Gets the standard fonts used in documents.
    /// </summary>
    PdfFonts Fonts { get; }

    /// <summary>
    /// Gets the standard margins used in documents.
    /// </summary>
    PdfMargins Margins { get; }
}

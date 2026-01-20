using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shared.Services.Models;
using PdfSharp.Drawing;
using PdfSharp.Fonts;
using PdfSharp.Pdf;

namespace Merchello.Core.Shared.Services;

/// <summary>
/// Service for generating PDF documents using PDFsharp.
/// Provides reusable utilities for creating professional documents.
/// </summary>
public class PdfService : IPdfService
{
    // Liberation Sans is metrically compatible with Arial and embedded in the assembly
    private const string FontFamily = "Liberation Sans";

    static PdfService()
    {
        if (GlobalFontSettings.FontResolver is null)
        {
            // Use embedded fonts for cross-platform compatibility (Windows, macOS, Linux, Docker)
            GlobalFontSettings.FontResolver = new EmbeddedFontResolver();
        }
    }

    public PdfFonts Fonts { get; } = new()
    {
        Title = new XFont(FontFamily, 18, XFontStyleEx.Bold),
        Subtitle = new XFont(FontFamily, 14, XFontStyleEx.Bold),
        Body = new XFont(FontFamily, 10, XFontStyleEx.Regular),
        BodyBold = new XFont(FontFamily, 10, XFontStyleEx.Bold),
        Small = new XFont(FontFamily, 8, XFontStyleEx.Regular),
        TableHeader = new XFont(FontFamily, 9, XFontStyleEx.Bold),
        TableBody = new XFont(FontFamily, 9, XFontStyleEx.Regular)
    };

    public PdfMargins Margins { get; } = new(Left: 40, Right: 40, Top: 40, Bottom: 40);

    public PdfDocument CreateDocument(string title, PdfPageSize pageSize = PdfPageSize.A4)
    {
        var document = new PdfDocument();
        document.Info.Title = title;
        document.Info.Author = "Merchello";
        document.Info.Creator = "Merchello PDF Service";
        return document;
    }

    public (PdfPage Page, XGraphics Graphics) AddPage(PdfDocument document)
    {
        var page = document.AddPage();
        page.Size = PdfSharp.PageSize.A4;
        var graphics = XGraphics.FromPdfPage(page);
        return (page, graphics);
    }

    public double DrawHeader(
        XGraphics graphics,
        PdfPage page,
        string title,
        string companyName,
        string? companyAddress = null)
    {
        var y = Margins.Top;

        // Company name (top right)
        var companyNameWidth = graphics.MeasureString(companyName, Fonts.Subtitle).Width;
        graphics.DrawString(
            companyName,
            Fonts.Subtitle,
            XBrushes.Black,
            page.Width.Point - Margins.Right - companyNameWidth,
            y);

        // Company address (if provided)
        if (!string.IsNullOrWhiteSpace(companyAddress))
        {
            y += 18;
            var addressLines = companyAddress.Split('\n', StringSplitOptions.RemoveEmptyEntries);
            foreach (var line in addressLines)
            {
                var lineWidth = graphics.MeasureString(line.Trim(), Fonts.Small).Width;
                graphics.DrawString(
                    line.Trim(),
                    Fonts.Small,
                    XBrushes.DarkGray,
                    page.Width.Point - Margins.Right - lineWidth,
                    y);
                y += 12;
            }
        }

        // Document title (top left)
        graphics.DrawString(title, Fonts.Title, XBrushes.Black, Margins.Left, Margins.Top);

        // Ensure we return a position below both the title and address
        y = Math.Max(y, Margins.Top + 30);

        // Draw a line under the header
        y += 10;
        DrawLine(graphics, y, Margins.Left, Margins.Right, page);
        y += 15;

        return y;
    }

    public void DrawFooter(
        XGraphics graphics,
        PdfPage page,
        int pageNumber,
        int totalPages,
        DateTime generatedDate)
    {
        var footerY = page.Height.Point - Margins.Bottom + 10;

        // Page number (center)
        var pageText = $"Page {pageNumber} of {totalPages}";
        var pageTextWidth = graphics.MeasureString(pageText, Fonts.Small).Width;
        graphics.DrawString(
            pageText,
            Fonts.Small,
            XBrushes.Gray,
            (page.Width.Point - pageTextWidth) / 2,
            footerY);

        // Generated date (right)
        var dateText = $"Generated: {generatedDate:dd MMM yyyy HH:mm}";
        var dateTextWidth = graphics.MeasureString(dateText, Fonts.Small).Width;
        graphics.DrawString(
            dateText,
            Fonts.Small,
            XBrushes.Gray,
            page.Width.Point - Margins.Right - dateTextWidth,
            footerY);
    }

    public double DrawTable(
        XGraphics graphics,
        double startY,
        IReadOnlyList<PdfTableColumn> columns,
        IReadOnlyList<string[]> rows,
        double leftMargin = 40)
    {
        var y = startY;
        var rowHeight = 18.0;
        var headerHeight = 22.0;
        var cellPadding = 4.0;

        // Draw header background
        var totalWidth = columns.Sum(c => c.Width);
        graphics.DrawRectangle(
            new XSolidBrush(XColor.FromGrayScale(0.9)),
            leftMargin,
            y,
            totalWidth,
            headerHeight);

        // Draw header text
        var x = leftMargin;
        foreach (var column in columns)
        {
            var headerX = GetAlignedX(x, column.Width, column.Header, Fonts.TableHeader, column.Alignment, graphics, cellPadding);
            graphics.DrawString(column.Header, Fonts.TableHeader, XBrushes.Black, headerX, y + 15);
            x += column.Width;
        }

        y += headerHeight;

        // Draw rows
        var alternateRow = false;
        foreach (var row in rows)
        {
            // Alternate row background
            if (alternateRow)
            {
                graphics.DrawRectangle(
                    new XSolidBrush(XColor.FromGrayScale(0.97)),
                    leftMargin,
                    y,
                    totalWidth,
                    rowHeight);
            }

            x = leftMargin;
            for (var i = 0; i < columns.Count && i < row.Length; i++)
            {
                var column = columns[i];
                var cellValue = row[i] ?? "";
                var cellX = GetAlignedX(x, column.Width, cellValue, Fonts.TableBody, column.Alignment, graphics, cellPadding);
                graphics.DrawString(cellValue, Fonts.TableBody, XBrushes.Black, cellX, y + 13);
                x += column.Width;
            }

            y += rowHeight;
            alternateRow = !alternateRow;
        }

        // Draw bottom border
        graphics.DrawLine(new XPen(XColors.LightGray, 0.5), leftMargin, y, leftMargin + totalWidth, y);

        return y + 10;
    }

    public void DrawText(
        XGraphics graphics,
        string text,
        double x,
        double y,
        XFont? font = null,
        XBrush? brush = null)
    {
        graphics.DrawString(text, font ?? Fonts.Body, brush ?? XBrushes.Black, x, y);
    }

    public void DrawLine(
        XGraphics graphics,
        double y,
        double leftMargin,
        double rightMargin,
        PdfPage page,
        double thickness = 0.5)
    {
        var pen = new XPen(XColors.LightGray, thickness);
        graphics.DrawLine(pen, leftMargin, y, page.Width.Point - rightMargin, y);
    }

    public byte[] SaveToBytes(PdfDocument document)
    {
        using var stream = new MemoryStream();
        document.Save(stream, false);
        return stream.ToArray();
    }

    private double GetAlignedX(
        double cellX,
        double cellWidth,
        string text,
        XFont font,
        PdfTextAlignment alignment,
        XGraphics graphics,
        double padding)
    {
        return alignment switch
        {
            PdfTextAlignment.Right =>
                cellX + cellWidth - graphics.MeasureString(text, font).Width - padding,
            PdfTextAlignment.Center =>
                cellX + (cellWidth - graphics.MeasureString(text, font).Width) / 2,
            _ => cellX + padding
        };
    }
}

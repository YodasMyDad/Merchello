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
        if (columns.Count == 0)
        {
            return startY;
        }

        var y = startY;
        var minRowHeight = 18.0;
        var headerHeight = 22.0;
        var cellPadding = 4.0;
        var lineHeight = Math.Max(11.0, graphics.MeasureString("Ag", Fonts.TableBody).Height);

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
            var wrappedCells = new List<IReadOnlyList<string>>(columns.Count);
            var maxLineCount = 1;

            for (var i = 0; i < columns.Count; i++)
            {
                var cellValue = i < row.Length ? row[i] ?? "" : "";
                var maxCellTextWidth = Math.Max(1.0, columns[i].Width - (cellPadding * 2));
                var wrappedLines = WrapTextToWidth(cellValue, maxCellTextWidth, Fonts.TableBody, graphics);
                wrappedCells.Add(wrappedLines);
                maxLineCount = Math.Max(maxLineCount, wrappedLines.Count);
            }

            var rowHeight = Math.Max(minRowHeight, (maxLineCount * lineHeight) + (cellPadding * 2));

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
            for (var i = 0; i < columns.Count; i++)
            {
                var column = columns[i];
                var wrappedLines = wrappedCells[i];
                var lineY = y + cellPadding + lineHeight - 1;

                foreach (var line in wrappedLines)
                {
                    var cellX = GetAlignedX(x, column.Width, line, Fonts.TableBody, column.Alignment, graphics, cellPadding);
                    graphics.DrawString(line, Fonts.TableBody, XBrushes.Black, cellX, lineY);
                    lineY += lineHeight;
                }

                x += column.Width;
            }

            y += rowHeight;
            alternateRow = !alternateRow;
        }

        // Draw bottom border
        graphics.DrawLine(new XPen(XColors.LightGray, 0.5), leftMargin, y, leftMargin + totalWidth, y);

        return y + 10;
    }

    private static IReadOnlyList<string> WrapTextToWidth(
        string text,
        double maxWidth,
        XFont font,
        XGraphics graphics)
    {
        if (string.IsNullOrEmpty(text))
        {
            return new[] { string.Empty };
        }

        var lines = new List<string>();
        var paragraphs = text
            .Replace("\r\n", "\n")
            .Replace('\r', '\n')
            .Split('\n');

        foreach (var paragraph in paragraphs)
        {
            var remaining = paragraph.Trim();

            if (remaining.Length == 0)
            {
                lines.Add(string.Empty);
                continue;
            }

            while (remaining.Length > 0)
            {
                if (graphics.MeasureString(remaining, font).Width <= maxWidth)
                {
                    lines.Add(remaining);
                    break;
                }

                var breakIndex = FindBreakIndex(remaining, maxWidth, font, graphics);
                if (breakIndex <= 0)
                {
                    breakIndex = 1;
                }

                var line = remaining[..breakIndex].TrimEnd();
                if (line.Length == 0)
                {
                    line = remaining[..Math.Min(1, remaining.Length)];
                }

                lines.Add(line);
                remaining = breakIndex >= remaining.Length
                    ? string.Empty
                    : remaining[breakIndex..].TrimStart();
            }
        }

        return lines.Count == 0 ? new[] { string.Empty } : lines;
    }

    private static int FindBreakIndex(string text, double maxWidth, XFont font, XGraphics graphics)
    {
        var low = 1;
        var high = text.Length;
        var best = 1;

        while (low <= high)
        {
            var mid = low + ((high - low) / 2);
            var candidate = text[..mid];

            if (graphics.MeasureString(candidate, font).Width <= maxWidth)
            {
                best = mid;
                low = mid + 1;
            }
            else
            {
                high = mid - 1;
            }
        }

        for (var i = best; i > 0; i--)
        {
            if (IsPreferredBreakCharacter(text[i - 1]))
            {
                return i;
            }
        }

        return best;
    }

    private static bool IsPreferredBreakCharacter(char value) =>
        value is ' ' or '-' or '_' or '/' or '.';

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

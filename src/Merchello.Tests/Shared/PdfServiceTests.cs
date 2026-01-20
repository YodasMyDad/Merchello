using Merchello.Core.Shared.Services;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shared.Services.Models;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Shared;

public class PdfServiceTests
{
    private readonly IPdfService _pdfService = new PdfService();

    [Fact]
    public void EmbeddedFontResolver_ResolvesRegularFont()
    {
        var resolver = new EmbeddedFontResolver();
        var info = resolver.ResolveTypeface("Liberation Sans", isBold: false, isItalic: false);

        info.ShouldNotBeNull();
        info.FaceName.ShouldBe("LiberationSans-Regular");
    }

    [Fact]
    public void EmbeddedFontResolver_ResolvesBoldFont()
    {
        var resolver = new EmbeddedFontResolver();
        var info = resolver.ResolveTypeface("Liberation Sans", isBold: true, isItalic: false);

        info.ShouldNotBeNull();
        info.FaceName.ShouldBe("LiberationSans-Bold");
    }

    [Fact]
    public void EmbeddedFontResolver_ResolvesItalicFont()
    {
        var resolver = new EmbeddedFontResolver();
        var info = resolver.ResolveTypeface("Liberation Sans", isBold: false, isItalic: true);

        info.ShouldNotBeNull();
        info.FaceName.ShouldBe("LiberationSans-Italic");
    }

    [Fact]
    public void EmbeddedFontResolver_ResolvesBoldItalicFont()
    {
        var resolver = new EmbeddedFontResolver();
        var info = resolver.ResolveTypeface("Liberation Sans", isBold: true, isItalic: true);

        info.ShouldNotBeNull();
        info.FaceName.ShouldBe("LiberationSans-BoldItalic");
    }

    [Fact]
    public void EmbeddedFontResolver_LoadsFontBytes_Regular()
    {
        var resolver = new EmbeddedFontResolver();
        var bytes = resolver.GetFont("LiberationSans-Regular");

        bytes.ShouldNotBeNull();
        bytes.Length.ShouldBeGreaterThan(100000); // TTF file should be > 100KB
    }

    [Fact]
    public void EmbeddedFontResolver_LoadsFontBytes_AllVariants()
    {
        var resolver = new EmbeddedFontResolver();
        var variants = new[] { "LiberationSans-Regular", "LiberationSans-Bold", "LiberationSans-Italic", "LiberationSans-BoldItalic" };

        foreach (var variant in variants)
        {
            var bytes = resolver.GetFont(variant);
            bytes.ShouldNotBeNull($"Font variant {variant} should be loadable");
            bytes.Length.ShouldBeGreaterThan(0);
        }
    }

    [Fact]
    public void EmbeddedFontResolver_CachesFonts()
    {
        var resolver = new EmbeddedFontResolver();

        var bytes1 = resolver.GetFont("LiberationSans-Regular");
        var bytes2 = resolver.GetFont("LiberationSans-Regular");

        // Same reference means cache is working
        ReferenceEquals(bytes1, bytes2).ShouldBeTrue("Font should be cached");
    }

    [Fact]
    public void CreateDocument_ReturnsValidPdfDocument()
    {
        var doc = _pdfService.CreateDocument("Test Document");

        doc.ShouldNotBeNull();
        doc.Info.Title.ShouldBe("Test Document");
        doc.Info.Author.ShouldBe("Merchello");
    }

    [Fact]
    public void AddPage_ReturnsPageAndGraphics()
    {
        var doc = _pdfService.CreateDocument("Test");
        var (page, graphics) = _pdfService.AddPage(doc);

        page.ShouldNotBeNull();
        graphics.ShouldNotBeNull();
        doc.PageCount.ShouldBe(1);
    }

    [Fact]
    public void SaveToBytes_ProducesValidPdf()
    {
        var doc = _pdfService.CreateDocument("Test PDF");
        var (page, graphics) = _pdfService.AddPage(doc);

        _pdfService.DrawHeader(graphics, page, "Invoice", "Acme Corp", "123 Main St\nNew York, NY 10001");
        _pdfService.DrawText(graphics, "This is a test document.", 40, 150);

        var bytes = _pdfService.SaveToBytes(doc);

        bytes.ShouldNotBeNull();
        bytes.Length.ShouldBeGreaterThan(1000);

        // PDF files start with %PDF
        var header = System.Text.Encoding.ASCII.GetString(bytes, 0, 4);
        header.ShouldBe("%PDF");
    }

    [Fact]
    public void DrawTable_WorksWithEmbeddedFonts()
    {
        var doc = _pdfService.CreateDocument("Table Test");
        var (page, graphics) = _pdfService.AddPage(doc);

        var columns = new List<PdfTableColumn>
        {
            new("Date", 80),
            new("Description", 200),
            new("Amount", 80, PdfTextAlignment.Right)
        };

        var rows = new List<string[]>
        {
            new[] { "2024-01-01", "Product A", "$99.99" },
            new[] { "2024-01-02", "Product B", "$149.99" },
            new[] { "2024-01-03", "Product C", "$199.99" }
        };

        var endY = _pdfService.DrawTable(graphics, 100, columns, rows);

        endY.ShouldBeGreaterThan(100);

        var bytes = _pdfService.SaveToBytes(doc);
        bytes.Length.ShouldBeGreaterThan(1000);
    }

    [Fact]
    public void Fonts_AreAvailable()
    {
        var fonts = _pdfService.Fonts;

        fonts.ShouldNotBeNull();
        fonts.Title.ShouldNotBeNull();
        fonts.Subtitle.ShouldNotBeNull();
        fonts.Body.ShouldNotBeNull();
        fonts.BodyBold.ShouldNotBeNull();
        fonts.Small.ShouldNotBeNull();
        fonts.TableHeader.ShouldNotBeNull();
        fonts.TableBody.ShouldNotBeNull();
    }

    [Fact]
    public void Margins_HaveDefaultValues()
    {
        var margins = _pdfService.Margins;

        margins.ShouldNotBeNull();
        margins.Left.ShouldBe(40);
        margins.Right.ShouldBe(40);
        margins.Top.ShouldBe(40);
        margins.Bottom.ShouldBe(40);
    }

    [Fact]
    public void GenerateCompletePdf_CrossPlatformCompatible()
    {
        // This test verifies the complete PDF generation workflow
        // works with embedded fonts - the same code runs on Windows, macOS, Linux, Docker

        var doc = _pdfService.CreateDocument("Cross-Platform Test");
        var (page, graphics) = _pdfService.AddPage(doc);

        // Draw header
        var y = _pdfService.DrawHeader(
            graphics, page,
            "Customer Statement",
            "Merchello Store",
            "123 Commerce Street\nLondon, UK\nEC1A 1BB");

        // Draw some text with different fonts
        _pdfService.DrawText(graphics, "Statement Period: January 2024", 40, y, _pdfService.Fonts.Body);
        y += 20;
        _pdfService.DrawText(graphics, "Customer: John Smith", 40, y, _pdfService.Fonts.BodyBold);
        y += 30;

        // Draw a table
        var columns = new List<PdfTableColumn>
        {
            new("Date", 70),
            new("Reference", 100),
            new("Debit", 70, PdfTextAlignment.Right),
            new("Credit", 70, PdfTextAlignment.Right),
            new("Balance", 70, PdfTextAlignment.Right)
        };

        var rows = new List<string[]>
        {
            new[] { "01/01/24", "INV-001", "$500.00", "", "$500.00" },
            new[] { "05/01/24", "PAY-001", "", "$200.00", "$300.00" },
            new[] { "10/01/24", "INV-002", "$150.00", "", "$450.00" }
        };

        y = _pdfService.DrawTable(graphics, y, columns, rows);

        // Draw footer
        _pdfService.DrawFooter(graphics, page, 1, 1, DateTime.Now);

        // Save and verify
        var bytes = _pdfService.SaveToBytes(doc);

        bytes.ShouldNotBeNull();
        bytes.Length.ShouldBeGreaterThan(5000); // Complete PDF with fonts should be > 5KB

        // Verify PDF header
        var header = System.Text.Encoding.ASCII.GetString(bytes, 0, 8);
        header.ShouldStartWith("%PDF-");
    }
}

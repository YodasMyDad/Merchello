# PDF Generation

Merchello generates PDF documents for customer statements and invoices using PDFsharp, a pure .NET library that works on Windows, macOS, Linux, and Docker without any native dependencies.

## Architecture

PDF generation in Merchello follows a two-layer approach:

1. **`PdfService`** -- A reusable utility service that handles low-level PDF operations (creating documents, adding pages, drawing headers/footers, rendering tables).
2. **Domain services** (like `StatementService`) -- Use `PdfService` to build specific document types with business data.

This separation means you can use `PdfService` to build your own custom PDF documents without duplicating the rendering logic.

## PdfService

The `PdfService` is registered in DI as `IPdfService` and provides these building blocks:

### Creating Documents

```csharp
var document = pdfService.CreateDocument("Customer Statement");
var (page, graphics) = pdfService.AddPage(document);
```

Documents are created as A4 by default. Each `AddPage` call returns both the page and its graphics context for drawing.

### Drawing Headers

```csharp
var y = pdfService.DrawHeader(
    graphics,
    page,
    title: "Customer Statement",
    companyName: "Acme Ltd",
    companyAddress: "123 High Street\nLondon\nEC1A 1BB");
```

The header draws:
- Company name top-right, with optional multi-line address below
- Document title top-left
- A separator line underneath

Returns the Y position below the header so you know where to start drawing content.

### Drawing Tables

```csharp
var columns = new List<PdfTableColumn>
{
    new("Date", 70),
    new("Reference", 90),
    new("Description", 140),
    new("Amount", 80, PdfTextAlignment.Right),
};

var rows = new List<string[]>
{
    ["01/03/2026", "INV-1001", "Widget order", "\u00a325.00"],
    ["05/03/2026", "PMT-2001", "Card payment", "-\u00a325.00"],
};

var nextY = pdfService.DrawTable(graphics, startY, columns, rows);
```

Tables support:
- Column alignment (Left, Center, Right)
- Alternating row backgrounds
- Automatic text wrapping within cells
- Header row with gray background

### Drawing Footers

```csharp
pdfService.DrawFooter(graphics, page, pageNumber: 1, totalPages: 1, generatedDate: DateTime.UtcNow);
```

Footers show the page number centered and the generation date on the right.

### Utility Methods

```csharp
// Draw text at a position
pdfService.DrawText(graphics, "Hello", x: 40, y: 100);

// Draw a horizontal line
pdfService.DrawLine(graphics, y: 200, leftMargin: 40, rightMargin: 40, page);

// Save document to bytes
byte[] bytes = pdfService.SaveToBytes(document);
```

### Fonts

`PdfService` uses Liberation Sans, which is embedded in the assembly. This font is metrically compatible with Arial and works on all platforms, including Docker containers that do not have Windows fonts installed.

Available font styles via `pdfService.Fonts`:

| Property | Size | Style | Use for |
|---|---|---|---|
| `Title` | 18 | Bold | Document titles |
| `Subtitle` | 14 | Bold | Section headings |
| `Body` | 10 | Regular | Body text |
| `BodyBold` | 10 | Bold | Labels and emphasis |
| `Small` | 8 | Regular | Fine print, addresses |
| `TableHeader` | 9 | Bold | Table column headers |
| `TableBody` | 9 | Regular | Table cell content |

### Margins

Default margins are 40 points on all sides, available via `pdfService.Margins`:

```csharp
var leftEdge = pdfService.Margins.Left;   // 40
var rightEdge = pdfService.Margins.Right; // 40
```

## Customer Statements

The `StatementService` generates customer account statements as PDFs. A statement shows:

- Header with company name and address
- Statement period and customer details
- Account summary boxes (opening balance, closing balance, credit limit)
- Customer billing address
- Transaction table with debits, credits, and running balance
- Aging summary (current, 30+, 60+, 90+ days overdue)

### Generating a Statement PDF

```csharp
var parameters = new GenerateStatementParameters
{
    CustomerId = customerId,
    PeriodStart = new DateTime(2026, 1, 1),
    PeriodEnd = new DateTime(2026, 3, 31),
    CompanyName = "Acme Ltd",
    CompanyAddress = "123 High Street\nLondon"
};

byte[] pdfBytes = await statementService.GenerateStatementPdfAsync(parameters, ct);

// Return as a file download
return File(pdfBytes, "application/pdf", "statement-q1-2026.pdf");
```

### Statement Data Without PDF

If you need the statement data (for example, to render it in a custom template), you can get just the data:

```csharp
var statement = await statementService.GetStatementDataAsync(parameters, ct);

// statement.Lines -- transaction rows
// statement.ClosingBalance -- amount owed
// statement.Aging -- aging buckets
```

### What the Statement Includes

The statement transaction table includes:

| Transaction type | Debit column | Credit column |
|---|---|---|
| Invoice | Invoice total | -- |
| Payment | -- | Payment amount |
| Refund | Refund amount | -- |

Each row shows a running balance. The aging summary at the bottom breaks down outstanding amounts by how long they have been overdue.

### Store Settings

The statement PDF automatically pulls your store name and address from Merchello's runtime settings. You can override these with the `CompanyName` and `CompanyAddress` parameters.

## Building Custom PDFs

You can use `PdfService` directly to build your own PDF documents. Here is an example of a custom packing slip:

```csharp
public class PackingSlipService(IPdfService pdfService)
{
    public byte[] GeneratePackingSlip(Order order, string companyName)
    {
        var document = pdfService.CreateDocument("Packing Slip");
        var (page, graphics) = pdfService.AddPage(document);

        var y = pdfService.DrawHeader(graphics, page, "Packing Slip", companyName);

        // Draw order info
        pdfService.DrawText(graphics, $"Order: {order.Id}", pdfService.Margins.Left, y, pdfService.Fonts.BodyBold);
        y += 20;

        // Draw line items table
        var columns = new List<PdfTableColumn>
        {
            new("SKU", 100),
            new("Item", 250),
            new("Qty", 60, PdfTextAlignment.Right),
        };

        var rows = order.LineItems
            .Where(li => li.LineItemType == LineItemType.Product)
            .Select(li => new[] { li.Sku, li.Name, li.Quantity.ToString() })
            .ToList();

        y = pdfService.DrawTable(graphics, y, columns, rows);

        // Footer
        pdfService.DrawFooter(graphics, page, 1, 1, DateTime.UtcNow);

        return pdfService.SaveToBytes(document);
    }
}
```

> **Tip:** If you need to generate PDFs from a custom action, combine `PdfService` with the [Actions System](actions-system.md) using `ActionBehavior.Download`.

## Key Files

| File | Description |
|---|---|
| `Merchello.Core/Shared/Services/PdfService.cs` | Reusable PDF utilities |
| `Merchello.Core/Shared/Services/Interfaces/IPdfService.cs` | PdfService interface |
| `Merchello.Core/Shared/Services/Models/PdfFonts.cs` | Font definitions |
| `Merchello.Core/Shared/Services/Models/PdfMargins.cs` | Margin record |
| `Merchello.Core/Shared/Services/Models/PdfTableColumn.cs` | Table column definition |
| `Merchello.Core/Accounting/Services/StatementService.cs` | Statement generation |

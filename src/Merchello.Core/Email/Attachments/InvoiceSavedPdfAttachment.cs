using Merchello.Core.Email.Interfaces;
using Merchello.Core.Email.Models;
using Merchello.Core.Notifications.Invoice;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shared.Services.Models;
using Microsoft.Extensions.Logging;
using PdfSharp.Pdf;

namespace Merchello.Core.Email.Attachments;

/// <summary>
/// Generates a PDF invoice attachment for InvoiceSavedNotification emails.
/// </summary>
public class InvoiceSavedPdfAttachment(
    IPdfService pdfService,
    ILogger<InvoiceSavedPdfAttachment> logger) : IEmailAttachment<InvoiceSavedNotification>
{
    public string Alias => "invoice-saved-pdf";
    public string DisplayName => "PDF Invoice";
    public string? Description => "Attach a PDF copy of the invoice";
    public string? IconSvg => AttachmentIcons.Pdf;
    public Type NotificationType => typeof(InvoiceSavedNotification);

    public Task<EmailAttachmentResult?> GenerateAsync(
        EmailModel<InvoiceSavedNotification> model,
        CancellationToken ct = default)
    {
        try
        {
            var invoice = model.Notification.Invoice;
            var store = model.Store;

            // Create PDF document
            var document = pdfService.CreateDocument($"Invoice {invoice.InvoiceNumber}");
            var (page, graphics) = pdfService.AddPage(document);

            // Draw header
            var yPosition = pdfService.DrawHeader(
                graphics, page,
                "INVOICE",
                store.Name ?? "Store",
                null);

            yPosition += 20;

            // Invoice details
            pdfService.DrawText(graphics, $"Invoice #: {invoice.InvoiceNumber}", pdfService.Margins.Left, yPosition);
            yPosition += 20;
            pdfService.DrawText(graphics, $"Date: {invoice.DateCreated:MMMM dd, yyyy}", pdfService.Margins.Left, yPosition);
            yPosition += 40;

            // Billing address
            pdfService.DrawText(graphics, "Bill To:", pdfService.Margins.Left, yPosition, pdfService.Fonts.BodyBold);
            yPosition += 18;

            var billing = invoice.BillingAddress;
            if (!string.IsNullOrWhiteSpace(billing.Name))
            {
                pdfService.DrawText(graphics, billing.Name, pdfService.Margins.Left, yPosition);
                yPosition += 16;
            }
            if (!string.IsNullOrWhiteSpace(billing.AddressOne))
            {
                pdfService.DrawText(graphics, billing.AddressOne, pdfService.Margins.Left, yPosition);
                yPosition += 16;
            }
            if (!string.IsNullOrWhiteSpace(billing.AddressTwo))
            {
                pdfService.DrawText(graphics, billing.AddressTwo, pdfService.Margins.Left, yPosition);
                yPosition += 16;
            }

            var cityStateZip = string.Join(", ",
                new[] { billing.TownCity, billing.CountyState?.Name, billing.PostalCode }
                    .Where(s => !string.IsNullOrWhiteSpace(s)));
            if (!string.IsNullOrWhiteSpace(cityStateZip))
            {
                pdfService.DrawText(graphics, cityStateZip, pdfService.Margins.Left, yPosition);
                yPosition += 16;
            }
            if (!string.IsNullOrWhiteSpace(billing.CountryCode))
            {
                pdfService.DrawText(graphics, billing.CountryCode, pdfService.Margins.Left, yPosition);
                yPosition += 16;
            }

            yPosition += 20;

            // Line items table
            var columns = new List<PdfTableColumn>
            {
                new("Item", 200, PdfTextAlignment.Left),
                new("SKU", 80, PdfTextAlignment.Left),
                new("Qty", 50, PdfTextAlignment.Right),
                new("Price", 80, PdfTextAlignment.Right),
                new("Total", 80, PdfTextAlignment.Right)
            };

            var rows = new List<string[]>();

            if (invoice.Orders != null)
            {
                foreach (var order in invoice.Orders)
                {
                    if (order.LineItems == null) continue;

                    foreach (var item in order.LineItems)
                    {
                        rows.Add(
                        [
                            item.Name ?? "Unknown Item",
                            item.Sku ?? "",
                            item.Quantity.ToString(),
                            FormatCurrency(item.Amount, invoice.CurrencySymbol),
                            FormatCurrency(item.Amount * item.Quantity, invoice.CurrencySymbol)
                        ]);
                    }
                }
            }

            yPosition = pdfService.DrawTable(graphics, yPosition, columns, rows, pdfService.Margins.Left);
            yPosition += 20;

            // Totals
            var totalsX = page.Width.Point - pdfService.Margins.Right - 150;

            pdfService.DrawText(graphics, "Subtotal:", totalsX, yPosition);
            pdfService.DrawText(graphics, FormatCurrency(invoice.SubTotal, invoice.CurrencySymbol), totalsX + 80, yPosition);
            yPosition += 18;

            if (invoice.Discount > 0)
            {
                pdfService.DrawText(graphics, "Discount:", totalsX, yPosition);
                pdfService.DrawText(graphics, $"-{FormatCurrency(invoice.Discount, invoice.CurrencySymbol)}", totalsX + 80, yPosition);
                yPosition += 18;
            }

            if (invoice.Tax > 0)
            {
                pdfService.DrawText(graphics, "Tax:", totalsX, yPosition);
                pdfService.DrawText(graphics, FormatCurrency(invoice.Tax, invoice.CurrencySymbol), totalsX + 80, yPosition);
                yPosition += 18;
            }

            pdfService.DrawLine(graphics, yPosition, totalsX, pdfService.Margins.Right, page);
            yPosition += 10;

            pdfService.DrawText(graphics, "Total:", totalsX, yPosition, pdfService.Fonts.BodyBold);
            pdfService.DrawText(graphics, FormatCurrency(invoice.Total, invoice.CurrencySymbol), totalsX + 80, yPosition, pdfService.Fonts.BodyBold);

            // Footer
            pdfService.DrawFooter(graphics, page, 1, 1, DateTime.UtcNow);

            // Save to bytes
            var pdfBytes = pdfService.SaveToBytes(document);

            var result = new EmailAttachmentResult
            {
                Content = pdfBytes,
                FileName = $"Invoice-{invoice.InvoiceNumber}.pdf",
                ContentType = "application/pdf"
            };

            logger.LogDebug(
                "Generated PDF invoice attachment for invoice {InvoiceNumber} ({Size} bytes)",
                invoice.InvoiceNumber, pdfBytes.Length);

            return Task.FromResult<EmailAttachmentResult?>(result);
        }
        catch (OperationCanceledException)
        {
            throw; // Respect cancellation
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to generate PDF invoice attachment for invoice {InvoiceId}",
                model.Notification.Invoice.Id);
            return Task.FromResult<EmailAttachmentResult?>(null);
        }
    }

    private static string FormatCurrency(decimal value, string symbol) =>
        $"{symbol}{value:N2}";
}

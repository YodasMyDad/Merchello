using Merchello.Core.Email.Interfaces;
using Merchello.Core.Email.Models;
using Merchello.Core.Notifications.Order;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shared.Services.Models;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.Email.Attachments;

/// <summary>
/// Generates a PDF invoice attachment for OrderCreatedNotification emails.
/// </summary>
public class OrderInvoicePdfAttachment(
    IPdfService pdfService,
    ILogger<OrderInvoicePdfAttachment> logger) : IEmailAttachment<OrderCreatedNotification>
{
    public string Alias => "order-invoice-pdf";
    public string DisplayName => "PDF Invoice";
    public string? Description => "Attach a PDF copy of the order invoice";
    public string? IconSvg => AttachmentIcons.Pdf;
    public Type NotificationType => typeof(OrderCreatedNotification);

    public Task<EmailAttachmentResult?> GenerateAsync(
        EmailModel<OrderCreatedNotification> model,
        CancellationToken ct = default)
    {
        try
        {
            var order = model.Notification.Order;
            var invoice = order.Invoice;
            var store = model.Store;

            if (invoice == null)
            {
                logger.LogWarning("Order {OrderId} has no associated invoice, skipping PDF attachment", order.Id);
                return Task.FromResult<EmailAttachmentResult?>(null);
            }

            // Create PDF document
            var document = pdfService.CreateDocument($"Order Confirmation - {invoice.InvoiceNumber}");
            var (page, graphics) = pdfService.AddPage(document);

            // Draw header
            var yPosition = pdfService.DrawHeader(
                graphics, page,
                "ORDER CONFIRMATION",
                store.Name ?? "Store",
                null);

            yPosition += 20;

            // Order/Invoice details
            pdfService.DrawText(graphics, $"Order #: {invoice.InvoiceNumber}", pdfService.Margins.Left, yPosition);
            yPosition += 20;
            pdfService.DrawText(graphics, $"Date: {order.DateCreated:MMMM dd, yyyy}", pdfService.Margins.Left, yPosition);
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

            yPosition += 20;

            // Shipping address (if different)
            var shipping = invoice.ShippingAddress;
            if (shipping.AddressOne != billing.AddressOne || shipping.TownCity != billing.TownCity)
            {
                pdfService.DrawText(graphics, "Ship To:", pdfService.Margins.Left + 250, yPosition - 74, pdfService.Fonts.BodyBold);
                var shipY = yPosition - 56;

                if (!string.IsNullOrWhiteSpace(shipping.Name))
                {
                    pdfService.DrawText(graphics, shipping.Name, pdfService.Margins.Left + 250, shipY);
                    shipY += 16;
                }
                if (!string.IsNullOrWhiteSpace(shipping.AddressOne))
                {
                    pdfService.DrawText(graphics, shipping.AddressOne, pdfService.Margins.Left + 250, shipY);
                    shipY += 16;
                }
                if (!string.IsNullOrWhiteSpace(shipping.AddressTwo))
                {
                    pdfService.DrawText(graphics, shipping.AddressTwo, pdfService.Margins.Left + 250, shipY);
                    shipY += 16;
                }

                var shipCityStateZip = string.Join(", ",
                    new[] { shipping.TownCity, shipping.CountyState?.Name, shipping.PostalCode }
                        .Where(s => !string.IsNullOrWhiteSpace(s)));
                if (!string.IsNullOrWhiteSpace(shipCityStateZip))
                {
                    pdfService.DrawText(graphics, shipCityStateZip, pdfService.Margins.Left + 250, shipY);
                }
            }

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

            if (order.LineItems != null)
            {
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

            yPosition = pdfService.DrawTable(graphics, yPosition, columns, rows, pdfService.Margins.Left);
            yPosition += 20;

            // Shipping line
            if (order.ShippingCost > 0)
            {
                var shippingX = page.Width.Point - pdfService.Margins.Right - 150;
                pdfService.DrawText(graphics, "Shipping:", shippingX, yPosition);
                pdfService.DrawText(graphics, FormatCurrency(order.ShippingCost, invoice.CurrencySymbol), shippingX + 80, yPosition);
                yPosition += 18;
            }

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
                FileName = $"Order-{invoice.InvoiceNumber}.pdf",
                ContentType = "application/pdf"
            };

            logger.LogDebug(
                "Generated PDF order attachment for order {OrderId} ({Size} bytes)",
                order.Id, pdfBytes.Length);

            return Task.FromResult<EmailAttachmentResult?>(result);
        }
        catch (OperationCanceledException)
        {
            throw; // Respect cancellation
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to generate PDF order attachment for order {OrderId}",
                model.Notification.Order.Id);
            return Task.FromResult<EmailAttachmentResult?>(null);
        }
    }

    private static string FormatCurrency(decimal value, string symbol) =>
        $"{symbol}{value:N2}";
}

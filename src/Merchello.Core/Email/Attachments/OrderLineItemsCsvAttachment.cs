using Merchello.Core.Email.Interfaces;
using Merchello.Core.Email.Models;
using Merchello.Core.Notifications.Order;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.Email.Attachments;

/// <summary>
/// Generates a CSV line items attachment for OrderCreatedNotification emails.
/// </summary>
public class OrderLineItemsCsvAttachment(
    ILogger<OrderLineItemsCsvAttachment> logger) : IEmailAttachment<OrderCreatedNotification>
{
    public string Alias => "order-line-items-csv";
    public string DisplayName => "Line Items CSV";
    public string? Description => "Attach a CSV spreadsheet of order line items";
    public string? IconSvg => AttachmentIcons.Csv;
    public Type NotificationType => typeof(OrderCreatedNotification);

    public Task<EmailAttachmentResult?> GenerateAsync(
        EmailModel<OrderCreatedNotification> model,
        CancellationToken ct = default)
    {
        try
        {
            var order = model.Notification.Order;
            var invoice = order.Invoice;

            if (order.LineItems == null || order.LineItems.Count == 0)
            {
                logger.LogDebug("Order {OrderId} has no line items, skipping CSV attachment", order.Id);
                return Task.FromResult<EmailAttachmentResult?>(null);
            }

            var currencySymbol = invoice?.CurrencySymbol ?? "$";
            var invoiceNumber = invoice?.InvoiceNumber ?? order.Id.ToString()[..8];

            // Define headers
            var headers = new[]
            {
                "SKU",
                "Name",
                "Quantity",
                "Unit Price",
                "Line Total",
                "Tax Rate (%)",
                "Taxable"
            };

            // Build rows
            var rows = order.LineItems.Select(item => new[]
            {
                item.Sku ?? "",
                item.Name ?? "Unknown Item",
                item.Quantity.ToString(),
                CsvAttachmentHelper.FormatCurrency(item.Amount, currencySymbol),
                CsvAttachmentHelper.FormatCurrency(item.Amount * item.Quantity, currencySymbol),
                CsvAttachmentHelper.FormatNumber(item.TaxRate, 2),
                item.IsTaxable ? "Yes" : "No"
            }).ToList();

            // Add summary row
            rows.Add([]);  // Empty row
            rows.Add(["", "", "", "Order Total:", CsvAttachmentHelper.FormatCurrency(invoice?.Total ?? 0, currencySymbol), "", ""]);

            // Generate CSV
            var csvBytes = CsvAttachmentHelper.GenerateCsv(headers, rows);

            var result = new EmailAttachmentResult
            {
                Content = csvBytes,
                FileName = $"Order-{invoiceNumber}-Items.csv",
                ContentType = "text/csv"
            };

            logger.LogDebug(
                "Generated CSV line items attachment for order {OrderId} ({ItemCount} items, {Size} bytes)",
                order.Id, order.LineItems.Count, csvBytes.Length);

            return Task.FromResult<EmailAttachmentResult?>(result);
        }
        catch (OperationCanceledException)
        {
            throw; // Respect cancellation
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to generate CSV line items attachment for order {OrderId}",
                model.Notification.Order.Id);
            return Task.FromResult<EmailAttachmentResult?>(null);
        }
    }
}

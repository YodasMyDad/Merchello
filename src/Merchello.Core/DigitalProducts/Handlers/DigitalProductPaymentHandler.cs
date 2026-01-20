using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Data;
using Merchello.Core.DigitalProducts.Extensions;
using Merchello.Core.DigitalProducts.Models;
using Merchello.Core.DigitalProducts.Notifications;
using Merchello.Core.DigitalProducts.Services.Interfaces;
using Merchello.Core.DigitalProducts.Services.Parameters;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Notifications.Payment;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Products.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Events;

namespace Merchello.Core.DigitalProducts.Handlers;

/// <summary>
/// Handles payment notifications for digital products.
/// Creates download links and auto-completes digital-only orders.
/// Runs after payment is recorded but before external sync handlers.
/// </summary>
[NotificationHandlerPriority(1500)]
public class DigitalProductPaymentHandler(
    IDigitalProductService digitalProductService,
    IInvoiceService invoiceService,
    IPaymentService paymentService,
    IProductService productService,
    IMerchelloNotificationPublisher notificationPublisher,
    MerchelloDbContext dbContext,
    ILogger<DigitalProductPaymentHandler> logger) : INotificationAsyncHandler<PaymentCreatedNotification>
{
    public async Task HandleAsync(PaymentCreatedNotification notification, CancellationToken ct)
    {
        // Only process successful payments
        if (!notification.Payment.PaymentSuccess)
        {
            return;
        }

        try
        {
            var invoiceId = notification.Payment.InvoiceId;

            // Only process when invoice is fully paid
            var paymentStatus = await paymentService.GetInvoicePaymentStatusAsync(invoiceId, ct);
            if (paymentStatus != InvoicePaymentStatus.Paid)
            {
                return;
            }

            // Create download links for digital products
            var result = await digitalProductService.CreateDownloadLinksAsync(
                new CreateDownloadLinksParameters { InvoiceId = invoiceId },
                ct);

            if (!result.Successful)
            {
                logger.LogWarning(
                    "Failed to create download links for invoice {InvoiceId}: {Message}",
                    invoiceId,
                    result.Messages.FirstOrDefault()?.Message);
                return;
            }

            var downloadLinks = result.ResultObject ?? [];
            if (downloadLinks.Count == 0)
            {
                // No digital products in this invoice
                return;
            }

            logger.LogInformation(
                "Created {Count} download links for invoice {InvoiceId}",
                downloadLinks.Count, invoiceId);

            // Get the invoice for the notification
            var invoice = await invoiceService.GetInvoiceAsync(invoiceId, ct);
            if (invoice == null)
            {
                logger.LogWarning("Invoice {InvoiceId} not found after creating download links", invoiceId);
                return;
            }

            // Check if this is a digital-only invoice
            var isDigitalOnly = await digitalProductService.IsDigitalOnlyInvoiceAsync(invoiceId, ct);

            if (isDigitalOnly)
            {
                // Auto-complete all orders for digital-only invoices
                await AutoCompleteOrdersAsync(invoice, ct);
            }

            // Check delivery method to determine if we should publish notification
            var shouldSendEmail = await ShouldSendDeliveryNotificationAsync(invoice, ct);

            if (shouldSendEmail)
            {
                // Publish notification for email/webhook handlers
                await notificationPublisher.PublishAsync(
                    new DigitalProductDeliveredNotification(invoice, downloadLinks),
                    ct);
            }
        }
        catch (Exception ex)
        {
            // Don't let digital product handling break the payment flow
            logger.LogError(ex,
                "Error handling digital products for payment {PaymentId}",
                notification.Payment.Id);
        }
    }

    /// <summary>
    /// Auto-completes all orders on the invoice for digital-only purchases.
    /// </summary>
    private async Task AutoCompleteOrdersAsync(Invoice invoice, CancellationToken ct)
    {
        var orders = await dbContext.Orders
            .Where(o => o.InvoiceId == invoice.Id)
            .ToListAsync(ct);

        foreach (var order in orders)
        {
            if (order.Status != OrderStatus.Completed && order.Status != OrderStatus.Cancelled)
            {
                order.Status = OrderStatus.Completed;
                order.CompletedDate = DateTime.UtcNow;
                order.DateUpdated = DateTime.UtcNow;
            }
        }

        if (orders.Count > 0)
        {
            await dbContext.SaveChangesAsync(ct);
            logger.LogInformation(
                "Auto-completed {Count} order(s) for digital-only invoice {InvoiceId}",
                orders.Count, invoice.Id);
        }
    }

    /// <summary>
    /// Determines if we should send a delivery notification email.
    /// EmailDelivered products always get email; InstantDownload products also get email as backup.
    /// </summary>
    private async Task<bool> ShouldSendDeliveryNotificationAsync(Invoice invoice, CancellationToken ct)
    {
        // Check if any digital product has files
        var lineItems = invoice.Orders?.SelectMany(o => o.LineItems ?? []) ?? [];
        var productIds = lineItems
            .Where(li => li.ProductId.HasValue)
            .Select(li => li.ProductId!.Value)
            .Distinct()
            .ToList();

        if (productIds.Count == 0)
            return false;

        // Batch load all products to avoid N+1 queries
        var products = await Task.WhenAll(
            productIds.Select(id => productService.GetProductRoot(id, cancellationToken: ct)));

        return products.Any(p => p != null && p.IsDigitalProduct && p.HasDigitalFiles());
    }
}

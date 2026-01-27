using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Merchello.Core.Notifications.Order;
using Merchello.Core.Notifications.Payment;
using Merchello.Core.Notifications.Shipment;
using Merchello.Core.Shared.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Notifications.Handlers;

/// <summary>
/// Internal handler that automatically adds timeline entries to invoices when changes occur.
/// This demonstrates dogfooding the notification system for internal Merchello functionality.
/// </summary>
[NotificationHandlerPriority(2000)] // Run late: internal timeline logging, before email/webhook dispatch
public class InvoiceTimelineHandler(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    ICurrencyService currencyService,
    ILogger<InvoiceTimelineHandler> logger)
    : INotificationAsyncHandler<OrderStatusChangedNotification>,
      INotificationAsyncHandler<ShipmentCreatedNotification>,
      INotificationAsyncHandler<PaymentCreatedNotification>,
      INotificationAsyncHandler<PaymentRefundedNotification>
{
    public async Task HandleAsync(OrderStatusChangedNotification notification, CancellationToken cancellationToken)
    {
        var order = notification.Order;
        var description = $"Order status changed from {notification.OldStatus} to {notification.NewStatus}";

        if (!string.IsNullOrWhiteSpace(notification.Reason))
        {
            description += $": {notification.Reason}";
        }

        await AddTimelineEntryAsync(order.InvoiceId, description, cancellationToken);
    }

    public async Task HandleAsync(ShipmentCreatedNotification notification, CancellationToken cancellationToken)
    {
        var shipment = notification.Shipment;
        var itemCount = shipment.LineItems?
            .Where(li => li.LineItemType != LineItemType.Discount)
            .Sum(li => li.Quantity) ?? 0;

        var description = $"Shipment created with {itemCount} item(s)";

        if (!string.IsNullOrWhiteSpace(shipment.Carrier))
        {
            description += $" via {shipment.Carrier}";
        }

        if (!string.IsNullOrWhiteSpace(shipment.TrackingNumber))
        {
            description += $" (Tracking: {shipment.TrackingNumber})";
        }

        // Get the invoice ID from the order
        using var scope = efCoreScopeProvider.CreateScope();
        var invoiceId = await scope.ExecuteWithContextAsync(async db =>
        {
            var order = await db.Orders
                .AsNoTracking()
                .Where(o => o.Id == shipment.OrderId)
                .Select(o => o.InvoiceId)
                .FirstOrDefaultAsync(cancellationToken);
            return order;
        });
        scope.Complete();

        if (invoiceId != Guid.Empty)
        {
            await AddTimelineEntryAsync(invoiceId, description, cancellationToken);
        }
    }

    public async Task HandleAsync(PaymentCreatedNotification notification, CancellationToken cancellationToken)
    {
        var payment = notification.Payment;
        var formattedAmount = currencyService.FormatAmount(payment.Amount, payment.CurrencyCode);

        var description = payment.PaymentSuccess
            ? $"Payment of {formattedAmount} received"
            : $"Payment of {formattedAmount} failed";

        if (!string.IsNullOrWhiteSpace(payment.PaymentProviderAlias))
        {
            description += $" via {payment.PaymentProviderAlias}";
        }

        await AddTimelineEntryAsync(payment.InvoiceId, description, cancellationToken);
    }

    public async Task HandleAsync(PaymentRefundedNotification notification, CancellationToken cancellationToken)
    {
        var refund = notification.RefundPayment;
        var formattedAmount = currencyService.FormatAmount(notification.RefundAmount, refund.CurrencyCode);
        var description = $"Refund of {formattedAmount} processed";

        if (!string.IsNullOrWhiteSpace(notification.RefundReason))
        {
            description += $": {notification.RefundReason}";
        }

        await AddTimelineEntryAsync(refund.InvoiceId, description, cancellationToken);
    }

    private async Task AddTimelineEntryAsync(Guid invoiceId, string description, CancellationToken cancellationToken)
    {
        try
        {
            using var scope = efCoreScopeProvider.CreateScope();
            await scope.ExecuteWithContextAsync<bool>(async db =>
            {
                var invoice = await db.Invoices.FirstOrDefaultAsync(i => i.Id == invoiceId, cancellationToken);
                if (invoice == null)
                {
                    logger.LogWarning("Could not add timeline entry - Invoice {InvoiceId} not found", invoiceId);
                    return false;
                }

                invoice.Notes ??= [];
                invoice.Notes.Add(new InvoiceNote
                {
                    DateCreated = DateTime.UtcNow,
                    Author = "System",
                    Description = description,
                    VisibleToCustomer = false
                });

                invoice.DateUpdated = DateTime.UtcNow;
                await db.SaveChangesAsync(cancellationToken);
                return true;
            });
            scope.Complete();

            logger.LogDebug("Added timeline entry for Invoice {InvoiceId}: {Description}", invoiceId, description);
        }
        catch (Exception ex)
        {
            // Don't let timeline failures break the main operation
            logger.LogWarning(ex, "Failed to add timeline entry for Invoice {InvoiceId}: {Description}", invoiceId, description);
        }
    }
}

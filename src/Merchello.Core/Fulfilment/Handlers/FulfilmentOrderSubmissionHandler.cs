using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Fulfilment;
using Merchello.Core.Fulfilment.Services.Parameters;
using Merchello.Core.Fulfilment.Services.Interfaces;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Notifications.Payment;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Events;

namespace Merchello.Core.Fulfilment.Handlers;

/// <summary>
/// Handles payment created notifications to automatically submit fully paid invoice orders
/// to fulfilment providers. Runs after business logic handlers but before external sync handlers.
/// </summary>
[NotificationHandlerPriority(1800)]
public class FulfilmentOrderSubmissionHandler(
    IInvoiceService invoiceService,
    IPaymentService paymentService,
    IFulfilmentSubmissionService fulfilmentSubmissionService,
    ILogger<FulfilmentOrderSubmissionHandler> logger) : INotificationAsyncHandler<PaymentCreatedNotification>
{
    public async Task HandleAsync(PaymentCreatedNotification notification, CancellationToken ct)
    {
        var payment = notification.Payment;

        if (!payment.PaymentSuccess || payment.PaymentType != PaymentType.Payment)
        {
            return;
        }

        var paymentStatus = await paymentService.GetInvoicePaymentStatusAsync(payment.InvoiceId, ct);
        if (paymentStatus != InvoicePaymentStatus.Paid)
        {
            logger.LogDebug(
                "Skipping fulfilment auto-submission for invoice {InvoiceId}. Current payment status: {Status}.",
                payment.InvoiceId,
                paymentStatus);
            return;
        }

        var invoice = await invoiceService.GetInvoiceAsync(payment.InvoiceId, ct);
        if (invoice?.Orders == null || invoice.Orders.Count == 0)
        {
            logger.LogDebug(
                "Skipping fulfilment auto-submission for invoice {InvoiceId}. No orders found.",
                payment.InvoiceId);
            return;
        }

        foreach (var order in invoice.Orders)
        {
            await SubmitOrderAsync(order, ct);
        }
    }

    private async Task SubmitOrderAsync(Order order, CancellationToken ct)
    {
        try
        {
            var result = await fulfilmentSubmissionService.SubmitOrderAsync(
                new SubmitFulfilmentOrderParameters
                {
                    OrderId = order.Id,
                    Source = FulfilmentSubmissionSource.PaymentCreated,
                    RequirePaidInvoice = false
                },
                ct);

            if (!result.Success)
            {
                logger.LogWarning(
                    "Fulfilment submission failed for order {OrderId}: {Error}",
                    order.Id,
                    result.Messages.FirstOrDefault()?.Message ?? "Unknown error");
            }
        }
        catch (Exception ex)
        {
            // Don't let fulfilment failures break payment processing
            logger.LogError(ex, "Error during automatic fulfilment submission for order {OrderId}. Payment succeeded but fulfilment may need manual intervention.",
                order.Id);
        }
    }
}

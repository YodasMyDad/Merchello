using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Fulfilment.Notifications;
using Merchello.Core.Fulfilment.Services.Interfaces;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Notifications.Payment;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
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
    IFulfilmentService fulfilmentService,
    IMerchelloNotificationPublisher notificationPublisher,
    IOptions<FulfilmentSettings> settings,
    ILogger<FulfilmentOrderSubmissionHandler> logger) : INotificationAsyncHandler<PaymentCreatedNotification>
{
    private readonly FulfilmentSettings _settings = settings.Value;

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
            await SubmitOrderIfEligibleAsync(order, ct);
        }
    }

    private async Task SubmitOrderIfEligibleAsync(Order order, CancellationToken ct)
    {
        try
        {
            // Guard: Already submitted
            if (!string.IsNullOrEmpty(order.FulfilmentProviderReference))
            {
                logger.LogDebug("Order {OrderId} already has a fulfilment reference. Skipping auto-submission.", order.Id);
                return;
            }

            // Guard: Order not ready for fulfilment
            if (order.Status == OrderStatus.Cancelled || order.Status == OrderStatus.OnHold)
            {
                logger.LogDebug("Order {OrderId} is {Status}. Skipping fulfilment submission.", order.Id, order.Status);
                return;
            }

            // Resolve provider for the order's warehouse
            var providerConfig = await fulfilmentService.ResolveProviderForWarehouseAsync(order.WarehouseId, ct);

            // If no provider configured, this is manual fulfilment
            if (providerConfig == null)
            {
                logger.LogDebug("No fulfilment provider configured for order {OrderId}. Manual fulfilment assumed.", order.Id);
                return;
            }

            // Publish "submitting" notification (allows cancellation or modification)
            var submittingNotification = new FulfilmentSubmittingNotification(order, providerConfig);
            await notificationPublisher.PublishAsync(submittingNotification, ct);

            if (submittingNotification.Cancel)
            {
                logger.LogInformation("Fulfilment submission cancelled for order {OrderId}: {Reason}",
                    order.Id, submittingNotification.CancelReason ?? "No reason provided");
                return;
            }

            // Submit to fulfilment provider
            var result = await fulfilmentService.SubmitOrderAsync(order.Id, ct);

            if (result.Success && !string.IsNullOrEmpty(result.ResultObject?.FulfilmentProviderReference))
            {
                // Publish "submitted" notification
                await notificationPublisher.PublishAsync(
                    new FulfilmentSubmittedNotification(result.ResultObject, providerConfig),
                    ct);

                logger.LogInformation("Order {OrderId} auto-submitted to fulfilment provider. Reference: {Reference}",
                    order.Id, result.ResultObject.FulfilmentProviderReference);
            }
            else if (result.ResultObject?.Status == OrderStatus.FulfilmentFailed)
            {
                // Publish "failed" notification after max retries
                await notificationPublisher.PublishAsync(
                    new FulfilmentSubmissionFailedNotification(result.ResultObject, providerConfig,
                        result.Messages.FirstOrDefault()?.Message ?? "Unknown error"),
                    ct);

                logger.LogError("Order {OrderId} fulfilment submission failed after max retries.",
                    order.Id);
            }
            else if (result.ResultObject != null)
            {
                // Publish non-terminal attempt failure for timeline/audit visibility.
                await notificationPublisher.PublishAsync(
                    new FulfilmentSubmissionAttemptFailedNotification(
                        result.ResultObject,
                        providerConfig,
                        result.Messages.FirstOrDefault()?.Message
                            ?? result.ResultObject.FulfilmentErrorMessage
                            ?? "Unknown error",
                        result.ResultObject.FulfilmentRetryCount,
                        _settings.MaxRetryAttempts),
                    ct);

                logger.LogWarning(
                    "Order {OrderId} fulfilment submission attempt {Attempt}/{MaxAttempts} failed. Retry scheduled.",
                    order.Id,
                    result.ResultObject.FulfilmentRetryCount,
                    _settings.MaxRetryAttempts);
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

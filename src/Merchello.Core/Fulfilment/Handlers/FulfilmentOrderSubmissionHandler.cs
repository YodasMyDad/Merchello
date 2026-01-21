using Merchello.Core.Accounting.Models;
using Merchello.Core.Fulfilment.Notifications;
using Merchello.Core.Fulfilment.Services.Interfaces;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Notifications.Order;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Events;

namespace Merchello.Core.Fulfilment.Handlers;

/// <summary>
/// Handles order created notifications to automatically submit orders to fulfilment providers.
/// Runs after business logic handlers but before external sync handlers (email, webhooks).
/// </summary>
[NotificationHandlerPriority(1800)]
public class FulfilmentOrderSubmissionHandler(
    IFulfilmentService fulfilmentService,
    IMerchelloNotificationPublisher notificationPublisher,
    IOptions<FulfilmentSettings> settings,
    ILogger<FulfilmentOrderSubmissionHandler> logger) : INotificationAsyncHandler<OrderCreatedNotification>
{
    private readonly FulfilmentSettings _settings = settings.Value;

    public async Task HandleAsync(OrderCreatedNotification notification, CancellationToken ct)
    {
        if (!_settings.Enabled)
        {
            return;
        }

        var order = notification.Order;

        try
        {
            // Guard: Already submitted (shouldn't happen on OrderCreated, but be safe)
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

            if (result.Successful && !string.IsNullOrEmpty(result.ResultObject?.FulfilmentProviderReference))
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
            // Note: If it failed but can retry, the FulfilmentRetryJob will handle it
        }
        catch (Exception ex)
        {
            // Don't let fulfilment failures break order creation
            logger.LogError(ex, "Error during automatic fulfilment submission for order {OrderId}. Order created successfully but fulfilment may need manual intervention.",
                order.Id);
        }
    }
}

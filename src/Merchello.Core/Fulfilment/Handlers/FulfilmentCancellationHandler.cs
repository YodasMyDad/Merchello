using Merchello.Core.Accounting.Models;
using Merchello.Core.Fulfilment.Services.Interfaces;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.Order;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Core.Events;

namespace Merchello.Core.Fulfilment.Handlers;

/// <summary>
/// Handles order status changed notifications to cancel orders at fulfilment providers when orders are cancelled.
/// </summary>
[NotificationHandlerPriority(1800)]
public class FulfilmentCancellationHandler(
    IFulfilmentService fulfilmentService,
    IOptions<FulfilmentSettings> settings,
    ILogger<FulfilmentCancellationHandler> logger) : INotificationAsyncHandler<OrderStatusChangedNotification>
{
    private readonly FulfilmentSettings _settings = settings.Value;

    public async Task HandleAsync(OrderStatusChangedNotification notification, CancellationToken ct)
    {
        if (!_settings.Enabled)
        {
            return;
        }

        // Only handle transitions to Cancelled status
        if (notification.NewStatus != OrderStatus.Cancelled)
        {
            return;
        }

        var order = notification.Order;

        // Only cancel at 3PL if the order was previously being processed
        // (i.e., it was submitted to the provider)
        if (notification.OldStatus != OrderStatus.Processing &&
            notification.OldStatus != OrderStatus.PartiallyShipped)
        {
            return;
        }

        // Check if order has a provider reference (was submitted to 3PL)
        if (string.IsNullOrEmpty(order.FulfilmentProviderReference))
        {
            return;
        }

        try
        {
            logger.LogInformation("Attempting to cancel order {OrderId} at fulfilment provider. Reference: {Reference}",
                order.Id, order.FulfilmentProviderReference);

            var result = await fulfilmentService.CancelOrderAsync(order.Id, ct);

            if (result.Success)
            {
                logger.LogInformation("Order {OrderId} cancellation at 3PL completed.", order.Id);
            }
            else
            {
                // Log warnings but don't fail - the order is already cancelled in Merchello
                foreach (var message in result.Messages)
                {
                    logger.LogWarning("Fulfilment cancellation for order {OrderId}: {Message}",
                        order.Id, message.Message);
                }
            }
        }
        catch (Exception ex)
        {
            // Don't let 3PL cancellation failures break order cancellation
            logger.LogError(ex, "Error cancelling order {OrderId} at fulfilment provider. Order is cancelled in Merchello but may still be active at 3PL.",
                order.Id);
        }
    }
}

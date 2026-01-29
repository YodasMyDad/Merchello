using Merchello.Core.Notifications;
using Merchello.Core.Notifications.Order;
using Merchello.Core.Upsells.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Events;

namespace Merchello.Core.Upsells.Services;

/// <summary>
/// Notification handler that enriches order notifications with upsell suggestions
/// for email templates. Runs at priority 2050 (before EmailNotificationHandler at 2100).
/// </summary>
[NotificationHandlerPriority(2050)]
public class UpsellEmailEnrichmentHandler(
    IUpsellEngine upsellEngine,
    ILogger<UpsellEmailEnrichmentHandler> logger)
    : INotificationAsyncHandler<OrderCreatedNotification>
{
    public async Task HandleAsync(OrderCreatedNotification notification, CancellationToken ct)
    {
        try
        {
            var suggestions = await upsellEngine.GetSuggestionsForInvoiceAsync(
                notification.Order.InvoiceId, ct);

            if (suggestions.Count > 0)
            {
                notification.State["UpsellSuggestions"] = suggestions;
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to generate upsell suggestions for email");
            // Non-critical: email sends without upsells
        }
    }
}

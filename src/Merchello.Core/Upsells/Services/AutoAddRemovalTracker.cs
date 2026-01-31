using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.BasketNotifications;
using Merchello.Core.Upsells.Models;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Events;

namespace Merchello.Core.Upsells.Services;

/// <summary>
/// Tracks when a customer removes an auto-added upsell product from their basket.
/// Records the removal in the checkout session so the AutoAddUpsellHandler
/// won't re-add it on subsequent basket changes.
/// </summary>
[NotificationHandlerPriority(2300)]
public class AutoAddRemovalTracker(
    ICheckoutSessionService checkoutSessionService,
    ILogger<AutoAddRemovalTracker> logger)
    : INotificationAsyncHandler<BasketItemRemovedNotification>
{
    public async Task HandleAsync(BasketItemRemovedNotification notification, CancellationToken ct)
    {
        try
        {
            var lineItem = notification.Item;

            // Only track removals of auto-added items
            if (!lineItem.ExtendedData.TryGetValue(
                    Constants.ExtendedDataKeys.AutoAddedByUpsellRule, out var ruleIdObj))
                return;

            if (!Guid.TryParse(ruleIdObj?.ToString(), out var ruleId))
                return;

            if (!lineItem.ProductId.HasValue)
                return;

            await checkoutSessionService.TrackRemovedAutoAddAsync(
                notification.Basket.Id,
                new RemovedAutoAddRecord
                {
                    UpsellRuleId = ruleId,
                    ProductId = lineItem.ProductId.Value
                },
                ct);
        }
        catch (Exception ex)
        {
            // Removal tracking must never break the remove-from-basket flow
            logger.LogWarning(ex, "Failed to track auto-add upsell removal");
        }
    }
}

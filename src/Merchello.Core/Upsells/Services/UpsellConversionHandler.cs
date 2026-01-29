using System.Text.Json;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.Order;
using Merchello.Core.Upsells.Models;
using Merchello.Core.Upsells.Services.Interfaces;
using Merchello.Core.Upsells.Services.Parameters;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Events;

namespace Merchello.Core.Upsells.Services;

/// <summary>
/// Notification handler that records upsell conversions when an order is created.
/// Checks basket ExtendedData for previously shown upsell impressions and compares
/// against purchased line items.
/// </summary>
[NotificationHandlerPriority(2200)]
public class UpsellConversionHandler(
    IUpsellAnalyticsService analyticsService,
    ILogger<UpsellConversionHandler> logger)
    : INotificationAsyncHandler<OrderCreatedNotification>
{
    public async Task HandleAsync(OrderCreatedNotification notification, CancellationToken ct)
    {
        try
        {
            var order = notification.Order;

            // Get the basket's extended data for previously-shown upsell impressions
            var extendedData = order.Invoice?.ExtendedData;
            if (extendedData == null || !extendedData.TryGetValue(Constants.ExtendedDataKeys.UpsellImpressions, out var impressionsJson))
                return;

            if (string.IsNullOrWhiteSpace(impressionsJson?.ToString()))
                return;

            var impressions = JsonSerializer.Deserialize<List<UpsellImpressionRecord>>(
                impressionsJson.ToString()!,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (impressions == null || impressions.Count == 0)
                return;

            // Get all purchased product IDs from the order
            var purchasedProductIds = order.LineItems?
                .Where(li => li.ProductId.HasValue)
                .Select(li => li.ProductId!.Value)
                .ToHashSet() ?? [];

            if (purchasedProductIds.Count == 0)
                return;

            // Check each upsell impression for conversions
            foreach (var impression in impressions)
            {
                var convertedProductIds = impression.ProductIds
                    .Where(pid => purchasedProductIds.Contains(pid))
                    .ToList();

                foreach (var productId in convertedProductIds)
                {
                    // Get the line item amount as revenue
                    var lineItem = order.LineItems?.FirstOrDefault(li => li.ProductId == productId);
                    var revenue = lineItem?.Amount ?? 0;

                    await analyticsService.RecordConversionAsync(new RecordUpsellConversionParameters
                    {
                        UpsellRuleId = impression.UpsellRuleId,
                        DisplayLocation = impression.DisplayLocation,
                        ProductId = productId,
                        Amount = revenue,
                        InvoiceId = order.InvoiceId,
                        CustomerId = order.Invoice?.CustomerId,
                    }, ct);
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to process upsell conversions for order");
        }
    }

}

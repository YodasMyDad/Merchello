using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Merchello.Core.Fulfilment.Notifications;
using Merchello.Core.Fulfilment.Providers.Interfaces;
using Merchello.Core.Notifications;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Shipping.Services.Parameters;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Core.Events;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Fulfilment.Handlers;

/// <summary>
/// Creates a preparing shipment when a fulfilment provider that creates shipments on submission
/// successfully submits an order. Runs after fulfilment submission but before timeline logging.
/// </summary>
[NotificationHandlerPriority(1900)]
public class FulfilmentAutoShipmentHandler(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IShipmentService shipmentService,
    IFulfilmentProviderManager providerManager,
    ILogger<FulfilmentAutoShipmentHandler> logger)
    : INotificationAsyncHandler<FulfilmentSubmittedNotification>
{
    public async Task HandleAsync(FulfilmentSubmittedNotification notification, CancellationToken ct)
    {
        var order = notification.Order;
        var providerConfig = notification.ProviderConfiguration;

        try
        {
            // Get provider metadata to check CreatesShipmentOnSubmission
            var registeredProvider = await providerManager.GetConfiguredProviderAsync(providerConfig.Id, ct);
            if (registeredProvider == null)
            {
                logger.LogWarning(
                    "Could not resolve provider for config {ConfigId}. Skipping auto-shipment for order {OrderId}.",
                    providerConfig.Id, order.Id);
                return;
            }

            // Only create shipment if provider metadata indicates it creates shipments on submission
            if (!registeredProvider.Metadata.CreatesShipmentOnSubmission)
            {
                logger.LogDebug(
                    "Provider {ProviderKey} does not create shipments on submission. Skipping auto-shipment for order {OrderId}.",
                    registeredProvider.Metadata.Key, order.Id);
                return;
            }

            // Idempotency check: does a shipment already exist for this order?
            using var checkScope = efCoreScopeProvider.CreateScope();
            var existingShipments = await checkScope.ExecuteWithContextAsync(async db =>
                await db.Shipments
                    .AsNoTracking()
                    .AnyAsync(s => s.OrderId == order.Id, ct));
            checkScope.Complete();

            if (existingShipments)
            {
                logger.LogDebug(
                    "Order {OrderId} already has shipments. Skipping auto-shipment creation.",
                    order.Id);
                return;
            }

            // Load order with line items
            using var loadScope = efCoreScopeProvider.CreateScope();
            var orderWithItems = await loadScope.ExecuteWithContextAsync(async db =>
                await db.Orders
                    .Include(o => o.LineItems)
                    .FirstOrDefaultAsync(o => o.Id == order.Id, ct));
            loadScope.Complete();

            if (orderWithItems?.LineItems == null || orderWithItems.LineItems.Count == 0)
            {
                logger.LogWarning(
                    "Order {OrderId} has no line items. Cannot create auto-shipment.",
                    order.Id);
                return;
            }

            // Build line items to ship (all product line items)
            var lineItemsToShip = orderWithItems.LineItems
                .Where(li => li.LineItemType == LineItemType.Product)
                .ToDictionary(li => li.Id, li => li.Quantity);

            if (lineItemsToShip.Count == 0)
            {
                logger.LogWarning(
                    "Order {OrderId} has no product line items. Cannot create auto-shipment.",
                    order.Id);
                return;
            }

            var parameters = new CreateShipmentParameters
            {
                OrderId = order.Id,
                LineItems = lineItemsToShip
                // No tracking info yet - shipment is Preparing
            };

            // Use CreateShipmentAsync which publishes ShipmentCreatedNotification
            var result = await shipmentService.CreateShipmentAsync(parameters, ct);

            if (result.Success && result.ResultObject != null)
            {
                logger.LogInformation(
                    "Auto-created preparing shipment {ShipmentId} for order {OrderId} via {ProviderKey}",
                    result.ResultObject.Id, order.Id, registeredProvider.Metadata.Key);
            }
            else
            {
                logger.LogWarning(
                    "Failed to auto-create shipment for order {OrderId}: {Error}",
                    order.Id, result.Messages.FirstOrDefault()?.Message ?? "Unknown error");
            }
        }
        catch (Exception ex)
        {
            // Don't let auto-shipment failures break the fulfilment flow
            logger.LogError(ex, "Error creating auto-shipment for order {OrderId}", order.Id);
        }
    }
}

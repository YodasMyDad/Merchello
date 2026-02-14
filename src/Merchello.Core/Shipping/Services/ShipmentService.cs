using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Accounting.Handlers.Interfaces;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Data;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.Aggregate;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Notifications.Shipment;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shipping.Dtos;
using Merchello.Core.Shipping.Extensions;
using Merchello.Core.Shipping.Factories;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Shipping.Services.Parameters;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Shipping.Services;

/// <summary>
/// Service for managing shipments and fulfillment operations.
/// </summary>
public class ShipmentService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IInventoryService inventoryService,
    IOrderStatusHandler statusHandler,
    IProductService productService,
    IMerchelloNotificationPublisher notificationPublisher,
    ShipmentFactory shipmentFactory,
    LineItemFactory lineItemFactory,
    ILogger<ShipmentService> logger) : IShipmentService
{
    /// <inheritdoc />
    public async Task<List<Shipment>> CreateShipmentsFromOrderAsync(
        CreateShipmentsParameters parameters,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var shipments = await scope.ExecuteWithContextAsync(async db =>
        {
            // Load the order with its line items and shipments
            var order = await db.Orders
                .Include(o => o.LineItems)
                .Include(o => o.Shipments)
                .AsSplitQuery()
                .FirstOrDefaultAsync(o => o.Id == parameters.OrderId, cancellationToken);

            if (order == null)
            {
                throw new InvalidOperationException($"Order {parameters.OrderId} not found");
            }

            // Validate order can be shipped
            if (order.Status == OrderStatus.Cancelled)
            {
                throw new InvalidOperationException("Cannot create shipment for cancelled order");
            }

            if (order.Status == OrderStatus.Shipped || order.Status == OrderStatus.Completed)
            {
                throw new InvalidOperationException("Order has already been fully shipped");
            }

            // Load products separately for line items
            var productIds = order.LineItems?
                .Where(li => li.ProductId.HasValue)
                .Select(li => li.ProductId!.Value)
                .Distinct()
                .ToList() ?? [];

            var products = await db.Products
                .Include(p => p.ShippingOptions)
                .Where(p => productIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id, cancellationToken);

            var lineItemsToShip = order.LineItems?.ToList() ?? [];

            // Filter by specific line items if requested
            if (parameters.LineItemsToShip?.Any() == true)
            {
                lineItemsToShip = lineItemsToShip
                    .Where(li => parameters.LineItemsToShip.ContainsKey(li.Id))
                    .ToList();
            }

            // Group by warehouse
            Dictionary<Guid, List<LineItem>> warehouseGroups = [];

            foreach (var lineItem in lineItemsToShip.Where(li => li.ProductId.HasValue))
            {
                if (!products.TryGetValue(lineItem.ProductId!.Value, out var product))
                {
                    logger.LogWarning("Product {ProductId} not found for line item {LineItemId}",
                        lineItem.ProductId, lineItem.Id);
                    continue;
                }

                if (product.ShippingOptions == null || !product.ShippingOptions.Any())
                {
                    logger.LogWarning("No shipping options found for product {ProductId} in line item {LineItemId}",
                        lineItem.ProductId, lineItem.Id);
                    continue;
                }

                // Determine warehouse - use first shipping option's warehouse
                var warehouseId = product.ShippingOptions.First().WarehouseId;

                // If specific warehouse requested, filter
                if (parameters.WarehouseId.HasValue && warehouseId != parameters.WarehouseId.Value)
                {
                    continue;
                }

                if (!warehouseGroups.ContainsKey(warehouseId))
                {
                    warehouseGroups[warehouseId] = [];
                }

                // Adjust quantity if partial shipment
                var quantityToShip = lineItem.Quantity;
                if (parameters.LineItemsToShip?.ContainsKey(lineItem.Id) == true)
                {
                    quantityToShip = Math.Min(parameters.LineItemsToShip[lineItem.Id], lineItem.Quantity);
                }

                var shipmentLineItem = lineItemFactory.CreateForShipment(lineItem, quantityToShip);

                warehouseGroups[warehouseId].Add(shipmentLineItem);
            }

            // Create shipments and allocate stock
            List<Shipment> newShipments = [];

            foreach (var (warehouseId, lineItems) in warehouseGroups)
            {
                var shipment = shipmentFactory.Create(
                    order,
                    warehouseId,
                    parameters.ShippingAddress,
                    lineItems,
                    parameters.TrackingNumber,
                    parameters.TrackingUrl,
                    parameters.Carrier);

                db.Shipments.Add(shipment);
                newShipments.Add(shipment);

                // Allocate stock for shipped items
                foreach (var lineItem in lineItems.Where(li => li.ProductId.HasValue))
                {
                    var allocationResult = await inventoryService.AllocateStockAsync(
                        lineItem.ProductId!.Value,
                        warehouseId,
                        lineItem.Quantity,
                        cancellationToken);

                    if (!allocationResult.ResultObject)
                    {
                        logger.LogWarning("Failed to allocate stock for line item {LineItemId} in order {OrderId}: {Error}",
                            lineItem.Id, order.Id, allocationResult.Messages.FirstOrDefault()?.Message);
                    }
                }
            }

            // Shipments start in Preparing status - order status only changes when shipments are marked as Shipped
            // via UpdateShipmentStatusAsync. This allows warehouse staff to prepare shipments before marking them shipped.
            order.DateUpdated = DateTime.UtcNow;

            await db.SaveChangesAsync(cancellationToken);

            logger.LogInformation("Created {ShipmentCount} shipments for order {OrderId}. Order status: {Status}",
                newShipments.Count, order.Id, order.Status);

            return newShipments;
        });

        scope.Complete();
        return shipments;
    }

    /// <inheritdoc />
    public async Task<CrudResult<Shipment>> CreateShipmentAsync(
        CreateShipmentParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Shipment>();
        Shipment? createdShipment = null;
        Invoice? invoiceForNotification = null;

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var order = await db.Orders
                .Include(o => o.LineItems)
                .Include(o => o.Shipments)
                .Include(o => o.Invoice)
                .AsSplitQuery()
                .FirstOrDefaultAsync(o => o.Id == parameters.OrderId, cancellationToken);

            if (order == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Order not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
            }

            // Validate quantities
            foreach (var (lineItemId, quantity) in parameters.LineItems)
            {
                var lineItem = order.LineItems?.FirstOrDefault(li => li.Id == lineItemId);
                if (lineItem == null)
                {
                    result.Messages.Add(new ResultMessage
                    {
                        Message = $"Line item {lineItemId} not found in order",
                        ResultMessageType = ResultMessageType.Error
                    });
                    return false;
                }

                var alreadyShipped = order.Shipments?
                    .SelectMany(s => s.LineItems ?? [])
                    .Where(li => li.Id == lineItemId)
                    .Sum(li => li.Quantity) ?? 0;

                var remaining = lineItem.Quantity - alreadyShipped;
                if (quantity > remaining)
                {
                    result.Messages.Add(new ResultMessage
                    {
                        Message = $"Cannot ship {quantity} of {lineItem.Name}. Only {remaining} remaining",
                        ResultMessageType = ResultMessageType.Error
                    });
                    return false;
                }
            }

            // Create shipment line items (skip discount line items - they shouldn't be shipped)
            List<LineItem> shipmentLineItems = [];
            foreach (var (lineItemId, quantity) in parameters.LineItems)
            {
                var sourceLineItem = order.LineItems!.First(li => li.Id == lineItemId);

                // Skip discount line items
                if (sourceLineItem.LineItemType == LineItemType.Discount)
                    continue;

                shipmentLineItems.Add(LineItemFactory.CreateShipmentTrackingLineItem(sourceLineItem, quantity));
            }

            // Create shipment
            var shipment = shipmentFactory.Create(
                order,
                order.WarehouseId,
                order.Invoice?.ShippingAddress ?? new Locality.Models.Address(),
                shipmentLineItems,
                parameters.TrackingNumber,
                parameters.TrackingUrl,
                parameters.Carrier);

            // Publish "Before" notification - handlers can modify shipment or cancel
            var creatingNotification = new ShipmentCreatingNotification(shipment);
            if (await notificationPublisher.PublishCancelableAsync(creatingNotification, cancellationToken))
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = creatingNotification.CancelReason ?? "Shipment creation cancelled",
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
            }

            db.Shipments.Add(shipment);

            // Shipment starts in Preparing status - order status only changes when shipment is marked as Shipped
            // via UpdateShipmentStatusAsync. This allows warehouse staff to prepare shipments before marking them shipped.
            order.DateUpdated = DateTime.UtcNow;

            await db.SaveChangesAsync(cancellationToken);

            result.ResultObject = shipment;
            createdShipment = shipment;
            invoiceForNotification = order.Invoice;
            return true;
        });
        scope.Complete();

        // Publish notifications AFTER scope completion to avoid nested scope issues
        if (createdShipment != null)
        {
            await notificationPublisher.PublishAsync(new ShipmentCreatedNotification(createdShipment), cancellationToken);

            if (invoiceForNotification != null)
            {
                await notificationPublisher.PublishAsync(
                    new InvoiceAggregateChangedNotification(invoiceForNotification, AggregateChangeType.Created, AggregateChangeSource.Shipment, createdShipment),
                    cancellationToken);
            }
        }

        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<Shipment>> UpdateShipmentAsync(
        UpdateShipmentParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Shipment>();
        Shipment? shipment = null;

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            // Load shipment with order and all sibling shipments for delivery status check
            shipment = await db.Shipments
                .Include(s => s.Order)
                    .ThenInclude(o => o!.Shipments)
                .FirstOrDefaultAsync(s => s.Id == parameters.ShipmentId, cancellationToken);

            if (shipment == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Shipment not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
            }

            // Publish "Before" notification - handlers can modify shipment or cancel
            var savingNotification = new ShipmentSavingNotification(shipment);
            if (await notificationPublisher.PublishCancelableAsync(savingNotification, cancellationToken))
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = savingNotification.CancelReason ?? "Shipment update cancelled",
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
            }

            if (parameters.Carrier != null) shipment.Carrier = parameters.Carrier;
            if (parameters.TrackingNumber != null) shipment.TrackingNumber = parameters.TrackingNumber;
            if (parameters.TrackingUrl != null) shipment.TrackingUrl = parameters.TrackingUrl;
            if (parameters.ActualDeliveryDate != null) shipment.ActualDeliveryDate = parameters.ActualDeliveryDate;

            await db.SaveChangesAsync(cancellationToken);

            // Auto-complete/uncomplete order based on delivery status
            var order = shipment.Order;
            if (order != null && order.Shipments?.Any() == true)
            {
                var allDelivered = order.Shipments.All(s => s.ActualDeliveryDate.HasValue);

                if (allDelivered && order.Status == OrderStatus.Shipped)
                {
                    // All shipments delivered - transition to Completed
                    var oldStatus = order.Status;
                    await statusHandler.OnStatusChangingAsync(order, oldStatus, OrderStatus.Completed, cancellationToken);
                    order.Status = OrderStatus.Completed;
                    await db.SaveChangesAsync(cancellationToken);
                    await statusHandler.OnStatusChangedAsync(order, oldStatus, OrderStatus.Completed, cancellationToken);

                    logger.LogInformation("Order {OrderId} auto-completed: all shipments delivered", order.Id);
                }
                else if (!allDelivered && order.Status == OrderStatus.Completed)
                {
                    // Delivery status changed - revert to Shipped
                    var oldStatus = order.Status;
                    await statusHandler.OnStatusChangingAsync(order, oldStatus, OrderStatus.Shipped, cancellationToken);
                    order.Status = OrderStatus.Shipped;
                    await db.SaveChangesAsync(cancellationToken);
                    await statusHandler.OnStatusChangedAsync(order, oldStatus, OrderStatus.Shipped, cancellationToken);

                    logger.LogInformation("Order {OrderId} reverted to Shipped: shipment delivery status changed", order.Id);
                }
            }

            result.ResultObject = shipment;
            return true;
        });
        scope.Complete();

        // Publish "After" notification
        if (result.ResultObject != null)
        {
            await notificationPublisher.PublishAsync(
                new ShipmentSavedNotification(result.ResultObject),
                cancellationToken);
        }

        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<Shipment>> UpdateShipmentStatusAsync(
        UpdateShipmentStatusParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Shipment>();
        Shipment? updatedShipment = null;
        ShipmentStatus? oldStatusForNotification = null;
        ShipmentStatus? newStatusForNotification = null;
        Invoice? invoiceForNotification = null;

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            // Load shipment with order and all sibling shipments for status calculations
            var shipment = await db.Shipments
                .Include(s => s.Order)
                    .ThenInclude(o => o!.Shipments)
                .Include(s => s.Order)
                    .ThenInclude(o => o!.LineItems)
                .Include(s => s.Order)
                    .ThenInclude(o => o!.Invoice)
                .AsSplitQuery()
                .FirstOrDefaultAsync(s => s.Id == parameters.ShipmentId, cancellationToken);

            if (shipment == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Shipment not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
            }

            var oldStatus = shipment.Status;
            var newStatus = parameters.NewStatus;

            // No-op if same status
            if (oldStatus == newStatus)
            {
                result.ResultObject = shipment;
                return false;
            }

            // Validate transition
            if (!oldStatus.CanTransitionTo(newStatus))
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Cannot transition shipment from " + oldStatus.ToLabel() + " to " + newStatus.ToLabel(),
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
            }

            // Publish "Before" notification - handlers can modify shipment or cancel
            var changingNotification = new ShipmentStatusChangingNotification(shipment, oldStatus, newStatus);
            if (await notificationPublisher.PublishCancelableAsync(changingNotification, cancellationToken))
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = changingNotification.CancelReason ?? "Shipment status change cancelled",
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
            }

            // Update shipment status
            shipment.Status = newStatus;

            // Handle status-specific updates
            switch (newStatus)
            {
                case ShipmentStatus.Shipped:
                    shipment.ShippedDate = DateTime.UtcNow;
                    // Update tracking info if provided
                    if (parameters.Carrier != null) shipment.Carrier = parameters.Carrier;
                    if (parameters.TrackingNumber != null) shipment.TrackingNumber = parameters.TrackingNumber;
                    if (parameters.TrackingUrl != null) shipment.TrackingUrl = parameters.TrackingUrl;
                    break;

                case ShipmentStatus.Delivered:
                    shipment.ActualDeliveryDate = DateTime.UtcNow;
                    break;
            }

            // Update order status based on shipment statuses
            var order = shipment.Order;
            if (order != null)
            {
                await UpdateOrderStatusFromShipmentsAsync(order, db, cancellationToken);
            }

            await db.SaveChangesAsync(cancellationToken);

            logger.LogInformation("Shipment {ShipmentId} status changed from {OldStatus} to {NewStatus}",
                shipment.Id, oldStatus.ToLabel(), newStatus.ToLabel());

            result.ResultObject = shipment;
            updatedShipment = shipment;
            oldStatusForNotification = oldStatus;
            newStatusForNotification = newStatus;
            invoiceForNotification = order?.Invoice;
            return true;
        });
        scope.Complete();

        // Publish notifications AFTER scope completion to avoid nested scope issues
        if (updatedShipment != null && oldStatusForNotification.HasValue && newStatusForNotification.HasValue)
        {
            await notificationPublisher.PublishAsync(
                new ShipmentStatusChangedNotification(updatedShipment, oldStatusForNotification.Value, newStatusForNotification.Value),
                cancellationToken);

            if (invoiceForNotification != null)
            {
                await notificationPublisher.PublishAsync(
                    new InvoiceAggregateChangedNotification(invoiceForNotification, AggregateChangeType.Updated, AggregateChangeSource.Shipment, updatedShipment),
                    cancellationToken);
            }
        }

        return result;
    }

    /// <summary>
    /// Updates order status based on the current state of all its shipments.
    /// Called when shipment status changes.
    /// </summary>
    private async Task UpdateOrderStatusFromShipmentsAsync(
        Order order,
        MerchelloDbContext db,
        CancellationToken cancellationToken)
    {
        var shipments = order.Shipments?.ToList() ?? [];
        if (!shipments.Any()) return;

        // Calculate quantities (exclude discount line items)
        var totalOrdered = order.LineItems?
            .Where(li => li.LineItemType != LineItemType.Discount)
            .Sum(li => li.Quantity) ?? 0;

        // Count items in shipments that are Shipped or Delivered (not Preparing or Cancelled)
        var totalShipped = shipments
            .Where(s => s.Status == ShipmentStatus.Shipped || s.Status == ShipmentStatus.Delivered)
            .SelectMany(s => s.LineItems ?? [])
            .Where(li => li.LineItemType != LineItemType.Discount)
            .Sum(li => li.Quantity);

        // Check if all shipments are delivered
        var allDelivered = shipments.All(s => s.Status == ShipmentStatus.Delivered);

        // Determine target order status
        OrderStatus targetStatus;
        if (allDelivered && totalShipped >= totalOrdered)
        {
            targetStatus = OrderStatus.Completed;
        }
        else if (totalShipped >= totalOrdered)
        {
            targetStatus = OrderStatus.Shipped;
        }
        else if (totalShipped > 0)
        {
            targetStatus = OrderStatus.PartiallyShipped;
        }
        else
        {
            // No shipments are shipped yet - keep order in current status (Processing or ReadyToFulfill)
            return;
        }

        if (targetStatus != order.Status)
        {
            var canTransition = await statusHandler.CanTransitionAsync(order, targetStatus, cancellationToken);
            if (canTransition)
            {
                var oldStatus = order.Status;
                await statusHandler.OnStatusChangingAsync(order, oldStatus, targetStatus, cancellationToken);
                order.Status = targetStatus;
                order.DateUpdated = DateTime.UtcNow;

                // Set date fields
                if (targetStatus == OrderStatus.Shipped && order.ShippedDate == null)
                {
                    order.ShippedDate = DateTime.UtcNow;
                }
                else if (targetStatus == OrderStatus.Completed)
                {
                    order.CompletedDate = DateTime.UtcNow;
                }

                await statusHandler.OnStatusChangedAsync(order, oldStatus, targetStatus, cancellationToken);

                logger.LogInformation("Order {OrderId} status changed from {OldStatus} to {NewStatus} based on shipment statuses",
                    order.Id, oldStatus.ToLabel(), targetStatus.ToLabel());
            }
        }
    }

    /// <inheritdoc />
    public async Task<bool> DeleteShipmentAsync(
        Guid shipmentId,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var success = await scope.ExecuteWithContextAsync(async db =>
        {
            var shipment = await db.Shipments
                .Include(s => s.Order)
                    .ThenInclude(o => o.Shipments)
                .Include(s => s.Order)
                    .ThenInclude(o => o.LineItems)
                .AsSplitQuery()
                .FirstOrDefaultAsync(s => s.Id == shipmentId, cancellationToken);

            if (shipment == null)
            {
                return false;
            }

            var order = shipment.Order;
            var wasCompleted = order.Status == OrderStatus.Completed;
            db.Shipments.Remove(shipment);

            // Recalculate order status (exclude discount line items)
            var remainingShipments = order.Shipments?.Where(s => s.Id != shipmentId).ToList() ?? [];
            var totalOrdered = order.LineItems?
                .Where(li => li.LineItemType != LineItemType.Discount)
                .Sum(li => li.Quantity) ?? 0;
            var totalShipped = remainingShipments
                .SelectMany(s => s.LineItems ?? [])
                .Where(li => li.LineItemType != LineItemType.Discount)
                .Sum(li => li.Quantity);

            if (totalShipped >= totalOrdered)
            {
                order.Status = OrderStatus.Shipped;
            }
            else if (totalShipped > 0)
            {
                order.Status = OrderStatus.PartiallyShipped;
            }
            else
            {
                order.Status = OrderStatus.ReadyToFulfill;
                order.ShippedDate = null;
            }

            // Clear CompletedDate if order was Completed and is now reverting
            if (wasCompleted && order.Status != OrderStatus.Completed)
            {
                order.CompletedDate = null;
            }

            order.DateUpdated = DateTime.UtcNow;

            await db.SaveChangesAsync(cancellationToken);
            return true;
        });
        scope.Complete();

        return success;
    }

    /// <inheritdoc />
    public async Task<FulfillmentSummaryDto?> GetFulfillmentSummaryAsync(
        Guid invoiceId,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var invoice = await scope.ExecuteWithContextAsync(async db =>
        {
            return await db.Invoices
                .AsNoTracking()
                .Include(i => i.Orders)!
                    .ThenInclude(o => o.LineItems)
                .Include(i => i.Orders)!
                    .ThenInclude(o => o.Shipments)
                .FirstOrDefaultAsync(i => i.Id == invoiceId, cancellationToken);
        });

        if (invoice == null)
        {
            scope.Complete();
            return null;
        }

        // Load warehouse names
        var warehouseNames = await scope.ExecuteWithContextAsync(async db =>
        {
            var warehouseIds = invoice.Orders?.Select(o => o.WarehouseId).Distinct().ToList() ?? [];
            return await db.Warehouses
                .AsNoTracking()
                .Where(w => warehouseIds.Contains(w.Id))
                .ToDictionaryAsync(w => w.Id, w => w.Name ?? "Unknown Warehouse", cancellationToken);
        });

        // Load shipping option names
        var shippingOptionNames = await scope.ExecuteWithContextAsync(async db =>
        {
            var shippingOptionIds = invoice.Orders?.Select(o => o.ShippingOptionId).Distinct().ToList() ?? [];
            return await db.ShippingOptions
                .AsNoTracking()
                .Where(so => shippingOptionIds.Contains(so.Id))
                .ToDictionaryAsync(so => so.Id, so => so.Name ?? "Unknown", cancellationToken);
        });

        // Load product images
        var productIds = invoice.Orders?
            .SelectMany(o => o.LineItems ?? [])
            .Where(li => li.ProductId.HasValue)
            .Select(li => li.ProductId!.Value)
            .Distinct() ?? [];
        var productImages = await productService.GetProductImagesAsync(productIds, cancellationToken);

        scope.Complete();
        return MapToFulfillmentSummary(invoice, warehouseNames, shippingOptionNames, productImages);
    }

    #region Private Mapping Methods

    private static FulfillmentSummaryDto MapToFulfillmentSummary(
        Invoice invoice,
        Dictionary<Guid, string> warehouseNames,
        Dictionary<Guid, string> shippingOptionNames,
        Dictionary<Guid, string?> productImages)
    {
        var orders = invoice.Orders?.ToList() ?? [];

        var overallStatus = orders.GetFulfillmentStatus();

        return new FulfillmentSummaryDto
        {
            InvoiceId = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            OverallStatus = overallStatus,
            OverallStatusCssClass = overallStatus.ToLowerInvariant(),
            Orders = orders.Select(o => MapToOrderFulfillment(o, warehouseNames, shippingOptionNames, productImages)).ToList()
        };
    }

    private static OrderFulfillmentDto MapToOrderFulfillment(
        Order order,
        Dictionary<Guid, string> warehouseNames,
        Dictionary<Guid, string> shippingOptionNames,
        Dictionary<Guid, string?> productImages)
    {
        warehouseNames ??= [];
        shippingOptionNames ??= [];
        productImages ??= [];

        if (order == null)
        {
            return new OrderFulfillmentDto
            {
                DeliveryMethod = "Unknown",
                LineItems = [],
                Shipments = []
            };
        }

        var lineItems = order.LineItems?
            .Where(li => li != null && li.LineItemType is LineItemType.Product or LineItemType.Custom or LineItemType.Addon)
            .Select(li => li!)
            .ToList() ?? [];
        var shipments = order.Shipments?
            .Where(s => s != null)
            .Select(s => s!)
            .ToList() ?? [];

        // Calculate shipped quantities per line item
        Dictionary<Guid, int> shippedQuantities = [];
        foreach (var shipment in shipments)
        {
            foreach (var li in shipment.LineItems ?? [])
            {
                if (li == null)
                {
                    continue;
                }

                if (!shippedQuantities.ContainsKey(li.Id))
                {
                    shippedQuantities[li.Id] = 0;
                }
                shippedQuantities[li.Id] += li.Quantity;
            }
        }

        var deliveryMethod = shippingOptionNames.TryGetValue(order.ShippingOptionId, out var shippingName)
            ? shippingName
            : "Unknown";

        return new OrderFulfillmentDto
        {
            OrderId = order.Id,
            WarehouseId = order.WarehouseId,
            WarehouseName = warehouseNames.TryGetValue(order.WarehouseId, out var name) ? name : "Unknown Warehouse",
            Status = order.Status,
            DeliveryMethod = deliveryMethod,
            LineItems = lineItems.Select(li => new FulfillmentLineItemDto
            {
                Id = li.Id,
                Sku = li.Sku,
                Name = li.Name,
                ProductRootName = li.ExtendedData != null
                    ? li.GetProductRootName()
                    : li.Name ?? string.Empty,
                SelectedOptions = (li.ExtendedData != null ? li.GetSelectedOptions() : [])
                    .Select(o => new SelectedOptionDto
                    {
                        OptionName = o.OptionName,
                        ValueName = o.ValueName
                    }).ToList(),
                OrderedQuantity = li.Quantity,
                ShippedQuantity = shippedQuantities.TryGetValue(li.Id, out var shipped) ? shipped : 0,
                ImageUrl = li.ProductId.HasValue && productImages.TryGetValue(li.ProductId.Value, out var img) ? img : null,
                Amount = li.Amount
            }).ToList(),
            Shipments = shipments.Select(s => MapToShipmentDetail(s, productImages)).ToList()
        };
    }

    private static ShipmentDetailDto MapToShipmentDetail(Shipment shipment, Dictionary<Guid, string?> productImages)
    {
        return new ShipmentDetailDto
        {
            Id = shipment.Id,
            OrderId = shipment.OrderId,
            Status = shipment.Status,
            StatusLabel = shipment.Status.ToLabel(),
            StatusCssClass = shipment.Status.ToCssClass(),
            Carrier = shipment.Carrier,
            TrackingNumber = shipment.TrackingNumber,
            TrackingUrl = shipment.TrackingUrl,
            DateCreated = shipment.DateCreated,
            ShippedDate = shipment.ShippedDate,
            ActualDeliveryDate = shipment.ActualDeliveryDate,
            CanMarkAsShipped = shipment.Status == ShipmentStatus.Preparing,
            CanMarkAsDelivered = shipment.Status == ShipmentStatus.Shipped,
            CanCancel = shipment.Status != ShipmentStatus.Delivered && shipment.Status != ShipmentStatus.Cancelled,
            LineItems = shipment.LineItems?
                .Where(li => li.LineItemType != LineItemType.Discount)
                .Select(li => new ShipmentLineItemDto
                {
                    Id = Guid.NewGuid(),
                    LineItemId = li.Id,
                    Sku = li.Sku,
                    Name = li.Name,
                    ProductRootName = li.GetProductRootName(),
                    SelectedOptions = li.GetSelectedOptions()
                        .Select(o => new SelectedOptionDto
                        {
                            OptionName = o.OptionName,
                            ValueName = o.ValueName
                        }).ToList(),
                    Quantity = li.Quantity,
                    ImageUrl = li.ProductId.HasValue && productImages.TryGetValue(li.ProductId.Value, out var img) ? img : null
                }).ToList() ?? []
        };
    }

    #endregion
}

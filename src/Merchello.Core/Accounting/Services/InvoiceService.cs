using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Handlers;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Data;
using Merchello.Core.Locality.Models;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.Aggregate;
using Merchello.Core.Notifications.Invoice;
using Merchello.Core.Notifications.Order;
using Merchello.Core.Notifications.Shipment;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shipping.Dtos;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Accounting.Services;

public class InvoiceService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IShippingService shippingService,
    IInventoryService inventoryService,
    IOrderStatusHandler statusHandler,
    IPaymentService paymentService,
    IMerchelloNotificationPublisher notificationPublisher,
    IOptions<MerchelloSettings> settings,
    ILogger<InvoiceService> logger) : IInvoiceService
{
    private readonly MerchelloSettings _settings = settings.Value;

    public async Task<Invoice> CreateOrderFromBasketAsync(
        Basket basket,
        CheckoutSession checkoutSession,
        CancellationToken cancellationToken = default)
    {
        // Get the warehouse shipping groups using the same logic used during checkout
        var shippingResult = await shippingService.GetShippingOptionsForBasket(
            basket,
            checkoutSession.ShippingAddress,
            checkoutSession.SelectedShippingOptions,
            cancellationToken);

        if (!shippingResult.WarehouseGroups.Any())
        {
            throw new InvalidOperationException("No warehouse shipping groups found for basket. Cannot create order.");
        }

        using var scope = efCoreScopeProvider.CreateScope();
        var invoice = await scope.ExecuteWithContextAsync(async db =>
        {
            // Load shipping options to get costs
            var shippingOptionIds = checkoutSession.SelectedShippingOptions.Values.ToList();
            var shippingOptions = await db.ShippingOptions
                .Include(so => so.ShippingCosts)
                .Where(so => shippingOptionIds.Contains(so.Id))
                .ToDictionaryAsync(so => so.Id, cancellationToken);

            // Create the invoice
            var newInvoice = new Invoice
            {
                CustomerId = basket.CustomerId,
                SubTotal = basket.SubTotal,
                Discount = basket.Discount,
                AdjustedSubTotal = basket.AdjustedSubTotal,
                Tax = basket.Tax,
                Total = basket.Total,
                Adjustments = basket.Adjustments
            };

            // Create one order per warehouse shipping group
            List<Order> orders = [];

            foreach (var group in shippingResult.WarehouseGroups)
            {
                // Determine which shipping option was selected for this group
                // Try GroupId first (for groups with specific shipping restrictions)
                // Fall back to WarehouseId for backward compatibility
                var selectedShippingOptionId = checkoutSession.SelectedShippingOptions.GetValueOrDefault(group.GroupId);
                if (selectedShippingOptionId == Guid.Empty)
                {
                    selectedShippingOptionId = checkoutSession.SelectedShippingOptions.GetValueOrDefault(group.WarehouseId);
                }

                if (selectedShippingOptionId == Guid.Empty || !shippingOptions.TryGetValue(selectedShippingOptionId, out var shippingOption))
                {
                    logger.LogWarning("No shipping option selected for warehouse group {GroupId} (Warehouse: {WarehouseId})",
                        group.GroupId, group.WarehouseId);
                    continue;
                }

                // Calculate base shipping cost for this group
                var baseShippingCost = CalculateShippingCost(shippingOption, checkoutSession.ShippingAddress);

                // Check for delivery date selection
                DateTime? requestedDeliveryDate = null;
                bool? isDeliveryDateGuaranteed = null;
                decimal? deliveryDateSurcharge = null;

                if (checkoutSession.SelectedDeliveryDates.TryGetValue(group.GroupId, out var selectedDate))
                {
                    requestedDeliveryDate = selectedDate;
                    isDeliveryDateGuaranteed = shippingOption.IsDeliveryDateGuaranteed;

                    // TODO: Delivery date surcharge calculation can be implemented through shipping providers
                    // For now, surcharge is 0 - can be extended when carrier APIs support date-based pricing
                    deliveryDateSurcharge = 0m;
                }

                var totalShippingCost = baseShippingCost + (deliveryDateSurcharge ?? 0);

                // Map the basket line items to order line items for this group
                // IMPORTANT: Use the allocated quantity from shippingLineItem (not basket quantity)
                // For multi-warehouse fulfillment, a single basket line item may be split across multiple orders
                List<LineItem> orderLineItems = [];
                foreach (var shippingLineItem in group.LineItems)
                {
                    var basketLineItem = basket.LineItems.FirstOrDefault(li => li.Id == shippingLineItem.LineItemId);
                    if (basketLineItem == null)
                    {
                        logger.LogWarning("Basket line item {LineItemId} not found", shippingLineItem.LineItemId);
                        continue;
                    }

                    var orderLineItem = new LineItem
                    {
                        ProductId = basketLineItem.ProductId,
                        Name = basketLineItem.Name,
                        Sku = basketLineItem.Sku,
                        Quantity = shippingLineItem.Quantity, // Use allocated quantity (not basket quantity)
                        Amount = shippingLineItem.Amount,      // Use allocated amount (not basket amount)
                        OriginalAmount = basketLineItem.OriginalAmount,
                        LineItemType = basketLineItem.LineItemType,
                        IsTaxable = basketLineItem.IsTaxable,
                        TaxRate = basketLineItem.TaxRate,
                        DependantLineItemSku = basketLineItem.DependantLineItemSku,
                        ExtendedData = basketLineItem.ExtendedData
                    };

                    orderLineItems.Add(orderLineItem);

                    // Attach any add-on (custom) items dependent on this product SKU
                    var dependentAddons = basket.LineItems
                        .Where(li => li.LineItemType == LineItemType.Custom && li.DependantLineItemSku == basketLineItem.Sku)
                        .ToList();

                    foreach (var addon in dependentAddons)
                    {
                        // Allocate add-on quantities proportional to this shipment's allocation
                        var addonOrderLine = new LineItem
                        {
                            ProductId = null,
                            Name = addon.Name,
                            Sku = addon.Sku,
                            Quantity = shippingLineItem.Quantity, // Match parent's allocated quantity
                            Amount = addon.Amount,                // Unit amount
                            OriginalAmount = addon.OriginalAmount,
                            LineItemType = addon.LineItemType,
                            IsTaxable = addon.IsTaxable,
                            TaxRate = addon.TaxRate,
                            DependantLineItemSku = addon.DependantLineItemSku,
                            ExtendedData = addon.ExtendedData
                        };

                        orderLineItems.Add(addonOrderLine);
                    }
                }

                var order = new Order
                {
                    InvoiceId = newInvoice.Id,
                    WarehouseId = group.WarehouseId,
                    ShippingOptionId = selectedShippingOptionId,
                    ShippingCost = totalShippingCost,
                    RequestedDeliveryDate = requestedDeliveryDate,
                    IsDeliveryDateGuaranteed = isDeliveryDateGuaranteed,
                    DeliveryDateSurcharge = deliveryDateSurcharge,
                    LineItems = orderLineItems,
                    Status = OrderStatus.Pending // Will be updated after reservation
                };

                orders.Add(order);
            }

            if (!orders.Any())
            {
                throw new InvalidOperationException("No orders were created from basket. Check shipping selections.");
            }

            newInvoice.Orders = orders;

            // Use transaction to ensure order creation and stock reservation are atomic
            await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

            try
            {
                // Save orders to database first
                db.Invoices.Add(newInvoice);
                await db.SaveChangesAsync(cancellationToken);

                // Reserve stock for each order
                foreach (var order in orders)
                {
                    List<string> reservationResults = [];
                    var hasUntrackedItems = false;
                    var allReservationsSuccessful = true;

                    foreach (var lineItem in (order.LineItems ?? []).Where(li => li.ProductId.HasValue))
                    {
                        var isTracked = await inventoryService.IsStockTrackedAsync(
                            lineItem.ProductId!.Value,
                            order.WarehouseId,
                            cancellationToken);

                        if (!isTracked)
                        {
                            hasUntrackedItems = true;
                            reservationResults.Add($"Item '{lineItem.Name}' - Stock tracking disabled");
                            continue;
                        }

                        var reservationResult = await inventoryService.ReserveStockAsync(
                            lineItem.ProductId!.Value,
                            order.WarehouseId,
                            lineItem.Quantity,
                            cancellationToken);

                        if (!reservationResult.ResultObject)
                        {
                            allReservationsSuccessful = false;
                            var errorMessage = reservationResult.Messages.FirstOrDefault()?.Message ?? "Unknown error";
                            reservationResults.Add($"Item '{lineItem.Name}' - {errorMessage}");
                        }
                        else
                        {
                            reservationResults.Add($"Item '{lineItem.Name}' - Reserved {lineItem.Quantity} units");
                        }
                    }

                    // Set order status based on reservation results
                    if (!allReservationsSuccessful)
                    {
                        // Stock reservation failed - throw exception to trigger rollback in catch block
                        throw new InvalidOperationException(
                            $"Failed to reserve stock for order: {string.Join("; ", reservationResults)}");
                    }

                    // Determine initial order status
                    var hasAnyTrackedItems = false;
                    foreach (var li in (order.LineItems ?? []).Where(x => x.ProductId.HasValue))
                    {
                        if (await inventoryService.IsStockTrackedAsync(li.ProductId!.Value, order.WarehouseId, cancellationToken))
                        {
                            hasAnyTrackedItems = true;
                            break;
                        }
                    }

                    if (hasUntrackedItems && !hasAnyTrackedItems)
                    {
                        // All items are untracked - ready to fulfill immediately
                        order.Status = OrderStatus.ReadyToFulfill;
                    }
                    else
                    {
                        // Has tracked items and stock was successfully reserved
                        order.Status = OrderStatus.ReadyToFulfill;
                    }

                    logger.LogInformation("Order {OrderId} stock reservations: {Reservations}",
                        order.Id, string.Join("; ", reservationResults));
                }

                // Save updated order statuses
                await db.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                logger.LogInformation("Created invoice {InvoiceId} with {OrderCount} orders from {GroupCount} warehouse groups",
                    newInvoice.Id, orders.Count, shippingResult.WarehouseGroups.Count);

                return newInvoice;
            }
            catch
            {
                await transaction.RollbackAsync(cancellationToken);
                throw;
            }
        });

        scope.Complete();
        return invoice;
    }

    private decimal CalculateShippingCost(ShippingOption shippingOption, Merchello.Core.Locality.Models.Address shippingAddress)
    {
        // If fixed cost is set, use that
        if (shippingOption.FixedCost.HasValue)
        {
            return shippingOption.FixedCost.Value;
        }

        // Look up cost based on shipping address
        if (shippingOption.ShippingCosts?.Any() == true)
        {
            var stateOrProvinceCode = shippingAddress.CountyState?.RegionCode;

            // Try to find state-specific cost first
            var stateCost = shippingOption.ShippingCosts
                .FirstOrDefault(sc =>
                    sc.CountryCode == shippingAddress.CountryCode &&
                    !string.IsNullOrEmpty(sc.StateOrProvinceCode) &&
                    sc.StateOrProvinceCode == stateOrProvinceCode);

            if (stateCost != null)
            {
                return stateCost.Cost;
            }

            // Fall back to country-level cost
            var countryCost = shippingOption.ShippingCosts
                .FirstOrDefault(sc =>
                    sc.CountryCode == shippingAddress.CountryCode &&
                    string.IsNullOrEmpty(sc.StateOrProvinceCode));

            if (countryCost != null)
            {
                return countryCost.Cost;
            }
        }

        logger.LogWarning("No shipping cost configured for option {OptionId} to {Country}/{State}",
            shippingOption.Id, shippingAddress.CountryCode, shippingAddress.CountyState?.RegionCode);

        return 0;
    }

    public async Task<List<Shipment>> CreateShipmentsFromOrderAsync(
        CreateShipmentsParameters parameters,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var shipments = await scope.ExecuteWithContextAsync(async db =>
        {
            // Load the order with its line items and shipments
            // Note: Shipment.LineItems is a JSON column, loaded automatically with Shipment
            var order = await db.Orders
                .Include(o => o.LineItems)
                .Include(o => o.Shipments)
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

                var shipmentLineItem = new LineItem
                {
                    ProductId = lineItem.ProductId,
                    Name = lineItem.Name,
                    Sku = lineItem.Sku,
                    Quantity = quantityToShip,
                    Amount = lineItem.Amount,
                    OriginalAmount = lineItem.OriginalAmount,
                    LineItemType = lineItem.LineItemType,
                    IsTaxable = lineItem.IsTaxable,
                    TaxRate = lineItem.TaxRate,
                    DependantLineItemSku = lineItem.DependantLineItemSku,
                    ExtendedData = lineItem.ExtendedData
                };

                warehouseGroups[warehouseId].Add(shipmentLineItem);
            }

            // Create shipments and allocate stock
            List<Shipment> newShipments = [];

            foreach (var (warehouseId, lineItems) in warehouseGroups)
            {
                var shipment = new Shipment
                {
                    OrderId = order.Id,
                    SupplierId = warehouseId,
                    LineItems = lineItems,
                    Address = parameters.ShippingAddress,
                    TrackingNumber = parameters.TrackingNumber,
                    TrackingUrl = parameters.TrackingUrl,
                    Carrier = parameters.Carrier,
                    RequestedDeliveryDate = order.RequestedDeliveryDate,
                    IsDeliveryDateGuaranteed = order.IsDeliveryDateGuaranteed
                };

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

            // Update order status based on shipment completion
            var totalOrderQuantity = order.LineItems?.Sum(li => li.Quantity) ?? 0;
            var previouslyShippedQuantity = order.Shipments?
                .SelectMany(s => s.LineItems ?? [])
                .Sum(li => li.Quantity) ?? 0;
            var nowShippedQuantity = newShipments.SelectMany(s => s.LineItems ?? []).Sum(li => li.Quantity);
            var totalShippedQuantity = previouslyShippedQuantity + nowShippedQuantity;

            OrderStatus newStatus;
            if (totalShippedQuantity >= totalOrderQuantity)
            {
                // All items shipped
                newStatus = OrderStatus.Shipped;
            }
            else if (previouslyShippedQuantity > 0 || nowShippedQuantity > 0)
            {
                // Some items shipped
                newStatus = OrderStatus.PartiallyShipped;
            }
            else
            {
                newStatus = order.Status; // No change
            }

            if (newStatus != order.Status)
            {
                var canTransition = await statusHandler.CanTransitionAsync(order, newStatus, cancellationToken);
                if (canTransition)
                {
                    var oldStatus = order.Status;
                    await statusHandler.OnStatusChangingAsync(order, oldStatus, newStatus, cancellationToken);
                    order.Status = newStatus;
                    await statusHandler.OnStatusChangedAsync(order, oldStatus, newStatus, cancellationToken);
                }
            }

            await db.SaveChangesAsync(cancellationToken);

            logger.LogInformation("Created {ShipmentCount} shipments for order {OrderId}. Order status: {Status}",
                newShipments.Count, order.Id, order.Status);

            return newShipments;
        });

        scope.Complete();
        return shipments;
    }

    public async Task<CrudResult<bool>> UpdateOrderStatusAsync(
        Guid orderId,
        OrderStatus newStatus,
        string? reason = null,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var order = await db.Orders
                .Include(o => o.Invoice)
                .FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken);

            if (order == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = $"Order {orderId} not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            // Check if transition is allowed
            var canTransition = await statusHandler.CanTransitionAsync(order, newStatus, cancellationToken);
            if (!canTransition)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = $"Cannot transition order from {order.Status} to {newStatus}",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            var oldStatus = order.Status;

            // Publish "Before" notification - handlers can modify order or cancel
            var changingNotification = new OrderStatusChangingNotification(order, oldStatus, newStatus, reason);
            if (await notificationPublisher.PublishCancelableAsync(changingNotification, cancellationToken))
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = changingNotification.CancelReason ?? "Operation cancelled",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            await statusHandler.OnStatusChangingAsync(order, oldStatus, newStatus, cancellationToken);

            order.Status = newStatus;
            if (!string.IsNullOrWhiteSpace(reason) && newStatus == OrderStatus.Cancelled)
            {
                order.CancellationReason = reason;
            }
            if (!string.IsNullOrWhiteSpace(reason))
            {
                order.InternalNotes = (order.InternalNotes ?? "") + $"\n[{DateTime.UtcNow:yyyy-MM-dd HH:mm}] Status change to {newStatus}: {reason}";
            }

            await db.SaveChangesAsync(cancellationToken);
            await statusHandler.OnStatusChangedAsync(order, oldStatus, newStatus, cancellationToken);

            // Publish "After" notification
            await notificationPublisher.PublishAsync(
                new OrderStatusChangedNotification(order, oldStatus, newStatus, reason), cancellationToken);

            // Publish aggregate notification
            if (order.Invoice != null)
            {
                await notificationPublisher.PublishAsync(
                    new InvoiceAggregateChangedNotification(order.Invoice, AggregateChangeType.Updated, AggregateChangeSource.Order, order),
                    cancellationToken);
            }

            logger.LogInformation("Order {OrderId} status updated from {OldStatus} to {NewStatus}",
                orderId, oldStatus, newStatus);

            result.ResultObject = true;
        });

        scope.Complete();
        return result;
    }

    public async Task<CrudResult<bool>> CancelOrderAsync(
        Guid orderId,
        string reason,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var order = await db.Orders
                .Include(o => o.LineItems)
                .FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken);

            if (order == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = $"Order {orderId} not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            // Check if order can be cancelled
            if (order.Status == OrderStatus.Shipped || order.Status == OrderStatus.Completed)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Cannot cancel an order that has already been shipped or completed",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            if (order.Status == OrderStatus.Cancelled)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Order is already cancelled",
                    ResultMessageType = ResultMessageType.Warning
                });
                result.ResultObject = true;
                return;
            }

            // Release stock reservations for all line items
            foreach (var lineItem in (order.LineItems ?? []).Where(li => li.ProductId.HasValue))
            {
                var releaseResult = await inventoryService.ReleaseReservationAsync(
                    lineItem.ProductId!.Value,
                    order.WarehouseId,
                    lineItem.Quantity,
                    cancellationToken);

                if (!releaseResult.ResultObject)
                {
                    logger.LogWarning("Failed to release stock reservation for line item {LineItemId} in order {OrderId}",
                        lineItem.Id, orderId);
                }
            }

            // Update order status to cancelled
            var canTransition = await statusHandler.CanTransitionAsync(order, OrderStatus.Cancelled, cancellationToken);
            if (canTransition)
            {
                var oldStatus = order.Status;
                await statusHandler.OnStatusChangingAsync(order, oldStatus, OrderStatus.Cancelled, cancellationToken);
                order.Status = OrderStatus.Cancelled;
                order.CancellationReason = reason;
                await statusHandler.OnStatusChangedAsync(order, oldStatus, OrderStatus.Cancelled, cancellationToken);
            }

            await db.SaveChangesAsync(cancellationToken);

            logger.LogInformation("Order {OrderId} cancelled. Reason: {Reason}", orderId, reason);

            result.ResultObject = true;
        });

        scope.Complete();
        return result;
    }

    public async Task<Order?> GetOrderWithDetailsAsync(
        Guid orderId,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.Orders
                .AsNoTracking()
                .Include(o => o.Invoice)
                .Include(o => o.LineItems)
                .Include(o => o.Shipments)
                .FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken));
        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<PaginatedList<Invoice>> QueryInvoices(
        InvoiceQueryParameters parameters,
        CancellationToken cancellationToken = default)
    {
        // Check if payment status filtering is needed
        var hasPaymentFilter = parameters.PaymentStatusFilter.HasValue &&
                               parameters.PaymentStatusFilter != InvoicePaymentStatusFilter.All;

        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            // Build base query
            IQueryable<Invoice> query = db.Invoices;

            if (parameters.NoTracking)
            {
                query = query.AsNoTracking();
            }

            // Exclude soft-deleted invoices by default
            if (!parameters.IncludeDeleted)
            {
                query = query.Where(i => !i.IsDeleted);
            }

            // Apply fulfillment status filter (DB-level, works across all databases)
            if (parameters.FulfillmentStatusFilter.HasValue && parameters.FulfillmentStatusFilter != InvoiceFulfillmentStatusFilter.All)
            {
                if (parameters.FulfillmentStatusFilter == InvoiceFulfillmentStatusFilter.Unfulfilled)
                {
                    query = query.Where(i =>
                        i.Orders != null && i.Orders.Any(o =>
                            o.Status != OrderStatus.Completed && o.Status != OrderStatus.Shipped));
                }
                else if (parameters.FulfillmentStatusFilter == InvoiceFulfillmentStatusFilter.Fulfilled)
                {
                    query = query.Where(i =>
                        i.Orders != null && i.Orders.All(o =>
                            o.Status == OrderStatus.Completed || o.Status == OrderStatus.Shipped));
                }
            }

            // Apply search filter
            if (!string.IsNullOrWhiteSpace(parameters.Search))
            {
                var search = parameters.Search.ToLower().Trim();
                query = query.Where(i =>
                    i.InvoiceNumber.ToLower().Contains(search) ||
                    (i.BillingAddress.Name != null && i.BillingAddress.Name.ToLower().Contains(search)) ||
                    (i.BillingAddress.PostalCode != null && i.BillingAddress.PostalCode.ToLower().Contains(search)) ||
                    (i.BillingAddress.Email != null && i.BillingAddress.Email.ToLower().Contains(search)) ||
                    (i.ShippingAddress.Name != null && i.ShippingAddress.Name.ToLower().Contains(search)) ||
                    (i.ShippingAddress.PostalCode != null && i.ShippingAddress.PostalCode.ToLower().Contains(search)) ||
                    (i.ShippingAddress.Email != null && i.ShippingAddress.Email.ToLower().Contains(search)));
            }

            // Apply customer filter
            if (parameters.CustomerId.HasValue)
            {
                query = query.Where(i => i.CustomerId == parameters.CustomerId.Value);
            }

            // Apply channel filter
            if (!string.IsNullOrWhiteSpace(parameters.Channel))
            {
                query = query.Where(i => i.Channel == parameters.Channel);
            }

            // Apply date range filters
            if (parameters.DateFrom.HasValue)
            {
                query = query.Where(i => i.DateCreated >= parameters.DateFrom.Value);
            }
            if (parameters.DateTo.HasValue)
            {
                query = query.Where(i => i.DateCreated <= parameters.DateTo.Value);
            }

            // Apply ordering
            query = ApplyOrdering(query, parameters.OrderBy);

            // Branch based on whether payment status filtering is needed
            if (hasPaymentFilter)
            {
                // Payment status filter requires loading invoices with payments, then filtering in memory
                // This is necessary because SQLite doesn't support the aggregate subquery that EF Core generates
                var invoicesWithPayments = await query
                    .Include(i => i.Payments)
                    .Include(i => i.Orders)!
                        .ThenInclude(o => o.LineItems)
                    .AsSplitQuery()
                    .ToListAsync(cancellationToken);

                // Filter by payment status using the centralized calculation
                var filteredInvoices = invoicesWithPayments.Where(invoice =>
                {
                    var payments = invoice.Payments?.ToList() ?? [];
                    var statusDetails = paymentService.CalculatePaymentStatus(payments, invoice.Total);

                    return parameters.PaymentStatusFilter switch
                    {
                        InvoicePaymentStatusFilter.Paid =>
                            statusDetails.Status == InvoicePaymentStatus.Paid ||
                            statusDetails.Status == InvoicePaymentStatus.PartiallyRefunded,
                        InvoicePaymentStatusFilter.Unpaid =>
                            statusDetails.Status == InvoicePaymentStatus.Unpaid ||
                            statusDetails.Status == InvoicePaymentStatus.AwaitingPayment ||
                            statusDetails.Status == InvoicePaymentStatus.PartiallyPaid,
                        _ => true
                    };
                }).ToList();

                // Apply paging to filtered results
                var totalCount = filteredInvoices.Count;
                var pageIndex = parameters.CurrentPage - 1;
                var pageSize = parameters.AmountPerPage;

                var pagedItems = filteredInvoices
                    .Skip(pageIndex * pageSize)
                    .Take(pageSize)
                    .ToList();

                return new PaginatedList<Invoice>(pagedItems, totalCount, parameters.CurrentPage, parameters.AmountPerPage);
            }
            else
            {
                // No payment filter - use efficient DB-level paging
                var totalCount = await query.Select(i => i.Id).CountAsync(cancellationToken);

                var pageIndex = parameters.CurrentPage - 1;
                var pageSize = parameters.AmountPerPage;

                var invoiceIds = await query
                    .Skip(pageIndex * pageSize)
                    .Take(pageSize)
                    .Select(i => i.Id)
                    .ToListAsync(cancellationToken);

                // Load full invoices with includes
                var items = await db.Invoices
                    .Where(i => invoiceIds.Contains(i.Id))
                    .Include(i => i.Orders)!
                        .ThenInclude(o => o.LineItems)
                    .Include(i => i.Payments)
                    .AsSplitQuery()
                    .ToListAsync(cancellationToken);

                // Maintain the order from the paged query (handle race condition if invoice deleted between queries)
                var orderedItems = invoiceIds
                    .Select(id => items.FirstOrDefault(i => i.Id == id))
                    .Where(i => i != null)
                    .Cast<Invoice>()
                    .ToList();

                return new PaginatedList<Invoice>(orderedItems, totalCount, parameters.CurrentPage, parameters.AmountPerPage);
            }
        });
        scope.Complete();
        return result;
    }

    private static IQueryable<Invoice> ApplyOrdering(IQueryable<Invoice> query, InvoiceOrderBy orderBy)
    {
        return orderBy switch
        {
            InvoiceOrderBy.DateAsc => query.OrderBy(i => i.DateCreated),
            InvoiceOrderBy.DateDesc => query.OrderByDescending(i => i.DateCreated),
            InvoiceOrderBy.TotalAsc => query.OrderBy(i => i.Total),
            InvoiceOrderBy.TotalDesc => query.OrderByDescending(i => i.Total),
            InvoiceOrderBy.CustomerAsc => query.OrderBy(i => i.BillingAddress.Name),
            InvoiceOrderBy.CustomerDesc => query.OrderByDescending(i => i.BillingAddress.Name),
            InvoiceOrderBy.InvoiceNumberAsc => query.OrderBy(i => i.InvoiceNumber),
            InvoiceOrderBy.InvoiceNumberDesc => query.OrderByDescending(i => i.InvoiceNumber),
            _ => query.OrderByDescending(i => i.DateCreated)
        };
    }

    /// <inheritdoc />
    public async Task<Invoice?> GetInvoiceAsync(
        Guid invoiceId,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.Invoices
                .AsNoTracking()
                .Include(i => i.Orders)!
                    .ThenInclude(o => o.LineItems)
                .Include(i => i.Orders)!
                    .ThenInclude(o => o.Shipments)
                .Include(i => i.Payments)
                .AsSplitQuery()
                .FirstOrDefaultAsync(i => i.Id == invoiceId, cancellationToken));
        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<int> SoftDeleteInvoicesAsync(
        IEnumerable<Guid> invoiceIds,
        CancellationToken cancellationToken = default)
    {
        var idList = invoiceIds.ToList();
        if (idList.Count == 0)
        {
            return 0;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        var deletedCount = await scope.ExecuteWithContextAsync(async db =>
        {
            var now = DateTime.UtcNow;
            var count = await db.Invoices
                .Where(i => idList.Contains(i.Id) && !i.IsDeleted)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(i => i.IsDeleted, true)
                    .SetProperty(i => i.DateDeleted, now)
                    .SetProperty(i => i.DateUpdated, now),
                    cancellationToken);

            logger.LogInformation("Soft-deleted {Count} invoices", count);
            return count;
        });

        scope.Complete();
        return deletedCount;
    }

    /// <inheritdoc />
    public async Task<bool> InvoiceExistsAsync(
        Guid invoiceId,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var exists = await scope.ExecuteWithContextAsync(async db =>
            await db.Invoices.AnyAsync(i => i.Id == invoiceId, cancellationToken));
        scope.Complete();
        return exists;
    }

    /// <inheritdoc />
    public async Task<OrderStatsDto> GetOrderStatsAsync(CancellationToken cancellationToken = default)
    {
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);

        using var scope = efCoreScopeProvider.CreateScope();
        var stats = await scope.ExecuteWithContextAsync(async db =>
        {
            var todaysInvoices = await db.Invoices
                .AsNoTracking()
                .Include(i => i.Orders)!
                    .ThenInclude(o => o.LineItems)
                .Include(i => i.Orders)!
                    .ThenInclude(o => o.Shipments)
                .Where(i => !i.IsDeleted && i.DateCreated >= today && i.DateCreated < tomorrow)
                .ToListAsync(cancellationToken);

            var ordersToday = todaysInvoices.Count;

            var itemsOrderedToday = todaysInvoices
                .SelectMany(i => i.Orders ?? [])
                .SelectMany(o => o.LineItems ?? [])
                .Sum(li => li.Quantity);

            var ordersFulfilledToday = todaysInvoices
                .Where(i => i.Orders != null && i.Orders.Any() &&
                            i.Orders.All(o => o.Status == OrderStatus.Shipped || o.Status == OrderStatus.Completed))
                .Count();

            var ordersDeliveredToday = todaysInvoices
                .Where(i => i.Orders != null &&
                            i.Orders.Any(o => o.Shipments != null &&
                                              o.Shipments.Any(s => s.ActualDeliveryDate != null &&
                                                                   s.ActualDeliveryDate.Value.Date == today)))
                .Count();

            return new OrderStatsDto
            {
                OrdersToday = ordersToday,
                ItemsOrderedToday = itemsOrderedToday,
                OrdersFulfilledToday = ordersFulfilledToday,
                OrdersDeliveredToday = ordersDeliveredToday
            };
        });
        scope.Complete();

        return stats;
    }

    /// <inheritdoc />
    public async Task<DashboardStatsDto> GetDashboardStatsAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var thisMonthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var lastMonthStart = thisMonthStart.AddMonths(-1);
        var lastMonthEnd = thisMonthStart;

        using var scope = efCoreScopeProvider.CreateScope();
        var stats = await scope.ExecuteWithContextAsync(async db =>
        {
            var thisMonthInvoices = await db.Invoices
                .AsNoTracking()
                .Where(i => !i.IsDeleted && i.DateCreated >= thisMonthStart)
                .ToListAsync(cancellationToken);

            var lastMonthInvoices = await db.Invoices
                .AsNoTracking()
                .Where(i => !i.IsDeleted && i.DateCreated >= lastMonthStart && i.DateCreated < lastMonthEnd)
                .ToListAsync(cancellationToken);

            // Orders stats
            var ordersThisMonth = thisMonthInvoices.Count;
            var ordersLastMonth = lastMonthInvoices.Count;
            var ordersChangePercent = ordersLastMonth > 0
                ? Math.Round(((decimal)(ordersThisMonth - ordersLastMonth) / ordersLastMonth) * 100, 1)
                : (ordersThisMonth > 0 ? 100m : 0m);

            // Revenue stats
            var revenueThisMonth = thisMonthInvoices.Sum(i => i.Total);
            var revenueLastMonth = lastMonthInvoices.Sum(i => i.Total);
            var revenueChangePercent = revenueLastMonth > 0
                ? Math.Round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100, 1)
                : (revenueThisMonth > 0 ? 100m : 0m);

            // Product count
            var productCount = await db.RootProducts.CountAsync(cancellationToken);
            var productCountChange = 0;

            // Customer count (unique billing emails)
            var allEmails = await db.Invoices
                .AsNoTracking()
                .Where(i => !i.IsDeleted && i.BillingAddress.Email != null)
                .Select(i => i.BillingAddress.Email)
                .Distinct()
                .ToListAsync(cancellationToken);
            var customerCount = allEmails.Count;

            // New customers this month
            var emailsBeforeThisMonth = await db.Invoices
                .AsNoTracking()
                .Where(i => !i.IsDeleted && i.DateCreated < thisMonthStart && i.BillingAddress.Email != null)
                .Select(i => i.BillingAddress.Email)
                .Distinct()
                .ToListAsync(cancellationToken);
            var emailsThisMonth = thisMonthInvoices
                .Where(i => i.BillingAddress?.Email != null)
                .Select(i => i.BillingAddress!.Email)
                .Distinct()
                .ToList();
            var newCustomersThisMonth = emailsThisMonth.Count(e => !emailsBeforeThisMonth.Contains(e));

            return new DashboardStatsDto
            {
                OrdersThisMonth = ordersThisMonth,
                OrdersChangePercent = ordersChangePercent,
                RevenueThisMonth = revenueThisMonth,
                RevenueChangePercent = revenueChangePercent,
                ProductCount = productCount,
                ProductCountChange = productCountChange,
                CustomerCount = customerCount,
                CustomerCountChange = newCustomersThisMonth
            };
        });
        scope.Complete();

        return stats;
    }

    /// <inheritdoc />
    public async Task<List<OrderExportItemDto>> GetOrdersForExportAsync(
        DateTime fromDate,
        DateTime toDate,
        CancellationToken cancellationToken = default)
    {
        // Ensure toDate includes the entire day
        var toDateEndOfDay = toDate.Date.AddDays(1).AddTicks(-1);

        using var scope = efCoreScopeProvider.CreateScope();
        var exportItems = await scope.ExecuteWithContextAsync(async db =>
        {
            var invoices = await db.Invoices
                .AsNoTracking()
                .AsSplitQuery()
                .Include(i => i.Orders)
                .Include(i => i.Payments)
                .Where(i => !i.IsDeleted
                    && i.DateCreated >= fromDate.Date
                    && i.DateCreated <= toDateEndOfDay)
                .OrderBy(i => i.DateCreated)
                .ToListAsync(cancellationToken);

            List<OrderExportItemDto> result = [];

            foreach (var invoice in invoices)
            {
                var payments = invoice.Payments?.ToList() ?? [];
                var paymentDetails = paymentService.CalculatePaymentStatus(payments, invoice.Total);
                var shippingTotal = invoice.Orders?.Sum(o => o.ShippingCost) ?? 0;

                result.Add(new OrderExportItemDto
                {
                    InvoiceNumber = invoice.InvoiceNumber,
                    InvoiceDate = invoice.DateCreated,
                    PaymentStatus = paymentDetails.StatusDisplay,
                    BillingName = invoice.BillingAddress?.Name ?? string.Empty,
                    SubTotal = invoice.SubTotal,
                    Tax = invoice.Tax,
                    Shipping = shippingTotal,
                    Total = invoice.Total
                });
            }

            return result;
        });
        scope.Complete();

        return exportItems;
    }

    /// <inheritdoc />
    public async Task<CrudResult<InvoiceNote>> AddNoteAsync(
        Guid invoiceId,
        string text,
        bool visibleToCustomer,
        Guid? authorId = null,
        string? authorName = null,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<InvoiceNote>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var invoice = await db.Invoices.FirstOrDefaultAsync(i => i.Id == invoiceId, cancellationToken);
            if (invoice == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Invoice not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            var note = new InvoiceNote
            {
                DateCreated = DateTime.UtcNow,
                Description = text.Trim(),
                AuthorId = authorId,
                Author = authorName ?? "System",
                VisibleToCustomer = visibleToCustomer
            };

            invoice.Notes ??= [];
            invoice.Notes.Add(note);
            invoice.DateUpdated = DateTime.UtcNow;

            await db.SaveChangesAsync(cancellationToken);
            result.ResultObject = note;
        });
        scope.Complete();

        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<Address>> UpdateBillingAddressAsync(
        Guid invoiceId,
        Address address,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Address>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var invoice = await db.Invoices.FirstOrDefaultAsync(i => i.Id == invoiceId, cancellationToken);
            if (invoice == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Invoice not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            invoice.BillingAddress = address;
            invoice.DateUpdated = DateTime.UtcNow;

            await db.SaveChangesAsync(cancellationToken);
            result.ResultObject = address;
        });
        scope.Complete();

        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<Address>> UpdateShippingAddressAsync(
        Guid invoiceId,
        Address address,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Address>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var invoice = await db.Invoices.FirstOrDefaultAsync(i => i.Id == invoiceId, cancellationToken);
            if (invoice == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Invoice not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            invoice.ShippingAddress = address;
            invoice.DateUpdated = DateTime.UtcNow;

            await db.SaveChangesAsync(cancellationToken);
            result.ResultObject = address;
        });
        scope.Complete();

        return result;
    }

    /// <inheritdoc />
    public async Task<FulfillmentSummaryDto?> GetFulfillmentSummaryAsync(
        Guid invoiceId,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var invoice = await db.Invoices
                .AsNoTracking()
                .Include(i => i.Orders)!
                    .ThenInclude(o => o.LineItems)
                .Include(i => i.Orders)!
                    .ThenInclude(o => o.Shipments)
                .FirstOrDefaultAsync(i => i.Id == invoiceId, cancellationToken);

            if (invoice == null)
            {
                return null;
            }

            // Load warehouse names
            var warehouseIds = invoice.Orders?.Select(o => o.WarehouseId).Distinct().ToList() ?? [];
            var warehouseNames = await db.Warehouses
                .AsNoTracking()
                .Where(w => warehouseIds.Contains(w.Id))
                .ToDictionaryAsync(w => w.Id, w => w.Name ?? "Unknown Warehouse", cancellationToken);

            // Load shipping option names
            var shippingOptionIds = invoice.Orders?.Select(o => o.ShippingOptionId).Distinct().ToList() ?? [];
            var shippingOptionNames = await db.ShippingOptions
                .AsNoTracking()
                .Where(so => shippingOptionIds.Contains(so.Id))
                .ToDictionaryAsync(so => so.Id, so => so.Name ?? "Unknown", cancellationToken);

            return MapToFulfillmentSummary(invoice, warehouseNames, shippingOptionNames);
        });
        scope.Complete();

        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<Shipment>> CreateShipmentAsync(
        CreateShipmentParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Shipment>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var order = await db.Orders
                .Include(o => o.LineItems)
                .Include(o => o.Shipments)
                .Include(o => o.Invoice)
                .FirstOrDefaultAsync(o => o.Id == parameters.OrderId, cancellationToken);

            if (order == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Order not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
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
                    return;
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
                    return;
                }
            }

            // Create shipment line items
            List<LineItem> shipmentLineItems = [];
            foreach (var (lineItemId, quantity) in parameters.LineItems)
            {
                var sourceLineItem = order.LineItems!.First(li => li.Id == lineItemId);
                shipmentLineItems.Add(new LineItem
                {
                    Id = sourceLineItem.Id,
                    Sku = sourceLineItem.Sku,
                    Name = sourceLineItem.Name,
                    Quantity = quantity,
                    Amount = sourceLineItem.Amount,
                    LineItemType = sourceLineItem.LineItemType,
                });
            }

            // Create shipment
            var shipment = new Shipment
            {
                OrderId = parameters.OrderId,
                SupplierId = order.WarehouseId,
                Address = order.Invoice?.ShippingAddress ?? new Address(),
                LineItems = shipmentLineItems,
                Carrier = parameters.Carrier,
                TrackingNumber = parameters.TrackingNumber,
                TrackingUrl = parameters.TrackingUrl,
                RequestedDeliveryDate = order.RequestedDeliveryDate,
                IsDeliveryDateGuaranteed = order.IsDeliveryDateGuaranteed,
                DateCreated = DateTime.UtcNow
            };

            // Publish "Before" notification - handlers can modify shipment or cancel
            var creatingNotification = new ShipmentCreatingNotification(shipment);
            if (await notificationPublisher.PublishCancelableAsync(creatingNotification, cancellationToken))
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = creatingNotification.CancelReason ?? "Shipment creation cancelled",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            db.Shipments.Add(shipment);

            // Update order status
            var totalOrdered = order.LineItems?.Sum(li => li.Quantity) ?? 0;
            var totalShipped = (order.Shipments?.SelectMany(s => s.LineItems ?? []).Sum(li => li.Quantity) ?? 0)
                             + shipmentLineItems.Sum(li => li.Quantity);

            if (totalShipped >= totalOrdered)
            {
                order.Status = OrderStatus.Shipped;
                order.ShippedDate = DateTime.UtcNow;
            }
            else if (totalShipped > 0)
            {
                order.Status = OrderStatus.PartiallyShipped;
            }

            order.DateUpdated = DateTime.UtcNow;

            await db.SaveChangesAsync(cancellationToken);

            // Publish "After" notification
            await notificationPublisher.PublishAsync(new ShipmentCreatedNotification(shipment), cancellationToken);

            // Publish aggregate notification
            if (order.Invoice != null)
            {
                await notificationPublisher.PublishAsync(
                    new InvoiceAggregateChangedNotification(order.Invoice, AggregateChangeType.Created, AggregateChangeSource.Shipment, shipment),
                    cancellationToken);
            }

            result.ResultObject = shipment;
        });
        scope.Complete();

        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<Shipment>> UpdateShipmentAsync(
        UpdateShipmentParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Shipment>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var shipment = await db.Shipments.FirstOrDefaultAsync(s => s.Id == parameters.ShipmentId, cancellationToken);
            if (shipment == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Shipment not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            if (parameters.Carrier != null) shipment.Carrier = parameters.Carrier;
            if (parameters.TrackingNumber != null) shipment.TrackingNumber = parameters.TrackingNumber;
            if (parameters.TrackingUrl != null) shipment.TrackingUrl = parameters.TrackingUrl;
            if (parameters.ActualDeliveryDate != null) shipment.ActualDeliveryDate = parameters.ActualDeliveryDate;

            await db.SaveChangesAsync(cancellationToken);
            result.ResultObject = shipment;
        });
        scope.Complete();

        return result;
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
                .FirstOrDefaultAsync(s => s.Id == shipmentId, cancellationToken);

            if (shipment == null)
            {
                return false;
            }

            var order = shipment.Order;
            db.Shipments.Remove(shipment);

            // Recalculate order status
            var remainingShipments = order.Shipments?.Where(s => s.Id != shipmentId).ToList() ?? [];
            var totalOrdered = order.LineItems?.Sum(li => li.Quantity) ?? 0;
            var totalShipped = remainingShipments.SelectMany(s => s.LineItems ?? []).Sum(li => li.Quantity);

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

            order.DateUpdated = DateTime.UtcNow;

            await db.SaveChangesAsync(cancellationToken);
            return true;
        });
        scope.Complete();

        return success;
    }

    private static FulfillmentSummaryDto MapToFulfillmentSummary(Invoice invoice, Dictionary<Guid, string> warehouseNames, Dictionary<Guid, string> shippingOptionNames)
    {
        var orders = invoice.Orders?.ToList() ?? [];

        return new FulfillmentSummaryDto
        {
            InvoiceId = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            OverallStatus = GetFulfillmentStatus(orders),
            Orders = orders.Select(o => MapToOrderFulfillment(o, warehouseNames, shippingOptionNames)).ToList()
        };
    }

    private static OrderFulfillmentDto MapToOrderFulfillment(Order order, Dictionary<Guid, string> warehouseNames, Dictionary<Guid, string> shippingOptionNames)
    {
        var lineItems = order.LineItems?
            .Where(li => li.LineItemType == LineItemType.Product)
            .ToList() ?? [];
        var shipments = order.Shipments?.ToList() ?? [];

        // Calculate shipped quantities per line item
        Dictionary<Guid, int> shippedQuantities = [];
        foreach (var shipment in shipments)
        {
            foreach (var li in shipment.LineItems ?? [])
            {
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
                OrderedQuantity = li.Quantity,
                ShippedQuantity = shippedQuantities.TryGetValue(li.Id, out var shipped) ? shipped : 0,
                ImageUrl = null,
                Amount = li.Amount
            }).ToList(),
            Shipments = shipments.Select(MapToShipmentDetail).ToList()
        };
    }

    private static ShipmentDetailDto MapToShipmentDetail(Shipment shipment)
    {
        return new ShipmentDetailDto
        {
            Id = shipment.Id,
            OrderId = shipment.OrderId,
            Carrier = shipment.Carrier,
            TrackingNumber = shipment.TrackingNumber,
            TrackingUrl = shipment.TrackingUrl,
            DateCreated = shipment.DateCreated,
            ActualDeliveryDate = shipment.ActualDeliveryDate,
            LineItems = shipment.LineItems?.Select(li => new ShipmentLineItemDto
            {
                Id = Guid.NewGuid(),
                LineItemId = li.Id,
                Sku = li.Sku,
                Name = li.Name,
                Quantity = li.Quantity,
                ImageUrl = null
            }).ToList() ?? []
        };
    }

    private static string GetFulfillmentStatus(List<Order> orders)
    {
        if (!orders.Any())
            return "Unfulfilled";

        var allShipped = orders.All(o => o.Status == OrderStatus.Shipped || o.Status == OrderStatus.Completed);
        if (allShipped)
            return "Fulfilled";

        var anyShipped = orders.Any(o =>
            o.Status == OrderStatus.Shipped ||
            o.Status == OrderStatus.PartiallyShipped ||
            o.Status == OrderStatus.Completed);

        return anyShipped ? "Partial" : "Unfulfilled";
    }

    /// <inheritdoc />
    public async Task<int> GetInvoiceCountByBillingEmailAsync(
        string email,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return 0;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        var count = await scope.ExecuteWithContextAsync(async db =>
            await db.Invoices
                .AsNoTracking()
                .CountAsync(i => !i.IsDeleted && i.BillingAddress.Email == email, cancellationToken));
        scope.Complete();

        return count;
    }

    /// <inheritdoc />
    public async Task<Dictionary<Guid, string>> GetShippingOptionNamesAsync(
        IEnumerable<Guid> shippingOptionIds,
        CancellationToken cancellationToken = default)
    {
        var ids = shippingOptionIds.ToList();
        if (ids.Count == 0) return [];

        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.ShippingOptions
                .AsNoTracking()
                .Where(so => ids.Contains(so.Id))
                .Select(so => new { so.Id, so.Name })
                .ToDictionaryAsync(x => x.Id, x => x.Name ?? "Unknown", cancellationToken));
        scope.Complete();
        return result;
    }

    // ============================================
    // Invoice Editing Methods
    // ============================================

    /// <inheritdoc />
    public async Task<InvoiceForEditDto?> GetInvoiceForEditAsync(Guid invoiceId, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var invoice = await db.Invoices
                .Include(i => i.Orders)!
                .ThenInclude(o => o.LineItems)
                .Include(i => i.Orders)!
                .ThenInclude(o => o.Shipments)
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.Id == invoiceId && !i.IsDeleted, cancellationToken);

            if (invoice == null)
            {
                return null;
            }

            var orders = invoice.Orders?.ToList() ?? [];
            var (canEdit, cannotEditReason) = CanEditInvoice(orders);

            // Get shipping option names for orders
            var shippingOptionIds = orders.Select(o => o.ShippingOptionId).Distinct().ToList();
            var shippingOptionNames = await db.ShippingOptions
                .Where(so => shippingOptionIds.Contains(so.Id))
                .ToDictionaryAsync(so => so.Id, so => so.Name ?? "Unknown", cancellationToken);

            // Build stock availability map for all product line items
            var stockInfoMap = new Dictionary<Guid, (bool IsTracked, int Available)>();
            foreach (var order in orders)
            {
                foreach (var li in order.LineItems?.Where(l => l.ProductId.HasValue) ?? [])
                {
                    if (stockInfoMap.ContainsKey(li.Id)) continue;

                    var isTracked = await inventoryService.IsStockTrackedAsync(
                        li.ProductId!.Value, order.WarehouseId, cancellationToken);
                    var available = await inventoryService.GetAvailableStockAsync(
                        li.ProductId!.Value, order.WarehouseId, cancellationToken);

                    stockInfoMap[li.Id] = (isTracked, available);
                }
            }

            // Calculate totals breakdown
            var allLineItems = orders.SelectMany(o => o.LineItems ?? []).ToList();
            var productItems = allLineItems.Where(li =>
                li.LineItemType == LineItemType.Product || li.LineItemType == LineItemType.Custom);
            var subTotal = productItems.Sum(li => li.Amount * li.Quantity);

            var discountItems = allLineItems.Where(li => li.LineItemType == LineItemType.Discount);
            var discountTotal = Math.Abs(discountItems.Sum(li => li.Amount));

            var shippingTotal = orders.Sum(o => o.ShippingCost);

            return new InvoiceForEditDto
            {
                Id = invoice.Id,
                InvoiceNumber = invoice.InvoiceNumber,
                FulfillmentStatus = GetFulfillmentStatus(orders),
                CanEdit = canEdit,
                CannotEditReason = cannotEditReason,
                CurrencySymbol = _settings.CurrencySymbol,
                CurrencyCode = _settings.StoreCurrencyCode,
                Orders = orders.Select(o => MapOrderForEdit(o, shippingOptionNames, stockInfoMap)).ToList(),
                SubTotal = subTotal,
                DiscountTotal = discountTotal,
                AdjustedSubTotal = subTotal - discountTotal,
                ShippingTotal = shippingTotal,
                Tax = invoice.Tax,
                Total = invoice.Total
            };
        });
        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<OperationResult<EditInvoiceResultDto>> EditInvoiceAsync(
        Guid invoiceId,
        EditInvoiceRequestDto request,
        Guid? authorId,
        string? authorName,
        CancellationToken cancellationToken = default)
    {
        var changes = new List<string>();
        var warnings = new List<string>();

        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var invoice = await db.Invoices
                .Include(i => i.Orders)!
                .ThenInclude(o => o.LineItems)
                .FirstOrDefaultAsync(i => i.Id == invoiceId && !i.IsDeleted, cancellationToken);

            if (invoice == null)
            {
                return OperationResult<EditInvoiceResultDto>.Fail("Invoice not found");
            }

            var orders = invoice.Orders?.ToList() ?? [];
            var (canEdit, cannotEditReason) = CanEditInvoice(orders);

            if (!canEdit)
            {
                return OperationResult<EditInvoiceResultDto>.Fail(cannotEditReason ?? "Invoice cannot be edited");
            }

            try
            {
                // Process line item updates (quantity changes, discounts)
                foreach (var editItem in request.LineItems)
                {
                    var lineItem = orders
                        .SelectMany(o => o.LineItems ?? [])
                        .FirstOrDefault(li => li.Id == editItem.Id);

                    if (lineItem == null)
                    {
                        logger.LogWarning("Line item {LineItemId} not found for edit", editItem.Id);
                        continue;
                    }

                    // Update quantity with stock validation and reservation/release
                    if (editItem.Quantity.HasValue && editItem.Quantity.Value != lineItem.Quantity)
                    {
                        var oldQty = lineItem.Quantity;
                        var newQty = editItem.Quantity.Value;
                        var qtyDiff = newQty - oldQty;

                        if (qtyDiff > 0 && lineItem.ProductId.HasValue)
                        {
                            // QUANTITY INCREASE - validate and reserve additional stock
                            var order = orders.First(o => o.LineItems?.Contains(lineItem) == true);
                            var isTracked = await inventoryService.IsStockTrackedAsync(
                                lineItem.ProductId.Value, order.WarehouseId, cancellationToken);

                            if (isTracked)
                            {
                                var availableStock = await inventoryService.GetAvailableStockAsync(
                                    lineItem.ProductId.Value, order.WarehouseId, cancellationToken);

                                if (availableStock < qtyDiff)
                                {
                                    // REJECT - insufficient stock
                                    return OperationResult<EditInvoiceResultDto>.Fail(
                                        $"Insufficient stock for '{lineItem.Name}'. Available: {availableStock}, Additional needed: {qtyDiff}");
                                }

                                // Reserve the additional stock
                                var reserveResult = await inventoryService.ReserveStockAsync(
                                    lineItem.ProductId.Value, order.WarehouseId, qtyDiff, cancellationToken);

                                if (!reserveResult.ResultObject)
                                {
                                    var error = reserveResult.Messages.FirstOrDefault()?.Message ?? "Failed to reserve stock";
                                    return OperationResult<EditInvoiceResultDto>.Fail(error);
                                }

                                changes.Add($"Reserved {qtyDiff} additional units of {lineItem.Name}");
                            }
                        }
                        else if (qtyDiff < 0 && lineItem.ProductId.HasValue && editItem.ReturnToStock)
                        {
                            // QUANTITY DECREASE - release reservation if user wants to return to stock
                            var order = orders.First(o => o.LineItems?.Contains(lineItem) == true);
                            var isTracked = await inventoryService.IsStockTrackedAsync(
                                lineItem.ProductId.Value, order.WarehouseId, cancellationToken);

                            if (isTracked)
                            {
                                var releaseQty = Math.Abs(qtyDiff);
                                var releaseResult = await inventoryService.ReleaseReservationAsync(
                                    lineItem.ProductId.Value, order.WarehouseId, releaseQty, cancellationToken);

                                if (releaseResult.ResultObject)
                                {
                                    changes.Add($"Returned {releaseQty} units of {lineItem.Name} to available stock");
                                }
                                else
                                {
                                    warnings.Add($"Could not release stock reservation for {lineItem.Name}");
                                }
                            }
                        }

                        lineItem.Quantity = newQty;
                        lineItem.DateUpdated = DateTime.UtcNow;
                        changes.Add($"Changed quantity of {lineItem.Name} from {oldQty} to {newQty}");
                    }

                    // Apply discount
                    if (editItem.Discount != null)
                    {
                        var discountAmount = CalculateDiscountAmount(editItem.Discount, lineItem.Amount, lineItem.Quantity);
                        if (discountAmount > 0)
                        {
                            // Remove any existing discount for this line item
                            var existingDiscounts = orders
                                .SelectMany(o => o.LineItems ?? [])
                                .Where(li => li.LineItemType == LineItemType.Discount && li.DependantLineItemSku == lineItem.Sku)
                                .ToList();

                            foreach (var existingDiscount in existingDiscounts)
                            {
                                var discountOrder = orders.First(o => o.LineItems?.Contains(existingDiscount) == true);
                                discountOrder.LineItems?.Remove(existingDiscount);
                                db.LineItems.Remove(existingDiscount);
                            }

                            // Create new discount line item
                            var order2 = orders.First(o => o.LineItems?.Contains(lineItem) == true);
                            var discountLineItem = new LineItem
                            {
                                Id = GuidExtensions.NewSequentialGuid,
                                OrderId = order2.Id,
                                LineItemType = LineItemType.Discount,
                                DependantLineItemSku = lineItem.Sku,
                                Name = editItem.Discount.Reason ?? "Discount",
                                Sku = $"DISCOUNT-{lineItem.Sku}",
                                Amount = -discountAmount,
                                Quantity = 1,
                                IsTaxable = lineItem.IsTaxable,
                                TaxRate = lineItem.TaxRate,
                                ExtendedData = new Dictionary<string, object>
                                {
                                    ["DiscountType"] = editItem.Discount.Type.ToString(),
                                    ["DiscountValue"] = editItem.Discount.Value,
                                    ["VisibleToCustomer"] = editItem.Discount.VisibleToCustomer
                                }
                            };

                            order2.LineItems ??= [];
                            order2.LineItems.Add(discountLineItem);
                            db.LineItems.Add(discountLineItem);

                            var discountDisplay = editItem.Discount.Type == DiscountType.Percentage
                                ? $"{editItem.Discount.Value}%"
                                : $"{_settings.CurrencySymbol}{editItem.Discount.Value}";
                            changes.Add($"Applied {discountDisplay} discount to {lineItem.Name}");
                        }
                    }
                }

                // Process removed line items with optional stock return
                foreach (var removal in request.RemovedLineItems)
                {
                    var lineItem = orders
                        .SelectMany(o => o.LineItems ?? [])
                        .FirstOrDefault(li => li.Id == removal.Id);

                    if (lineItem == null) continue;

                    // Release stock reservation if requested and product is stock-tracked
                    if (removal.ReturnToStock && lineItem.ProductId.HasValue)
                    {
                        var order = orders.First(o => o.LineItems?.Contains(lineItem) == true);
                        var isTracked = await inventoryService.IsStockTrackedAsync(
                            lineItem.ProductId.Value, order.WarehouseId, cancellationToken);

                        if (isTracked)
                        {
                            var releaseResult = await inventoryService.ReleaseReservationAsync(
                                lineItem.ProductId.Value, order.WarehouseId, lineItem.Quantity, cancellationToken);

                            if (releaseResult.ResultObject)
                            {
                                changes.Add($"Returned {lineItem.Quantity} units of {lineItem.Name} to available stock");
                            }
                            else
                            {
                                warnings.Add($"Could not release stock reservation for {lineItem.Name}");
                            }
                        }
                    }
                    else if (!removal.ReturnToStock && lineItem.ProductId.HasValue)
                    {
                        changes.Add($"Removed {lineItem.Name} (stock not returned - marked as damaged/faulty)");
                    }

                    // Remove any dependent discounts
                    var dependentDiscounts = orders
                        .SelectMany(o => o.LineItems ?? [])
                        .Where(li => li.LineItemType == LineItemType.Discount && li.DependantLineItemSku == lineItem.Sku)
                        .ToList();

                    foreach (var discount in dependentDiscounts)
                    {
                        var discountOrder = orders.First(o => o.LineItems?.Contains(discount) == true);
                        discountOrder.LineItems?.Remove(discount);
                        db.LineItems.Remove(discount);
                    }

                    var itemOrder = orders.First(o => o.LineItems?.Contains(lineItem) == true);
                    itemOrder.LineItems?.Remove(lineItem);
                    db.LineItems.Remove(lineItem);
                    changes.Add($"Removed {lineItem.Name}");
                }

                // Add custom items - create a new order for custom items
                if (request.CustomItems.Any())
                {
                    // Create a new order for custom items
                    var customOrder = new Order
                    {
                        Id = GuidExtensions.NewSequentialGuid,
                        InvoiceId = invoice.Id,
                        WarehouseId = orders.FirstOrDefault()?.WarehouseId ?? Guid.Empty,
                        ShippingOptionId = orders.FirstOrDefault()?.ShippingOptionId ?? Guid.Empty,
                        ShippingCost = 0,
                        Status = OrderStatus.ReadyToFulfill,
                        LineItems = []
                    };

                    foreach (var customItem in request.CustomItems)
                    {
                        // Determine tax rate from selected tax group
                        decimal taxRate = 0;
                        bool isTaxable = customItem.TaxGroupId.HasValue;
                        string? taxGroupName = null;

                        if (customItem.TaxGroupId.HasValue)
                        {
                            var taxGroup = await db.TaxGroups
                                .AsNoTracking()
                                .FirstOrDefaultAsync(tg => tg.Id == customItem.TaxGroupId.Value, cancellationToken);

                            if (taxGroup != null)
                            {
                                taxRate = taxGroup.TaxPercentage;
                                taxGroupName = taxGroup.Name;
                            }
                            else
                            {
                                logger.LogWarning("Tax group {TaxGroupId} not found for custom item", customItem.TaxGroupId);
                                isTaxable = false;
                            }
                        }

                        var customLineItem = new LineItem
                        {
                            Id = GuidExtensions.NewSequentialGuid,
                            OrderId = customOrder.Id,
                            LineItemType = LineItemType.Custom,
                            Name = customItem.Name,
                            Sku = $"CUSTOM-{DateTime.UtcNow.Ticks}",
                            Amount = customItem.Price,
                            Quantity = customItem.Quantity,
                            IsTaxable = isTaxable,
                            TaxRate = taxRate,
                            ExtendedData = new Dictionary<string, object>
                            {
                                ["IsPhysicalProduct"] = customItem.IsPhysicalProduct,
                                ["TaxGroupId"] = customItem.TaxGroupId?.ToString() ?? string.Empty,
                                ["TaxGroupName"] = taxGroupName ?? string.Empty
                            }
                        };

                        customOrder.LineItems.Add(customLineItem);
                        db.LineItems.Add(customLineItem);
                        changes.Add($"Added custom item: {customItem.Name}");
                    }

                    db.Orders.Add(customOrder);
                    orders.Add(customOrder);
                    changes.Add("Created new order for custom items");
                }

                // Update per-order shipping costs
                foreach (var shippingUpdate in request.OrderShippingUpdates)
                {
                    var order = orders.FirstOrDefault(o => o.Id == shippingUpdate.OrderId);
                    if (order != null && order.ShippingCost != shippingUpdate.ShippingCost)
                    {
                        var oldCost = order.ShippingCost;
                        order.ShippingCost = shippingUpdate.ShippingCost;
                        changes.Add($"Changed shipping for order from {_settings.CurrencySymbol}{oldCost} to {_settings.CurrencySymbol}{shippingUpdate.ShippingCost}");
                    }
                }

                // Recalculate totals using stored line item tax rates
                RecalculateInvoiceTotals(invoice, orders);

                // Add edit note to timeline
                var noteText = BuildEditNote(changes, request.EditReason);
                invoice.Notes.Add(new InvoiceNote
                {
                    DateCreated = DateTime.UtcNow,
                    AuthorId = authorId,
                    Author = authorName,
                    Description = noteText,
                    VisibleToCustomer = false
                });

                invoice.DateUpdated = DateTime.UtcNow;

                await db.SaveChangesAsync(cancellationToken);

                logger.LogInformation("Invoice {InvoiceId} edited: {Changes}", invoiceId, string.Join("; ", changes));

                return OperationResult<EditInvoiceResultDto>.Success(new EditInvoiceResultDto
                {
                    Success = true,
                    Warnings = warnings
                });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to edit invoice {InvoiceId}", invoiceId);
                return OperationResult<EditInvoiceResultDto>.Fail($"Failed to edit invoice: {ex.Message}");
            }
        });

        scope.Complete();
        return result;
    }

    private static (bool canEdit, string? reason) CanEditInvoice(List<Order> orders)
    {
        if (!orders.Any())
        {
            return (true, null);
        }

        var allFulfilled = orders.All(o =>
            o.Status == OrderStatus.Shipped ||
            o.Status == OrderStatus.Completed);

        if (allFulfilled)
        {
            return (false, "Cannot edit a fulfilled invoice. All orders have been shipped or completed.");
        }

        var anyShipped = orders.Any(o =>
            o.Status == OrderStatus.Shipped ||
            o.Status == OrderStatus.PartiallyShipped);

        if (anyShipped)
        {
            return (false, "Cannot edit an invoice with shipped orders.");
        }

        return (true, null);
    }

    private static OrderForEditDto MapOrderForEdit(
        Order order,
        Dictionary<Guid, string> shippingOptionNames,
        Dictionary<Guid, (bool IsTracked, int Available)> stockInfoMap)
    {
        var lineItems = order.LineItems?.ToList() ?? [];
        var productLineItems = lineItems.Where(li => li.LineItemType == LineItemType.Product || li.LineItemType == LineItemType.Custom).ToList();
        var discountLineItems = lineItems.Where(li => li.LineItemType == LineItemType.Discount).ToList();

        return new OrderForEditDto
        {
            Id = order.Id,
            Status = order.Status.ToString(),
            ShippingCost = order.ShippingCost,
            ShippingMethodName = shippingOptionNames.GetValueOrDefault(order.ShippingOptionId),
            LineItems = productLineItems.Select(li => MapLineItemForEdit(li, discountLineItems, stockInfoMap)).ToList()
        };
    }

    private static LineItemForEditDto MapLineItemForEdit(
        LineItem lineItem,
        List<LineItem> allDiscounts,
        Dictionary<Guid, (bool IsTracked, int Available)> stockInfoMap)
    {
        var discounts = allDiscounts
            .Where(d => d.DependantLineItemSku == lineItem.Sku)
            .Select(d => new DiscountLineItemDto
            {
                Id = d.Id,
                Name = d.Name,
                Amount = Math.Abs(d.Amount),
                Reason = d.Name,
                VisibleToCustomer = d.ExtendedData?.TryGetValue("VisibleToCustomer", out var visible) == true && visible is bool b && b
            })
            .ToList();

        // Get stock info if available
        var hasStockInfo = stockInfoMap.TryGetValue(lineItem.Id, out var stockInfo);

        return new LineItemForEditDto
        {
            Id = lineItem.Id,
            OrderId = lineItem.OrderId ?? Guid.Empty,
            Sku = lineItem.Sku,
            Name = lineItem.Name,
            ProductId = lineItem.ProductId,
            Quantity = lineItem.Quantity,
            Amount = lineItem.Amount,
            OriginalAmount = lineItem.OriginalAmount,
            IsTaxable = lineItem.IsTaxable,
            TaxRate = lineItem.TaxRate,
            LineItemType = lineItem.LineItemType.ToString(),
            IsStockTracked = hasStockInfo && stockInfo.IsTracked,
            AvailableStock = hasStockInfo ? stockInfo.Available : null,
            Discounts = discounts
        };
    }

    private static decimal CalculateDiscountAmount(LineItemDiscountDto discount, decimal unitPrice, int quantity)
    {
        return discount.Type switch
        {
            DiscountType.Amount => discount.Value * quantity,
            DiscountType.Percentage => (unitPrice * quantity) * (discount.Value / 100m),
            _ => 0
        };
    }

    private static void RecalculateInvoiceTotals(Invoice invoice, List<Order> orders)
    {
        var allLineItems = orders.SelectMany(o => o.LineItems ?? []).ToList();

        // Calculate subtotal (products + custom items)
        var productItems = allLineItems.Where(li =>
            li.LineItemType == LineItemType.Product ||
            li.LineItemType == LineItemType.Custom);
        var subTotal = productItems.Sum(li => li.Amount * li.Quantity);

        // Apply discounts
        var discountItems = allLineItems.Where(li => li.LineItemType == LineItemType.Discount);
        var discountTotal = discountItems.Sum(li => li.Amount); // Already negative

        // Calculate tax using stored line item tax rates
        // IMPORTANT: We use the stored TaxRate on each line item, NOT the current TaxGroup rate.
        // This ensures historical invoices are not affected by future TaxGroup rate changes.
        decimal tax = 0;
        foreach (var lineItem in allLineItems.Where(li => li.IsTaxable))
        {
            var itemTotal = lineItem.Amount * lineItem.Quantity;
            tax += itemTotal * (lineItem.TaxRate / 100m);
        }

        // Get shipping total
        var shippingTotal = orders.Sum(o => o.ShippingCost);

        // Update invoice
        invoice.SubTotal = subTotal;
        invoice.Discount = Math.Abs(discountTotal);
        invoice.AdjustedSubTotal = subTotal + discountTotal;
        invoice.Tax = Math.Round(tax, 2);
        invoice.Total = invoice.AdjustedSubTotal + invoice.Tax + shippingTotal;
    }

    private static string BuildEditNote(List<string> changes, string? editReason)
    {
        var note = "**Invoice Edited**\n\n";

        if (changes.Any())
        {
            note += "Changes:\n";
            foreach (var change in changes)
            {
                note += $"- {change}\n";
            }
        }

        if (!string.IsNullOrWhiteSpace(editReason))
        {
            note += $"\nReason: {editReason}";
        }

        return note;
    }
}


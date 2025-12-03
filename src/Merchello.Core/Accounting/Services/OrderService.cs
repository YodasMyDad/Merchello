using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Data;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Accounting.Services;

public class OrderService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IShippingService shippingService,
    IInventoryService inventoryService,
    IOrderStatusHandler statusHandler,
    IDeliveryDateService deliveryDateService,
    ILogger<OrderService> logger) : IOrderService
{
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

                    // Map the basket line items to order line items for surcharge calculation
                    List<LineItem> lineItemsForSurcharge = [];
                    foreach (var shippingLineItem in group.LineItems)
                    {
                        var basketLineItem = basket.LineItems.FirstOrDefault(li => li.Id == shippingLineItem.LineItemId);
                        if (basketLineItem != null)
                        {
                            lineItemsForSurcharge.Add(basketLineItem);
                        }
                    }

                    // Calculate delivery date surcharge
                    deliveryDateSurcharge = await deliveryDateService.CalculateDeliveryDateSurchargeAsync(
                        shippingOption,
                        selectedDate,
                        checkoutSession.ShippingAddress,
                        lineItemsForSurcharge,
                        baseShippingCost,
                        cancellationToken);
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
            // Load the order with its line items, shipments, and products
            var order = await db.Orders
                .Include(o => o.LineItems)
                .Include(o => o.Shipments!)
                    .ThenInclude(s => s.LineItems)
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
                .Include(o => o.Invoice)
                .Include(o => o.LineItems)
                .Include(o => o.Shipments!)
                    .ThenInclude(s => s.LineItems)
                .FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken));
        scope.Complete();
        return result;
    }
}

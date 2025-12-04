using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Data;
using Merchello.Core.Locality.Models;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shipping.Dtos;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Accounting.Services;

public class InvoiceService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IShippingService shippingService,
    IInventoryService inventoryService,
    IOrderStatusHandler statusHandler,
    IDeliveryDateService deliveryDateService,
    IPaymentService paymentService,
    ILogger<InvoiceService> logger) : IInvoiceService
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
                .Where(i => !i.IsDeleted && i.DateCreated >= thisMonthStart)
                .ToListAsync(cancellationToken);

            var lastMonthInvoices = await db.Invoices
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
                .Where(i => !i.IsDeleted && i.BillingAddress.Email != null)
                .Select(i => i.BillingAddress.Email)
                .Distinct()
                .ToListAsync(cancellationToken);
            var customerCount = allEmails.Count;

            // New customers this month
            var emailsBeforeThisMonth = await db.Invoices
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
    public async Task<CrudResult<InvoiceNote>> AddNoteAsync(
        Guid invoiceId,
        string text,
        bool visibleToCustomer,
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
                Author = "Staff",
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
                .Where(w => warehouseIds.Contains(w.Id))
                .ToDictionaryAsync(w => w.Id, w => w.Name ?? "Unknown Warehouse", cancellationToken);

            return MapToFulfillmentSummary(invoice, warehouseNames);
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

    private static FulfillmentSummaryDto MapToFulfillmentSummary(Invoice invoice, Dictionary<Guid, string> warehouseNames)
    {
        var orders = invoice.Orders?.ToList() ?? [];

        return new FulfillmentSummaryDto
        {
            InvoiceId = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            OverallStatus = GetFulfillmentStatus(orders),
            Orders = orders.Select(o => MapToOrderFulfillment(o, warehouseNames)).ToList()
        };
    }

    private static OrderFulfillmentDto MapToOrderFulfillment(Order order, Dictionary<Guid, string> warehouseNames)
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

        return new OrderFulfillmentDto
        {
            OrderId = order.Id,
            WarehouseId = order.WarehouseId,
            WarehouseName = warehouseNames.TryGetValue(order.WarehouseId, out var name) ? name : "Unknown Warehouse",
            Status = order.Status,
            DeliveryMethod = "Standard",
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
}


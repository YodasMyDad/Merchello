using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Handlers;
using Merchello.Core.Accounting.Handlers.Interfaces;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Strategies;
using Merchello.Core.Checkout.Strategies.Interfaces;
using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Data;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Discounts.Services.Interfaces;
using Merchello.Core.ExchangeRates.Models;
using Merchello.Core.ExchangeRates.Services.Interfaces;
using Merchello.Core.Locality.Dtos;
using Merchello.Core.Locality.Models;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.Aggregate;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Notifications.Invoice;
using Merchello.Core.Notifications.Order;
using Merchello.Core.Notifications.Shipment;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shipping.Dtos;
using Merchello.Core.Shipping.Factories;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Tax.Providers.Interfaces;
using Merchello.Core.Tax.Providers.Models;
using Merchello.Core.Warehouses.Models;
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
    IProductService productService,
    ICustomerService customerService,
    Lazy<ICheckoutService> checkoutService,
    IOrderGroupingStrategyResolver strategyResolver,
    IMerchelloNotificationPublisher notificationPublisher,
    IExchangeRateCache exchangeRateCache,
    ICurrencyService currencyService,
    ILineItemService lineItemService,
    IDiscountService discountService,
    ITaxService taxService,
    ITaxProviderManager taxProviderManager,
    InvoiceFactory invoiceFactory,
    OrderFactory orderFactory,
    ShipmentFactory shipmentFactory,
    LineItemFactory lineItemFactory,
    IOptions<MerchelloSettings> settings,
    ILogger<InvoiceService> logger) : IInvoiceService
{
    private readonly MerchelloSettings _settings = settings.Value;

    public async Task<Invoice> CreateOrderFromBasketAsync(
        Basket basket,
        CheckoutSession checkoutSession,
        CancellationToken cancellationToken = default)
    {
        // Validate billing email exists
        var billingEmail = checkoutSession.BillingAddress.Email;
        if (string.IsNullOrWhiteSpace(billingEmail))
        {
            throw new InvalidOperationException("Billing email is required to create an invoice.");
        }

        // Get or create customer from billing email
        var customer = await customerService.GetOrCreateByEmailAsync(
            billingEmail,
            checkoutSession.BillingAddress,
            cancellationToken);

        // Automatically apply/refresh automatic discounts before creating the order
        // This ensures discounts are always applied without requiring manual developer intervention
        basket.CustomerId = customer.Id;
        var countryCode = checkoutSession.ShippingAddress.CountryCode ?? "US";
        basket = await checkoutService.Value.RefreshAutomaticDiscountsAsync(basket, countryCode, cancellationToken);

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
            // Generate next invoice number
            var lastInvoice = await db.Invoices
                .OrderByDescending(i => i.DateCreated)
                .Select(i => i.InvoiceNumber)
                .FirstOrDefaultAsync(cancellationToken);

            var nextNumber = 1;
            if (!string.IsNullOrEmpty(lastInvoice))
            {
                var numericPart = lastInvoice.Replace(_settings.InvoiceNumberPrefix, "");
                if (int.TryParse(numericPart, out var lastNumber))
                {
                    nextNumber = lastNumber + 1;
                }
            }
            var invoiceNumber = $"{_settings.InvoiceNumberPrefix}{nextNumber:D4}";

            // Load shipping options to get costs
            var shippingOptionIds = checkoutSession.SelectedShippingOptions.Values.ToList();
            var shippingOptions = await db.ShippingOptions
                .Include(so => so.ShippingCosts)
                .Where(so => shippingOptionIds.Contains(so.Id))
                .ToDictionaryAsync(so => so.Id, cancellationToken);

            // Create the invoice
            var presentmentCurrency = basket.Currency ?? _settings.StoreCurrencyCode;
            var storeCurrency = _settings.StoreCurrencyCode;

            var newInvoice = invoiceFactory.CreateFromBasket(
                basket,
                invoiceNumber,
                checkoutSession.BillingAddress,
                checkoutSession.ShippingAddress,
                presentmentCurrency,
                storeCurrency,
                customer.Id);

            ExchangeRateQuote? pricingQuote = null;
            if (!string.Equals(presentmentCurrency, storeCurrency, StringComparison.OrdinalIgnoreCase))
            {
                pricingQuote = await exchangeRateCache.GetRateQuoteAsync(presentmentCurrency, storeCurrency, cancellationToken);
                if (pricingQuote == null || pricingQuote.Rate <= 0m)
                {
                    throw new InvalidOperationException(
                        $"No exchange rate available to create invoice in '{presentmentCurrency}' (store currency '{storeCurrency}').");
                }

                newInvoice.PricingExchangeRate = pricingQuote.Rate;
                newInvoice.PricingExchangeRateSource = pricingQuote.Source;
                newInvoice.PricingExchangeRateTimestampUtc = pricingQuote.TimestampUtc;
            }

            // Create one order per warehouse shipping group
            List<Order> orders = [];

            // Load products to capture CostOfGoods at order time for profit calculations
            var productIds = basket.LineItems
                .Where(li => li.ProductId.HasValue)
                .Select(li => li.ProductId!.Value)
                .Distinct()
                .ToList();

            var products = productIds.Any()
                ? await db.Products.Where(p => productIds.Contains(p.Id))
                    .ToDictionaryAsync(p => p.Id, cancellationToken)
                : new Dictionary<Guid, Product>();

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
                if (pricingQuote != null)
                {
                    // Configured shipping costs are stored in store currency - convert to presentment.
                    baseShippingCost = currencyService.Round(baseShippingCost / pricingQuote.Rate, presentmentCurrency);
                }

                // Check for delivery date selection
                DateTime? requestedDeliveryDate = null;
                bool? isDeliveryDateGuaranteed = null;
                decimal? deliveryDateSurcharge = null;

                if (checkoutSession.SelectedDeliveryDates.TryGetValue(group.GroupId, out var selectedDate))
                {
                    requestedDeliveryDate = selectedDate;
                    isDeliveryDateGuaranteed = shippingOption.IsDeliveryDateGuaranteed;

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

                    // Get cost of goods from product (captured at order time for profit calculations)
                    var cost = 0m;
                    if (basketLineItem.ProductId.HasValue &&
                        products.TryGetValue(basketLineItem.ProductId.Value, out var product))
                    {
                        cost = product.CostOfGoods;
                    }

                    var orderLineItem = lineItemFactory.CreateForOrder(
                        basketLineItem,
                        shippingLineItem.Quantity,  // Use allocated quantity (not basket quantity)
                        shippingLineItem.Amount,    // Use allocated amount (not basket amount)
                        cost);                      // Captured cost of goods for profit calculations

                    orderLineItems.Add(orderLineItem);

                    // Attach any add-on (custom) items dependent on this product SKU
                    var dependentAddons = basket.LineItems
                        .Where(li => li.LineItemType == LineItemType.Addon && li.DependantLineItemSku == basketLineItem.Sku)
                        .ToList();

                    foreach (var addon in dependentAddons)
                    {
                        // Allocate add-on quantities proportional to this shipment's allocation
                        var addonOrderLine = lineItemFactory.CreateAddonForOrder(addon, shippingLineItem.Quantity);
                        orderLineItems.Add(addonOrderLine);
                    }

                    // Attach any discount line items dependent on this product SKU
                    // Discounts are stored as LineItems with LineItemType.Discount and linked via DependantLineItemSku
                    // Only match if both SKUs are non-null/non-empty to avoid accidentally matching order-level discounts
                    var dependentDiscounts = basket.LineItems
                        .Where(li => li.LineItemType == LineItemType.Discount &&
                                     !string.IsNullOrEmpty(li.DependantLineItemSku) &&
                                     !string.IsNullOrEmpty(basketLineItem.Sku) &&
                                     li.DependantLineItemSku == basketLineItem.Sku)
                        .ToList();

                    foreach (var discountLineItem in dependentDiscounts)
                    {
                        // Scale discount proportionally if quantity was split across warehouses
                        var discountOrderLine = lineItemFactory.CreateDiscountForOrder(
                            discountLineItem,
                            shippingLineItem.Quantity,
                            basketLineItem.Quantity);
                        orderLineItems.Add(discountOrderLine);
                    }
                }

                var order = orderFactory.Create(
                    newInvoice.Id,
                    group.WarehouseId,
                    selectedShippingOptionId,
                    totalShippingCost);
                order.RequestedDeliveryDate = requestedDeliveryDate;
                order.IsDeliveryDateGuaranteed = isDeliveryDateGuaranteed;
                order.DeliveryDateSurcharge = deliveryDateSurcharge;
                order.LineItems = orderLineItems;

                orders.Add(order);
            }

            if (!orders.Any())
            {
                throw new InvalidOperationException("No orders were created from basket. Check shipping selections.");
            }

            // Add order-level discounts (not linked to specific products) to the first order
            // These are discounts like "10% off entire order" that apply to the whole basket
            var orderLevelDiscounts = basket.LineItems
                .Where(li => li.LineItemType == LineItemType.Discount &&
                             string.IsNullOrEmpty(li.DependantLineItemSku))
                .ToList();

            var firstOrderLineItems = orders[0].LineItems;
            if (orderLevelDiscounts.Count > 0 && firstOrderLineItems != null)
            {
                foreach (var discountLineItem in orderLevelDiscounts)
                {
                    var orderDiscountLine = lineItemFactory.CreateDiscountForOrder(
                        discountLineItem,
                        allocatedQuantity: 1,
                        originalQuantity: 1);
                    firstOrderLineItems.Add(orderDiscountLine);
                }
            }

            newInvoice.Orders = orders;

            // Recalculate invoice totals from actual order line items and shipping
            RecalculateInvoiceTotals(newInvoice, orders);
            ApplyPricingRateToStoreAmounts(newInvoice, orders);

            // Save invoice and orders to database
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
                    // Stock reservation failed - throw exception
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

            logger.LogInformation("Created invoice {InvoiceId} with {OrderCount} orders from {GroupCount} warehouse groups",
                newInvoice.Id, orders.Count, shippingResult.WarehouseGroups.Count);

            return newInvoice;
        });

        scope.Complete();

        return invoice;
    }

    private decimal CalculateShippingCost(ShippingOption shippingOption, Merchello.Core.Locality.Models.Address shippingAddress)
    {
        var countryCode = shippingAddress.CountryCode;
        if (string.IsNullOrEmpty(countryCode))
        {
            logger.LogWarning("No country code provided for shipping cost calculation for option {OptionId}",
                shippingOption.Id);
            return 0;
        }

        var stateOrProvinceCode = shippingAddress.CountyState?.RegionCode;
        var cost = shippingService.GetShippingCostForDestination(
            shippingOption,
            countryCode,
            stateOrProvinceCode);

        if (cost.HasValue)
        {
            return cost.Value;
        }

        logger.LogWarning("No shipping cost configured for option {OptionId} to {Country}/{State}",
            shippingOption.Id, countryCode, stateOrProvinceCode);

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

            // Update order status based on shipment completion (exclude discount line items)
            var totalOrderQuantity = order.LineItems?
                .Where(li => li.LineItemType != LineItemType.Discount)
                .Sum(li => li.Quantity) ?? 0;
            var previouslyShippedQuantity = order.Shipments?
                .SelectMany(s => s.LineItems ?? [])
                .Where(li => li.LineItemType != LineItemType.Discount)
                .Sum(li => li.Quantity) ?? 0;
            var nowShippedQuantity = newShipments
                .SelectMany(s => s.LineItems ?? [])
                .Where(li => li.LineItemType != LineItemType.Discount)
                .Sum(li => li.Quantity);
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

            // Check if all orders on the invoice are now cancelled - auto-cancel invoice if so
            var invoice = await db.Invoices
                .Include(i => i.Orders)
                .FirstOrDefaultAsync(i => i.Id == order.InvoiceId, cancellationToken);

            if (invoice != null && !invoice.IsCancelled)
            {
                var hasActiveOrders = (invoice.Orders ?? [])
                    .Any(o => o.Status != OrderStatus.Cancelled);

                if (!hasActiveOrders)
                {
                    invoice.IsCancelled = true;
                    invoice.DateCancelled = DateTime.UtcNow;
                    invoice.CancellationReason = $"All orders cancelled. Last reason: {reason}";
                    invoice.CancelledBy = "System";

                    invoice.Notes.Add(new InvoiceNote
                    {
                        DateCreated = DateTime.UtcNow,
                        Author = "System",
                        VisibleToCustomer = false,
                        Description = "Invoice auto-cancelled: all orders have been cancelled"
                    });

                    await db.SaveChangesAsync(cancellationToken);

                    logger.LogInformation("Invoice {InvoiceId} auto-cancelled - all orders cancelled", invoice.Id);
                }
            }

            result.ResultObject = true;
        });

        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<CrudResult<int>> CancelInvoiceAsync(
        CancelInvoiceParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<int>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            // Load invoice with orders and line items
            var invoice = await db.Invoices
                .Include(i => i.Orders!)
                    .ThenInclude(o => o.LineItems)
                .FirstOrDefaultAsync(i => i.Id == parameters.InvoiceId, cancellationToken);

            if (invoice == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = $"Invoice {parameters.InvoiceId} not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            // Check if already cancelled
            if (invoice.IsCancelled)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Invoice is already cancelled",
                    ResultMessageType = ResultMessageType.Warning
                });
                result.ResultObject = 0;
                return;
            }

            // Check if already deleted
            if (invoice.IsDeleted)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Cannot cancel a deleted invoice",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            // Get orders that can be cancelled (not shipped or completed)
            var cancellableOrders = (invoice.Orders ?? [])
                .Where(o => o.Status != OrderStatus.Shipped &&
                            o.Status != OrderStatus.Completed &&
                            o.Status != OrderStatus.Cancelled)
                .ToList();

            // Publish cancelling notification (allows handlers to cancel the operation)
            var cancellingNotification = new InvoiceCancellingNotification(invoice, parameters.Reason);
            await notificationPublisher.PublishAsync(cancellingNotification, cancellationToken);

            if (cancellingNotification.Cancel)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = cancellingNotification.CancelReason ?? "Invoice cancellation was prevented by a handler",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            // Cancel each cancellable order (releases stock)
            var cancelledCount = 0;
            foreach (var order in cancellableOrders)
            {
                // Release stock reservations
                foreach (var lineItem in (order.LineItems ?? []).Where(li => li.ProductId.HasValue))
                {
                    var releaseResult = await inventoryService.ReleaseReservationAsync(
                        lineItem.ProductId!.Value,
                        order.WarehouseId,
                        lineItem.Quantity,
                        cancellationToken);

                    if (!releaseResult.ResultObject)
                    {
                        logger.LogWarning(
                            "Failed to release stock for line item {LineItemId} in order {OrderId} during invoice cancellation",
                            lineItem.Id, order.Id);
                    }
                }

                // Update order status
                var canTransition = await statusHandler.CanTransitionAsync(order, OrderStatus.Cancelled, cancellationToken);
                if (canTransition)
                {
                    var oldStatus = order.Status;
                    await statusHandler.OnStatusChangingAsync(order, oldStatus, OrderStatus.Cancelled, cancellationToken);
                    order.Status = OrderStatus.Cancelled;
                    order.CancellationReason = $"Invoice cancelled: {parameters.Reason}";
                    order.DateUpdated = DateTime.UtcNow;
                    await statusHandler.OnStatusChangedAsync(order, oldStatus, OrderStatus.Cancelled, cancellationToken);
                    cancelledCount++;
                }
            }

            // Update invoice cancellation fields
            invoice.IsCancelled = true;
            invoice.DateCancelled = DateTime.UtcNow;
            invoice.CancellationReason = parameters.Reason;
            invoice.CancelledBy = parameters.AuthorName ?? "System";
            invoice.DateUpdated = DateTime.UtcNow;

            // Add cancellation note to invoice timeline
            invoice.Notes.Add(new InvoiceNote
            {
                DateCreated = DateTime.UtcNow,
                AuthorId = parameters.AuthorId,
                Author = parameters.AuthorName ?? "System",
                VisibleToCustomer = false,
                Description = $"Invoice cancelled: {parameters.Reason}. {cancelledCount} order(s) cancelled."
            });

            await db.SaveChangesAsync(cancellationToken);

            logger.LogInformation(
                "Invoice {InvoiceId} cancelled. Reason: {Reason}. Orders cancelled: {Count}",
                parameters.InvoiceId, parameters.Reason, cancelledCount);

            // Publish cancelled notification
            await notificationPublisher.PublishAsync(
                new InvoiceCancelledNotification(invoice, parameters.Reason, cancelledCount),
                cancellationToken);

            result.ResultObject = cancelledCount;
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

            // Apply cancellation status filter
            if (parameters.CancellationStatusFilter == InvoiceCancellationStatusFilter.Active)
            {
                query = query.Where(i => !i.IsCancelled);
            }
            else if (parameters.CancellationStatusFilter == InvoiceCancellationStatusFilter.Cancelled)
            {
                query = query.Where(i => i.IsCancelled);
            }
            // InvoiceCancellationStatusFilter.All - no filter applied

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
                    var statusDetails = paymentService.CalculatePaymentStatus(new CalculatePaymentStatusParameters
                    {
                        Payments = payments,
                        InvoiceTotal = invoice.Total,
                        CurrencyCode = invoice.CurrencyCode
                    });

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
                var totalCount = await query.CountAsync(cancellationToken);

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
            InvoiceOrderBy.TotalAsc => query.OrderBy(i => i.TotalInStoreCurrency ?? i.Total),
            InvoiceOrderBy.TotalDesc => query.OrderByDescending(i => i.TotalInStoreCurrency ?? i.Total),
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
            var revenueThisMonth = thisMonthInvoices.Sum(i => i.TotalInStoreCurrency ?? i.Total);
            var revenueLastMonth = lastMonthInvoices.Sum(i => i.TotalInStoreCurrency ?? i.Total);
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
                StoreCurrencyCode = _settings.StoreCurrencyCode,
                StoreCurrencySymbol = currencyService.GetCurrency(_settings.StoreCurrencyCode).Symbol,
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
                var paymentDetails = paymentService.CalculatePaymentStatus(new CalculatePaymentStatusParameters
                {
                    Payments = payments,
                    InvoiceTotal = invoice.Total,
                    CurrencyCode = invoice.CurrencyCode
                });
                var shippingTotal = invoice.Orders?.Sum(o => o.ShippingCost) ?? 0;
                var shippingTotalInStoreCurrency = invoice.Orders?.Sum(o => o.ShippingCostInStoreCurrency ?? o.ShippingCost) ?? 0;

                result.Add(new OrderExportItemDto
                {
                    InvoiceNumber = invoice.InvoiceNumber,
                    InvoiceDate = invoice.DateCreated,
                    PaymentStatus = paymentDetails.StatusDisplay,
                    BillingName = invoice.BillingAddress?.Name ?? string.Empty,
                    SubTotal = invoice.SubTotal,
                    Tax = invoice.Tax,
                    Shipping = shippingTotal,
                    Total = invoice.Total,
                    CurrencyCode = invoice.CurrencyCode,
                    StoreCurrencyCode = invoice.StoreCurrencyCode,
                    SubTotalInStoreCurrency = invoice.SubTotalInStoreCurrency,
                    TaxInStoreCurrency = invoice.TaxInStoreCurrency,
                    ShippingInStoreCurrency = shippingTotalInStoreCurrency,
                    TotalInStoreCurrency = invoice.TotalInStoreCurrency
                });
            }

            return result;
        });
        scope.Complete();

        return exportItems;
    }

    /// <inheritdoc />
    public async Task<CrudResult<InvoiceNote>> AddNoteAsync(
        AddInvoiceNoteParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var invoiceId = parameters.InvoiceId;
        var text = parameters.Text;
        var visibleToCustomer = parameters.VisibleToCustomer;
        var authorId = parameters.AuthorId;
        var authorName = parameters.AuthorName;

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
    public async Task<CrudResult<string?>> UpdatePurchaseOrderAsync(
        Guid invoiceId,
        string? purchaseOrder,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<string?>();

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

            invoice.PurchaseOrder = purchaseOrder;
            invoice.DateUpdated = DateTime.UtcNow;

            await db.SaveChangesAsync(cancellationToken);
            result.ResultObject = purchaseOrder;
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

            // Create shipment line items (skip discount line items - they shouldn't be shipped)
            List<LineItem> shipmentLineItems = [];
            foreach (var (lineItemId, quantity) in parameters.LineItems)
            {
                var sourceLineItem = order.LineItems!.First(li => li.Id == lineItemId);

                // Skip discount line items - they shouldn't be shipped
                if (sourceLineItem.LineItemType == LineItemType.Discount)
                    continue;

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
            var shipment = shipmentFactory.Create(
                order,
                order.WarehouseId,
                order.Invoice?.ShippingAddress ?? new Address(),
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
                return;
            }

            db.Shipments.Add(shipment);

            // Update order status (exclude discount line items from calculations)
            var totalOrdered = order.LineItems?
                .Where(li => li.LineItemType != LineItemType.Discount)
                .Sum(li => li.Quantity) ?? 0;
            var totalShipped = (order.Shipments?
                .SelectMany(s => s.LineItems ?? [])
                .Where(li => li.LineItemType != LineItemType.Discount)
                .Sum(li => li.Quantity) ?? 0)
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
            // Load shipment with order and all sibling shipments for delivery status check
            var shipment = await db.Shipments
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
                return;
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

    private static FulfillmentSummaryDto MapToFulfillmentSummary(Invoice invoice, Dictionary<Guid, string> warehouseNames, Dictionary<Guid, string> shippingOptionNames, Dictionary<Guid, string?> productImages)
    {
        var orders = invoice.Orders?.ToList() ?? [];

        return new FulfillmentSummaryDto
        {
            InvoiceId = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            OverallStatus = GetFulfillmentStatus(orders),
            Orders = orders.Select(o => MapToOrderFulfillment(o, warehouseNames, shippingOptionNames, productImages)).ToList()
        };
    }

    private static OrderFulfillmentDto MapToOrderFulfillment(Order order, Dictionary<Guid, string> warehouseNames, Dictionary<Guid, string> shippingOptionNames, Dictionary<Guid, string?> productImages)
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
            Carrier = shipment.Carrier,
            TrackingNumber = shipment.TrackingNumber,
            TrackingUrl = shipment.TrackingUrl,
            DateCreated = shipment.DateCreated,
            ActualDeliveryDate = shipment.ActualDeliveryDate,
            LineItems = shipment.LineItems?
                .Where(li => li.LineItemType != LineItemType.Discount)
                .Select(li => new ShipmentLineItemDto
                {
                    Id = Guid.NewGuid(),
                    LineItemId = li.Id,
                    Sku = li.Sku,
                    Name = li.Name,
                    Quantity = li.Quantity,
                    ImageUrl = li.ProductId.HasValue && productImages.TryGetValue(li.ProductId.Value, out var img) ? img : null
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

    private static string GetFulfillmentStatusCssClass(List<Order> orders)
    {
        return GetFulfillmentStatus(orders).ToLowerInvariant();
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
    public async Task<int> GetInvoiceCountAsync(CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var count = await scope.ExecuteWithContextAsync(async db =>
            await db.Invoices
                .AsNoTracking()
                .CountAsync(i => !i.IsDeleted, cancellationToken));
        scope.Complete();

        return count;
    }

    /// <inheritdoc />
    public async Task<List<Invoice>> GetInvoicesByBillingEmailAsync(
        string email,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return [];
        }

        using var scope = efCoreScopeProvider.CreateScope();
        var invoices = await scope.ExecuteWithContextAsync(async db =>
            await db.Invoices
                .AsNoTracking()
                .Include(i => i.Orders!)
                    .ThenInclude(o => o.LineItems)
                .Include(i => i.Payments)
                .Where(i => !i.IsDeleted && i.BillingAddress.Email == email)
                .OrderByDescending(i => i.DateCreated)
                .ToListAsync(cancellationToken));
        scope.Complete();

        return invoices;
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
            var currencyCode = string.IsNullOrWhiteSpace(invoice.CurrencyCode) ? _settings.StoreCurrencyCode : invoice.CurrencyCode;

            // Get shipping option names for orders
            var shippingOptionIds = orders.Select(o => o.ShippingOptionId).Distinct().ToList();
            var shippingOptionNames = await db.ShippingOptions
                .Where(so => shippingOptionIds.Contains(so.Id))
                .ToDictionaryAsync(so => so.Id, so => so.Name ?? "Unknown", cancellationToken);

            // Build stock availability map for all product line items
            Dictionary<Guid, (bool IsTracked, int Available)> stockInfoMap = [];
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

            // Calculate totals using centralized calculation method
            var allLineItems = orders.SelectMany(o => o.LineItems ?? []).ToList();
            var shippingTotal = currencyService.Round(orders.Sum(o => o.ShippingCost), currencyCode);

            // Use centralized calculation method - handles before-tax and after-tax discounts
            var calcResult = lineItemService.CalculateFromLineItems(new CalculateLineItemsParameters
            {
                LineItems = allLineItems,
                ShippingAmount = shippingTotal,
                DefaultTaxRate = 0,
                CurrencyCode = currencyCode,
                IsShippingTaxable = false
            });
            var subTotal = calcResult.SubTotal;
            var discountTotal = calcResult.Discount;
            var adjustedSubTotal = calcResult.AdjustedSubTotal;
            var tax = calcResult.Tax;
            var total = calcResult.Total;

            // Extract order-level discounts for display
            var productItems = allLineItems.Where(li =>
                li.LineItemType == LineItemType.Product || li.LineItemType == LineItemType.Custom || li.LineItemType == LineItemType.Addon).ToList();
            var discountItems = allLineItems.Where(li => li.LineItemType == LineItemType.Discount).ToList();
            var productSkus = productItems.Select(p => p.Sku).Where(s => !string.IsNullOrEmpty(s)).ToHashSet();
            var orderLevelDiscounts = discountItems
                .Where(d => string.IsNullOrEmpty(d.DependantLineItemSku) ||
                            !productSkus.Contains(d.DependantLineItemSku))
                .Select(MapDiscountLineItem)
                .ToList();

            return new InvoiceForEditDto
            {
                Id = invoice.Id,
                InvoiceNumber = invoice.InvoiceNumber,
                FulfillmentStatus = GetFulfillmentStatus(orders),
                FulfillmentStatusCssClass = GetFulfillmentStatusCssClass(orders),
                CanEdit = canEdit,
                CannotEditReason = cannotEditReason,
                CurrencySymbol = invoice.CurrencySymbol,
                CurrencyCode = currencyCode,
                Orders = orders.Select(o => MapOrderForEdit(o, shippingOptionNames, stockInfoMap)).ToList(),
                OrderDiscounts = orderLevelDiscounts,
                ShippingCountryCode = invoice.ShippingAddress.CountryCode,
                ShippingRegion = invoice.ShippingAddress.CountyState.RegionCode,
                SubTotal = subTotal,
                DiscountTotal = discountTotal,
                AdjustedSubTotal = adjustedSubTotal,
                ShippingTotal = shippingTotal,
                Tax = tax,
                Total = total
            };
        });
        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<PreviewEditResultDto?> PreviewInvoiceEditAsync(
        Guid invoiceId,
        EditInvoiceDto request,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var invoice = await db.Invoices
                .Include(i => i.Orders)!
                .ThenInclude(o => o.LineItems)
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.Id == invoiceId && !i.IsDeleted, cancellationToken);

            if (invoice == null) return null;

            var currencyCode = string.IsNullOrWhiteSpace(invoice.CurrencyCode) ? _settings.StoreCurrencyCode : invoice.CurrencyCode;
            var orders = invoice.Orders?.ToList() ?? [];
            List<string> warnings = [];

            // Get tax groups for custom items
            var taxGroupIds = request.CustomItems
                .Where(c => c.TaxGroupId.HasValue)
                .Select(c => c.TaxGroupId!.Value)
                .Distinct()
                .ToList();

            var taxGroups = await db.TaxGroups
                .Where(tg => taxGroupIds.Contains(tg.Id))
                .ToDictionaryAsync(tg => tg.Id, tg => tg.TaxPercentage, cancellationToken);

            // Build stock availability map for all product line items
            Dictionary<Guid, (bool IsTracked, int Available)> stockInfoMap = [];
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

            // Build virtual line items representing the proposed state
            List<VirtualLineItem> virtualLineItems = [];

            // Process existing line items
            foreach (var order in orders)
            {
                foreach (var lineItem in order.LineItems ?? [])
                {
                    // Skip discount line items - we'll calculate discounts separately
                    if (lineItem.LineItemType == LineItemType.Discount) continue;

                    // Check if item is being removed
                    var isRemoved = request.RemovedLineItems.Any(r => r.Id == lineItem.Id);
                    if (isRemoved) continue;

                    // Check for quantity/discount updates
                    var editItem = request.LineItems.FirstOrDefault(e => e.Id == lineItem.Id);
                    var quantity = editItem?.Quantity ?? lineItem.Quantity;
                    var discount = editItem?.Discount;

                    // Check if there's an existing discount on this line item
                    var existingDiscount = orders
                        .SelectMany(o => o.LineItems ?? [])
                        .FirstOrDefault(li =>
                            li.LineItemType == LineItemType.Discount &&
                            li.DependantLineItemSku == lineItem.Sku);

                    // Use new discount if provided, otherwise use existing
                    LineItemDiscountDto? effectiveDiscount = discount;
                    if (effectiveDiscount == null && existingDiscount != null)
                    {
                        // Convert existing discount to DTO format
                        var discountTypeStr = existingDiscount.ExtendedData?.GetValueOrDefault(Constants.ExtendedDataKeys.DiscountValueType)?.ToString();
                        var discountValueRaw = existingDiscount.ExtendedData?.GetValueOrDefault(Constants.ExtendedDataKeys.DiscountValue);

                        // Handle JsonElement conversion (EF Core stores Dictionary<string, object> as JSON)
                        decimal discountValue;
                        if (discountValueRaw is System.Text.Json.JsonElement jsonElement)
                        {
                            discountValue = jsonElement.GetDecimal();
                        }
                        else if (discountValueRaw != null)
                        {
                            discountValue = Convert.ToDecimal(discountValueRaw);
                        }
                        else
                        {
                            discountValue = Math.Abs(existingDiscount.Amount);
                        }

                        effectiveDiscount = new LineItemDiscountDto
                        {
                            Type = discountTypeStr switch
                            {
                                "Percentage" => DiscountValueType.Percentage,
                                "Free" => DiscountValueType.Free,
                                _ => DiscountValueType.FixedAmount
                            },
                            Value = discountValue
                        };
                    }

                    // Get stock info for this line item
                    var hasStockInfo = stockInfoMap.TryGetValue(lineItem.Id, out var stockInfo);

                    virtualLineItems.Add(new VirtualLineItem
                    {
                        Id = lineItem.Id,
                        Amount = lineItem.Amount,
                        Quantity = quantity,
                        IsTaxable = lineItem.IsTaxable,
                        TaxRate = lineItem.TaxRate,
                        Discount = effectiveDiscount,
                        // For calculating HasInsufficientStock
                        OriginalQuantity = lineItem.Quantity,
                        IsStockTracked = hasStockInfo && stockInfo.IsTracked,
                        AvailableStock = hasStockInfo ? stockInfo.Available : 0,
                        // For calculating CanAddDiscount
                        HadOriginalDiscount = existingDiscount != null
                    });
                }
            }

            // Add custom items
            foreach (var customItem in request.CustomItems)
            {
                var taxRate = customItem.TaxGroupId.HasValue && taxGroups.TryGetValue(customItem.TaxGroupId.Value, out var rate)
                    ? rate
                    : 0m;

                virtualLineItems.Add(new VirtualLineItem
                {
                    Id = Guid.NewGuid(),
                    Amount = customItem.Price,
                    Quantity = customItem.Quantity,
                    IsTaxable = customItem.TaxGroupId.HasValue,
                    TaxRate = taxRate,
                    Discount = null
                });
            }

            // Calculate order discounts (coupons, etc.) - excluding removed ones
            var orderDiscountTotal = 0m;
            foreach (var order in orders)
            {
                var orderDiscounts = (order.LineItems ?? [])
                    .Where(li =>
                        li.LineItemType == LineItemType.Discount &&
                        string.IsNullOrEmpty(li.DependantLineItemSku) &&
                        !request.RemovedOrderDiscounts.Contains(li.Id))
                    .ToList();

                orderDiscountTotal += currencyService.Round(Math.Abs(orderDiscounts.Sum(d => d.Amount)), currencyCode);
            }

            // Store new order discounts - percentage ones will be calculated after subtotal is known
            var newOrderAmountDiscounts = request.OrderDiscounts
                .Where(d => d.Type == DiscountValueType.FixedAmount)
                .Sum(d => d.Value);
            orderDiscountTotal += newOrderAmountDiscounts;

            // Calculate shipping total
            var shippingTotal = 0m;
            foreach (var order in orders)
            {
                var shippingUpdate = request.OrderShippingUpdates.FirstOrDefault(u => u.OrderId == order.Id);
                shippingTotal += shippingUpdate?.ShippingCost ?? order.ShippingCost;
            }
            shippingTotal = currencyService.Round(shippingTotal, currencyCode);

            // Calculate subtotal and line item discounts
            var subTotal = 0m;
            var lineItemDiscountTotal = 0m;
            List<LineItemPreviewDto> lineItemPreviews = [];

            foreach (var item in virtualLineItems)
            {
                var itemTotal = currencyService.Round(item.Amount * item.Quantity, currencyCode);
                subTotal += itemTotal;

                // Calculate discount for this item
                var discountAmount = 0m;
                if (item.Discount != null)
                {
                    if (item.Discount.Type == DiscountValueType.Percentage)
                    {
                        discountAmount = currencyService.Round(itemTotal * (item.Discount.Value / 100m), currencyCode);
                    }
                    else
                    {
                        discountAmount = currencyService.Round(item.Discount.Value * item.Quantity, currencyCode);
                    }

                    // Cap discount at item total
                    if (discountAmount > itemTotal)
                    {
                        warnings.Add($"Discount capped at item value");
                        discountAmount = itemTotal;
                    }
                }

                lineItemDiscountTotal += discountAmount;

                // Calculate tax for this item
                var taxableAmount = Math.Max(0, itemTotal - discountAmount);

                // Pro-rate order-level discount to this item
                if (orderDiscountTotal > 0 && subTotal > 0 && item.IsTaxable)
                {
                    var proportion = itemTotal / subTotal;
                    var proRatedOrderDiscount = currencyService.Round(orderDiscountTotal * proportion, currencyCode);
                    taxableAmount = Math.Max(0, taxableAmount - proRatedOrderDiscount);
                }

                var taxAmount = 0m;
                if (item.IsTaxable && !request.ShouldRemoveTax)
                {
                    taxAmount = currencyService.Round(taxableAmount * (item.TaxRate / 100m), currencyCode);
                }

                // Calculate discounted unit price
                var discountedUnitPrice = item.Amount;
                if (item.Discount != null && item.Discount.Value > 0)
                {
                    if (item.Discount.Type == DiscountValueType.Percentage)
                    {
                        discountedUnitPrice = currencyService.Round(item.Amount * (1 - item.Discount.Value / 100m), currencyCode);
                    }
                    else
                    {
                        discountedUnitPrice = Math.Max(0, currencyService.Round(item.Amount - item.Discount.Value, currencyCode));
                    }
                }

                // Calculate HasInsufficientStock: quantity increased beyond available stock
                var qtyIncrease = item.Quantity - item.OriginalQuantity;
                var hasInsufficientStock = qtyIncrease > 0 &&
                    item.IsStockTracked &&
                    qtyIncrease > item.AvailableStock;

                // Calculate CanAddDiscount: can't add new discount if original was removed
                // (if had original discount and it's now null, user can only remove, not replace)
                var hasCurrentDiscount = item.Discount != null;
                var canAddDiscount = !item.HadOriginalDiscount || hasCurrentDiscount;

                lineItemPreviews.Add(new LineItemPreviewDto
                {
                    Id = item.Id,
                    CalculatedTotal = currencyService.Round(itemTotal - discountAmount, currencyCode),
                    DiscountedUnitPrice = discountedUnitPrice,
                    DiscountAmount = discountAmount,
                    TaxAmount = taxAmount,
                    HasInsufficientStock = hasInsufficientStock,
                    CanAddDiscount = canAddDiscount
                });
            }

            // Calculate new percentage order discounts now that we have subtotal
            var newOrderPercentageDiscounts = 0m;
            foreach (var newDiscount in request.OrderDiscounts.Where(d => d.Type == DiscountValueType.Percentage))
            {
                var percentageAmount = currencyService.Round(subTotal * (newDiscount.Value / 100m), currencyCode);
                newOrderPercentageDiscounts += percentageAmount;
            }
            orderDiscountTotal += newOrderPercentageDiscounts;

            // Cap total discount at subtotal
            var rawDiscountTotal = lineItemDiscountTotal + orderDiscountTotal;
            var discountTotal = Math.Min(rawDiscountTotal, subTotal);
            if (rawDiscountTotal > subTotal)
            {
                warnings.Add("Total discount capped at subtotal to prevent negative total");
            }

            var adjustedSubTotal = currencyService.Round(Math.Max(0, subTotal - discountTotal), currencyCode);

            // Calculate tax - needs to be recalculated properly with pro-rating
            var tax = 0m;
            if (!request.ShouldRemoveTax)
            {
                var totalTaxableAmount = virtualLineItems
                    .Where(li => li.IsTaxable)
                    .Sum(li => currencyService.Round(li.Amount * li.Quantity, currencyCode));

                foreach (var item in virtualLineItems.Where(li => li.IsTaxable))
                {
                    var itemTotal = currencyService.Round(item.Amount * item.Quantity, currencyCode);

                    // Calculate line item discount
                    var itemDiscountAmount = 0m;
                    if (item.Discount != null)
                    {
                        if (item.Discount.Type == DiscountValueType.Percentage)
                        {
                            itemDiscountAmount = currencyService.Round(itemTotal * (item.Discount.Value / 100m), currencyCode);
                        }
                        else
                        {
                            itemDiscountAmount = currencyService.Round(item.Discount.Value * item.Quantity, currencyCode);
                        }
                        itemDiscountAmount = Math.Min(itemDiscountAmount, itemTotal);
                    }

                    // Pro-rate order discount
                    var proRatedOrderDiscount = 0m;
                    if (orderDiscountTotal > 0 && totalTaxableAmount > 0)
                    {
                        var proportion = itemTotal / totalTaxableAmount;
                        proRatedOrderDiscount = currencyService.Round(orderDiscountTotal * proportion, currencyCode);
                    }

                    var taxableAmount = Math.Max(0, itemTotal - itemDiscountAmount - proRatedOrderDiscount);
                    tax += currencyService.Round(taxableAmount * (item.TaxRate / 100m), currencyCode);
                }
            }

            tax = currencyService.Round(tax, currencyCode);
            var total = currencyService.Round(adjustedSubTotal + tax + shippingTotal, currencyCode);

            return new PreviewEditResultDto
            {
                CurrencyCode = currencyCode,
                CurrencySymbol = invoice.CurrencySymbol,
                StoreCurrencyCode = invoice.StoreCurrencyCode,
                StoreCurrencySymbol = currencyService.GetCurrency(invoice.StoreCurrencyCode).Symbol,
                PricingExchangeRate = invoice.PricingExchangeRate,
                SubTotal = currencyService.Round(subTotal, currencyCode),
                DiscountTotal = currencyService.Round(discountTotal, currencyCode),
                AdjustedSubTotal = adjustedSubTotal,
                ShippingTotal = shippingTotal,
                Tax = tax,
                Total = total,
                TotalInStoreCurrency = !string.Equals(invoice.CurrencyCode, invoice.StoreCurrencyCode, StringComparison.OrdinalIgnoreCase) &&
                                       invoice.PricingExchangeRate.HasValue
                    ? currencyService.Round(total * invoice.PricingExchangeRate.Value, invoice.StoreCurrencyCode)
                    : null,
                LineItems = lineItemPreviews,
                Warnings = warnings
            };
        });

        scope.Complete();
        return result;
    }

    // Helper class for preview calculations
    private class VirtualLineItem
    {
        public Guid Id { get; set; }
        public decimal Amount { get; set; }
        public int Quantity { get; set; }
        public bool IsTaxable { get; set; }
        public decimal TaxRate { get; set; }
        public LineItemDiscountDto? Discount { get; set; }

        // For calculating HasInsufficientStock
        public int OriginalQuantity { get; set; }
        public bool IsStockTracked { get; set; }
        public int AvailableStock { get; set; }

        // For calculating CanAddDiscount
        public bool HadOriginalDiscount { get; set; }
    }

    /// <inheritdoc />
    public async Task<OperationResult<EditInvoiceResultDto>> EditInvoiceAsync(
        EditInvoiceParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var invoiceId = parameters.InvoiceId;
        var request = parameters.Request;
        var authorId = parameters.AuthorId;
        var authorName = parameters.AuthorName;

        List<string> changes = [];
        List<string> warnings = [];

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

            if (!string.IsNullOrWhiteSpace(invoice.CurrencyCode) &&
                !string.IsNullOrWhiteSpace(invoice.StoreCurrencyCode) &&
                !string.Equals(invoice.CurrencyCode, invoice.StoreCurrencyCode, StringComparison.OrdinalIgnoreCase) &&
                !invoice.PricingExchangeRate.HasValue)
            {
                return OperationResult<EditInvoiceResultDto>.Fail(
                    "Cannot edit a multi-currency invoice without a locked pricing exchange rate. This is required for auditability.");
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
                        else if (qtyDiff < 0 && lineItem.ProductId.HasValue && editItem.ShouldReturnToStock)
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

                        // Cascade quantity change to add-on children
                        var addonChildren = orders
                            .SelectMany(o => o.LineItems ?? [])
                            .Where(li => li.LineItemType == LineItemType.Addon && li.DependantLineItemSku == lineItem.Sku)
                            .ToList();

                        foreach (var addonChild in addonChildren)
                        {
                            addonChild.Quantity = newQty;
                            addonChild.DateUpdated = DateTime.UtcNow;
                        }
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
                                IsTaxable = false, // Discounts should not be taxable
                                TaxRate = 0,
                                ExtendedData = new Dictionary<string, object>
                                {
                                    [Constants.ExtendedDataKeys.DiscountValueType] = editItem.Discount.Type.ToString(),
                                    [Constants.ExtendedDataKeys.DiscountValue] = editItem.Discount.Value,
                                    [Constants.ExtendedDataKeys.VisibleToCustomer] = editItem.Discount.IsVisibleToCustomer
                                }
                            };

                            order2.LineItems ??= [];
                            order2.LineItems.Add(discountLineItem);
                            db.LineItems.Add(discountLineItem);

                            var discountDisplay = editItem.Discount.Type == DiscountValueType.Percentage
                                ? $"{editItem.Discount.Value}%"
                                : $"{invoice.CurrencySymbol}{editItem.Discount.Value}";
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
                    if (removal.ShouldReturnToStock && lineItem.ProductId.HasValue)
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
                    else if (!removal.ShouldReturnToStock && lineItem.ProductId.HasValue)
                    {
                        changes.Add($"Removed {lineItem.Name} (stock not returned - marked as damaged/faulty)");
                    }

                    // Remove any dependent discounts and add-ons
                    var dependentItems = orders
                        .SelectMany(o => o.LineItems ?? [])
                        .Where(li => (li.LineItemType == LineItemType.Discount || li.LineItemType == LineItemType.Addon)
                                     && li.DependantLineItemSku == lineItem.Sku)
                        .ToList();

                    foreach (var dependentItem in dependentItems)
                    {
                        var dependentOrder = orders.First(o => o.LineItems?.Contains(dependentItem) == true);
                        dependentOrder.LineItems?.Remove(dependentItem);
                        db.LineItems.Remove(dependentItem);
                        if (dependentItem.LineItemType == LineItemType.Addon)
                        {
                            changes.Add($"  - Removed add-on: {dependentItem.Name}");
                        }
                    }

                    var itemOrder = orders.First(o => o.LineItems?.Contains(lineItem) == true);
                    itemOrder.LineItems?.Remove(lineItem);
                    db.LineItems.Remove(lineItem);
                    changes.Add($"Removed {lineItem.Name}");
                }

                // Remove order-level discounts (coupons, etc.)
                foreach (var discountId in request.RemovedOrderDiscounts)
                {
                    var discount = orders
                        .SelectMany(o => o.LineItems ?? [])
                        .FirstOrDefault(li => li.Id == discountId && li.LineItemType == LineItemType.Discount);

                    if (discount != null)
                    {
                        var discountOrder = orders.First(o => o.LineItems?.Contains(discount) == true);
                        discountOrder.LineItems?.Remove(discount);
                        db.LineItems.Remove(discount);
                        changes.Add($"Removed order discount: {discount.Name}");
                    }
                }

                // Add products using strategy-based grouping
                // The strategy determines how products are grouped into orders
                if (request.ProductsToAdd.Any())
                {
                    // Build grouping context and call strategy to determine order groupings
                    var groupingResult = await BuildGroupingForNewItemsAsync(
                        db,
                        invoice,
                        request.ProductsToAdd,
                        cancellationToken);

                    if (!groupingResult.Success)
                    {
                        return OperationResult<EditInvoiceResultDto>.Fail(string.Join("; ", groupingResult.Errors.ToArray()));
                    }

                    // Process each group from the strategy
                    foreach (var group in groupingResult.Groups)
                    {
                        var warehouseId = group.WarehouseId ?? Guid.Empty;
                        var shippingOptionId = group.SelectedShippingOptionId ?? Guid.Empty;

                        // Find existing order for this warehouse + shipping option or create new
                        var targetOrder = orders.FirstOrDefault(o =>
                            o.WarehouseId == warehouseId && o.ShippingOptionId == shippingOptionId);

                        if (targetOrder == null)
                        {
                            // Get shipping option name for the change log
                            var shippingOptionName = group.AvailableShippingOptions
                                .FirstOrDefault(so => so.ShippingOptionId == shippingOptionId)?.Name ?? "shipping";

                            targetOrder = orderFactory.Create(invoice.Id, warehouseId, shippingOptionId, shippingCost: 0);
                            targetOrder.LineItems = [];
                            db.Orders.Add(targetOrder);
                            orders.Add(targetOrder);
                            changes.Add($"Created new order for products with {shippingOptionName}");
                        }

                        targetOrder.LineItems ??= [];

                        // Add products from this group
                        foreach (var groupLineItem in group.LineItems)
                        {
                            var productDto = request.ProductsToAdd.FirstOrDefault(p => p.ProductId == groupLineItem.LineItemId);
                            if (productDto != null)
                            {
                                var addProductResult = await AddProductLineItemAsync(
                                    db, targetOrder, productDto, invoice.ShippingAddress, invoice.CurrencyCode, changes, cancellationToken);
                                if (!addProductResult.Success)
                                {
                                    return OperationResult<EditInvoiceResultDto>.Fail(addProductResult.ErrorMessage!);
                                }
                            }
                        }
                    }
                }

                // Add custom items - group physical items by warehouse + shipping option directly
                // Custom items don't go through the strategy since they have explicit user selections
                if (request.CustomItems.Any())
                {
                    // Separate physical items (need shipping grouping) from non-physical items
                    var physicalItems = request.CustomItems
                        .Where(c => c.IsPhysicalProduct && c.WarehouseId.HasValue && c.ShippingOptionId.HasValue)
                        .ToList();
                    var nonPhysicalItems = request.CustomItems
                        .Where(c => !c.IsPhysicalProduct || !c.WarehouseId.HasValue || !c.ShippingOptionId.HasValue)
                        .ToList();

                    // Process physical items - group by warehouse + shipping option
                    var physicalItemGroups = physicalItems.GroupBy(c => (c.WarehouseId!.Value, c.ShippingOptionId!.Value));
                    foreach (var group in physicalItemGroups)
                    {
                        var warehouseId = group.Key.Item1;
                        var shippingOptionId = group.Key.Item2;

                        // Find existing order for this warehouse + shipping option or create new one
                        var targetOrder = orders.FirstOrDefault(o =>
                            o.WarehouseId == warehouseId && o.ShippingOptionId == shippingOptionId);

                        if (targetOrder == null)
                        {
                            // Get shipping option name for the change log
                            var shippingOption = await db.ShippingOptions
                                .Where(so => so.Id == shippingOptionId && so.WarehouseId == warehouseId)
                                .FirstOrDefaultAsync(cancellationToken);

                            if (shippingOption == null)
                            {
                                return OperationResult<EditInvoiceResultDto>.Fail($"Shipping option not found for warehouse");
                            }

                            targetOrder = orderFactory.Create(invoice.Id, warehouseId, shippingOptionId, shippingCost: 0);
                            targetOrder.LineItems = [];
                            db.Orders.Add(targetOrder);
                            orders.Add(targetOrder);
                            changes.Add($"Created new order for custom items with {shippingOption.Name} shipping");
                        }

                        targetOrder.LineItems ??= [];

                        foreach (var customItem in group)
                        {
                            var lineItem = await CreateCustomLineItemAsync(db, targetOrder.Id, customItem, invoice.ShippingAddress, cancellationToken);
                            targetOrder.LineItems.Add(lineItem);
                            db.LineItems.Add(lineItem);
                            changes.Add($"Added custom item: {customItem.Name}");
                        }
                    }

                    // Process non-physical items - add to first available order
                    if (nonPhysicalItems.Any())
                    {
                        var targetOrder = orders.FirstOrDefault();

                        if (targetOrder == null)
                        {
                            var warehouse = await db.Warehouses
                                .Include(w => w.ShippingOptions)
                                .FirstOrDefaultAsync(cancellationToken);

                            if (warehouse == null || !warehouse.ShippingOptions.Any())
                            {
                                return OperationResult<EditInvoiceResultDto>.Fail("No warehouse or shipping option configured");
                            }

                            targetOrder = orderFactory.Create(
                                invoice.Id, warehouse.Id, warehouse.ShippingOptions.First().Id, shippingCost: 0);
                            targetOrder.LineItems = [];
                            db.Orders.Add(targetOrder);
                            orders.Add(targetOrder);
                            changes.Add("Created new order for non-physical custom items");
                        }

                        targetOrder.LineItems ??= [];

                        foreach (var customItem in nonPhysicalItems)
                        {
                            var lineItem = await CreateCustomLineItemAsync(db, targetOrder.Id, customItem, invoice.ShippingAddress, cancellationToken);
                            targetOrder.LineItems.Add(lineItem);
                            db.LineItems.Add(lineItem);
                            changes.Add($"Added custom item: {customItem.Name}");
                        }
                    }
                }

                // Add new order-level discounts
                if (request.OrderDiscounts.Any())
                {
                    // Get the first order to attach discounts to (or use custom order if it exists)
                    var targetOrder = orders.FirstOrDefault();
                    if (targetOrder == null)
                    {
                        return OperationResult<EditInvoiceResultDto>.Fail("No order found to attach discount to");
                    }

                    // Calculate subtotal for percentage discounts
                    var currentSubTotal = orders
                        .SelectMany(o => o.LineItems ?? [])
                        .Where(li => li.LineItemType == LineItemType.Product || li.LineItemType == LineItemType.Custom || li.LineItemType == LineItemType.Addon)
                        .Sum(li => li.Amount * li.Quantity);

                    foreach (var orderDiscount in request.OrderDiscounts)
                    {
                        // Calculate the discount amount
                        var discountAmount = orderDiscount.Type == DiscountValueType.Percentage
                            ? currencyService.Round(currentSubTotal * (orderDiscount.Value / 100m), invoice.CurrencyCode)
                            : orderDiscount.Value;

                        var discountLineItem = new LineItem
                        {
                            Id = GuidExtensions.NewSequentialGuid,
                            OrderId = targetOrder.Id,
                            LineItemType = LineItemType.Discount,
                            DependantLineItemSku = null, // No dependent SKU - this is an order-level discount
                            Name = orderDiscount.Reason ?? "Order Discount",
                            Sku = $"ORDERDISCOUNT-{DateTime.UtcNow.Ticks}",
                            Amount = -discountAmount, // Discounts are stored as negative amounts
                            Quantity = 1,
                            IsTaxable = false,
                            TaxRate = 0,
                            ExtendedData = new Dictionary<string, object>
                            {
                                [Constants.ExtendedDataKeys.DiscountValueType] = orderDiscount.Type.ToString(),
                                [Constants.ExtendedDataKeys.DiscountValue] = orderDiscount.Value,
                                [Constants.ExtendedDataKeys.VisibleToCustomer] = orderDiscount.IsVisibleToCustomer
                            }
                        };

                        targetOrder.LineItems ??= [];
                        targetOrder.LineItems.Add(discountLineItem);
                        db.LineItems.Add(discountLineItem);

                        var discountDisplay = orderDiscount.Type == DiscountValueType.Percentage
                            ? $"{orderDiscount.Value}%"
                            : $"{invoice.CurrencySymbol}{orderDiscount.Value}";
                        changes.Add($"Added order discount: {discountDisplay} off ({orderDiscount.Reason ?? "No reason specified"})");
                    }
                }

                // Update per-order shipping costs
                foreach (var shippingUpdate in request.OrderShippingUpdates)
                {
                    var order = orders.FirstOrDefault(o => o.Id == shippingUpdate.OrderId);
                    if (order != null && order.ShippingCost != shippingUpdate.ShippingCost)
                    {
                        var oldCost = order.ShippingCost;
                        order.ShippingCost = shippingUpdate.ShippingCost;
                        changes.Add($"Changed shipping for order from {invoice.CurrencySymbol}{oldCost} to {invoice.CurrencySymbol}{shippingUpdate.ShippingCost}");
                    }
                }

                // Handle tax removal (VAT exemption)
                if (request.ShouldRemoveTax)
                {
                    foreach (var order in orders)
                    {
                        if (order.LineItems is null) continue;
                        foreach (var lineItem in order.LineItems.Where(li => li.LineItemType != LineItemType.Discount))
                        {
                            if (lineItem.IsTaxable)
                            {
                                lineItem.IsTaxable = false;
                                lineItem.TaxRate = 0;
                            }
                        }
                    }
                    changes.Add("Removed tax (VAT exemption)");
                }

                // Recalculate totals using stored line item tax rates
                RecalculateInvoiceTotals(invoice, orders);
                ApplyPricingRateToStoreAmounts(invoice, orders);

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
                    IsSuccessful = true,
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
        var addonLineItems = lineItems.Where(li => li.LineItemType == LineItemType.Addon).ToList();

        return new OrderForEditDto
        {
            Id = order.Id,
            Status = order.Status.ToString(),
            ShippingCost = order.ShippingCost,
            ShippingMethodName = shippingOptionNames.GetValueOrDefault(order.ShippingOptionId),
            LineItems = productLineItems.Select(li => MapLineItemForEdit(li, discountLineItems, addonLineItems, stockInfoMap)).ToList()
        };
    }

    private static LineItemForEditDto MapLineItemForEdit(
        LineItem lineItem,
        List<LineItem> allDiscounts,
        List<LineItem> allAddons,
        Dictionary<Guid, (bool IsTracked, int Available)> stockInfoMap)
    {
        var discounts = allDiscounts
            .Where(d => d.DependantLineItemSku == lineItem.Sku)
            .Select(d =>
            {
                // Read discount type and value from ExtendedData
                var discountValueType = DiscountValueType.FixedAmount;
                var discountValue = Math.Abs(d.Amount);

                if (d.ExtendedData?.TryGetValue(Constants.ExtendedDataKeys.DiscountValueType, out var typeObj) == true)
                {
                    var typeStr = typeObj switch
                    {
                        string s => s,
                        System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.String => je.GetString(),
                        _ => null
                    };

                    if (typeStr != null && Enum.TryParse<DiscountValueType>(typeStr, out var parsedType))
                    {
                        discountValueType = parsedType;
                    }
                }

                if (d.ExtendedData?.TryGetValue(Constants.ExtendedDataKeys.DiscountValue, out var valueObj) == true)
                {
                    discountValue = valueObj switch
                    {
                        decimal dec => dec,
                        double dbl => (decimal)dbl,
                        int i => i,
                        long l => l,
                        float f => (decimal)f,
                        string s when decimal.TryParse(s, out var parsed) => parsed,
                        System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.Number =>
                            je.TryGetDecimal(out var d2) ? d2 : discountValue,
                        _ => discountValue
                    };
                }

                // Read VisibleToCustomer, handling JsonElement
                var visibleToCustomer = false;
                if (d.ExtendedData?.TryGetValue(Constants.ExtendedDataKeys.VisibleToCustomer, out var visibleObj) == true)
                {
                    visibleToCustomer = visibleObj switch
                    {
                        bool b => b,
                        System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.True => true,
                        System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.False => false,
                        _ => false
                    };
                }

                return new DiscountLineItemDto
                {
                    Id = d.Id,
                    Name = d.Name,
                    Amount = Math.Abs(d.Amount),
                    Type = discountValueType,
                    Value = discountValue,
                    Reason = d.Name,
                    IsVisibleToCustomer = visibleToCustomer
                };
            })
            .ToList();

        // Get stock info if available
        var hasStockInfo = stockInfoMap.TryGetValue(lineItem.Id, out var stockInfo);

        // Get child add-on items linked to this parent
        var childAddons = allAddons
            .Where(a => a.DependantLineItemSku == lineItem.Sku)
            .Select(a => new LineItemForEditDto
            {
                Id = a.Id,
                OrderId = a.OrderId ?? Guid.Empty,
                Sku = a.Sku,
                Name = a.Name,
                ProductId = null,
                Quantity = a.Quantity,
                Amount = a.Amount,
                OriginalAmount = a.OriginalAmount,
                IsTaxable = a.IsTaxable,
                TaxRate = a.TaxRate,
                LineItemType = a.LineItemType.ToString(),
                IsStockTracked = false,
                AvailableStock = null,
                Discounts = [],
                ChildLineItems = [],
                ParentLineItemSku = lineItem.Sku,
                IsAddon = true
            })
            .ToList();

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
            Discounts = discounts,
            ChildLineItems = childAddons,
            ParentLineItemSku = null,
            IsAddon = false
        };
    }

    /// <summary>
    /// Maps a discount LineItem to DiscountLineItemDto, extracting type/value from ExtendedData
    /// </summary>
    private static DiscountLineItemDto MapDiscountLineItem(LineItem d)
    {
        var discountValueType = DiscountValueType.FixedAmount;
        var discountValue = Math.Abs(d.Amount);

        if (d.ExtendedData?.TryGetValue(Constants.ExtendedDataKeys.DiscountValueType, out var typeObj) == true)
        {
            var typeStr = typeObj switch
            {
                string s => s,
                System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.String => je.GetString(),
                _ => null
            };

            if (typeStr != null && Enum.TryParse<DiscountValueType>(typeStr, out var parsedType))
            {
                discountValueType = parsedType;
            }
        }

        if (d.ExtendedData?.TryGetValue(Constants.ExtendedDataKeys.DiscountValue, out var valueObj) == true)
        {
            discountValue = valueObj switch
            {
                decimal dec => dec,
                double dbl => (decimal)dbl,
                int i => i,
                long l => l,
                float f => (decimal)f,
                string s when decimal.TryParse(s, out var parsed) => parsed,
                System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.Number =>
                    je.TryGetDecimal(out var d2) ? d2 : discountValue,
                _ => discountValue
            };
        }

        var visibleToCustomer = false;
        if (d.ExtendedData?.TryGetValue(Constants.ExtendedDataKeys.VisibleToCustomer, out var visibleObj) == true)
        {
            visibleToCustomer = visibleObj switch
            {
                bool b => b,
                System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.True => true,
                System.Text.Json.JsonElement je when je.ValueKind == System.Text.Json.JsonValueKind.False => false,
                _ => false
            };
        }

        return new DiscountLineItemDto
        {
            Id = d.Id,
            Name = d.Name,
            Amount = Math.Abs(d.Amount),
            Type = discountValueType,
            Value = discountValue,
            Reason = d.Name,
            IsVisibleToCustomer = visibleToCustomer
        };
    }

    private static decimal CalculateDiscountAmount(LineItemDiscountDto discount, decimal unitPrice, int quantity)
    {
        return discount.Type switch
        {
            DiscountValueType.FixedAmount => discount.Value * quantity,
            DiscountValueType.Percentage => (unitPrice * quantity) * (discount.Value / 100m),
            DiscountValueType.Free => unitPrice * quantity, // 100% off
            _ => 0
        };
    }

    private void RecalculateInvoiceTotals(Invoice invoice, List<Order> orders)
    {
        var currencyCode = string.IsNullOrWhiteSpace(invoice.CurrencyCode) ? _settings.StoreCurrencyCode : invoice.CurrencyCode;
        var allLineItems = orders.SelectMany(o => o.LineItems ?? []).ToList();
        var shippingTotal = orders.Sum(o => o.ShippingCost);

        // Use centralized calculation method - shipping tax is not applied here as each line item has its own tax rate
        // IMPORTANT: We use the stored TaxRate on each line item, NOT the current TaxGroup rate.
        // This ensures historical invoices are not affected by future TaxGroup rate changes.
        var calcResult = lineItemService.CalculateFromLineItems(new CalculateLineItemsParameters
        {
            LineItems = allLineItems,
            ShippingAmount = shippingTotal,
            DefaultTaxRate = 0,
            CurrencyCode = currencyCode,
            IsShippingTaxable = false
        });
        var subTotal = calcResult.SubTotal;
        var discount = calcResult.Discount;
        var adjustedSubTotal = calcResult.AdjustedSubTotal;
        var tax = calcResult.Tax;
        var total = calcResult.Total;

        // Update invoice with calculated values
        invoice.SubTotal = subTotal;
        invoice.Discount = discount;
        invoice.AdjustedSubTotal = adjustedSubTotal;
        invoice.Tax = tax;
        invoice.Total = total;
    }

    private void ApplyPricingRateToStoreAmounts(Invoice invoice, IReadOnlyCollection<Order> orders)
    {
        if (string.IsNullOrWhiteSpace(invoice.CurrencyCode) || string.IsNullOrWhiteSpace(invoice.StoreCurrencyCode))
        {
            return;
        }

        if (string.Equals(invoice.CurrencyCode, invoice.StoreCurrencyCode, StringComparison.OrdinalIgnoreCase))
        {
            invoice.SubTotalInStoreCurrency = null;
            invoice.DiscountInStoreCurrency = null;
            invoice.TaxInStoreCurrency = null;
            invoice.TotalInStoreCurrency = null;

            foreach (var order in orders)
            {
                order.ShippingCostInStoreCurrency = null;
                order.DeliveryDateSurchargeInStoreCurrency = null;

                foreach (var lineItem in order.LineItems ?? [])
                {
                    lineItem.AmountInStoreCurrency = null;
                }
            }

            return;
        }

        if (!invoice.PricingExchangeRate.HasValue || invoice.PricingExchangeRate.Value <= 0m)
        {
            return;
        }

        var rate = invoice.PricingExchangeRate.Value;
        var storeCurrency = invoice.StoreCurrencyCode;

        foreach (var order in orders)
        {
            order.ShippingCostInStoreCurrency = currencyService.Round(order.ShippingCost * rate, storeCurrency);
            if (order.DeliveryDateSurcharge.HasValue)
            {
                order.DeliveryDateSurchargeInStoreCurrency = currencyService.Round(order.DeliveryDateSurcharge.Value * rate, storeCurrency);
            }

            foreach (var lineItem in order.LineItems ?? [])
            {
                lineItem.AmountInStoreCurrency = currencyService.Round(lineItem.Amount * rate, storeCurrency);
            }
        }

        invoice.SubTotalInStoreCurrency = currencyService.Round(invoice.SubTotal * rate, storeCurrency);
        invoice.DiscountInStoreCurrency = currencyService.Round(invoice.Discount * rate, storeCurrency);
        invoice.TaxInStoreCurrency = currencyService.Round(invoice.Tax * rate, storeCurrency);
        invoice.TotalInStoreCurrency = currencyService.Round(invoice.Total * rate, storeCurrency);
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

    /// <inheritdoc />
    public async Task<OperationResult<CreateDraftOrderResultDto>> CreateDraftOrderAsync(
        CreateDraftOrderDto request,
        Guid? authorId,
        string? authorName,
        CancellationToken cancellationToken = default)
    {
        // Validate billing email exists
        var billingEmail = request.BillingAddress.Email;
        if (string.IsNullOrWhiteSpace(billingEmail))
        {
            return OperationResult<CreateDraftOrderResultDto>.Fail("Billing email is required to create a draft order.");
        }

        // Get or create customer from billing email (outside scope to avoid nesting)
        var billingAddress = MapDtoToAddress(request.BillingAddress);
        var customer = await customerService.GetOrCreateByEmailAsync(billingEmail, billingAddress, cancellationToken);

        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync<OperationResult<CreateDraftOrderResultDto>>(async db =>
        {
            // Generate next invoice number
            var lastInvoice = await db.Invoices
                .OrderByDescending(i => i.DateCreated)
                .Select(i => i.InvoiceNumber)
                .FirstOrDefaultAsync(cancellationToken);

            var nextNumber = 1;
            if (!string.IsNullOrEmpty(lastInvoice))
            {
                // Extract number from existing invoice (e.g., "INV-0001" -> 1)
                var numericPart = lastInvoice.Replace(_settings.InvoiceNumberPrefix, "");
                if (int.TryParse(numericPart, out var lastNumber))
                {
                    nextNumber = lastNumber + 1;
                }
            }
            var invoiceNumber = $"{_settings.InvoiceNumberPrefix}{nextNumber:D4}";

            // Get first warehouse and its first shipping option for the draft order
            var warehouse = await db.Warehouses
                .Include(w => w.ShippingOptions)
                .FirstOrDefaultAsync(cancellationToken);

            if (warehouse == null)
            {
                return OperationResult<CreateDraftOrderResultDto>.Fail("No warehouse found. Please configure at least one warehouse.");
            }

            var shippingOption = warehouse.ShippingOptions.FirstOrDefault();
            if (shippingOption == null)
            {
                return OperationResult<CreateDraftOrderResultDto>.Fail($"Warehouse '{warehouse.Name}' has no shipping options. Please configure at least one shipping option.");
            }

            // Get tax groups for custom items
            var taxGroupIds = request.CustomItems
                .Where(c => c.TaxGroupId.HasValue)
                .Select(c => c.TaxGroupId!.Value)
                .Distinct()
                .ToList();

            var taxGroups = taxGroupIds.Count > 0
                ? await db.TaxGroups
                    .Where(tg => taxGroupIds.Contains(tg.Id))
                    .ToDictionaryAsync(tg => tg.Id, tg => tg.TaxPercentage, cancellationToken)
                : [];

            var now = DateTime.UtcNow;

            // Use shipping address if provided, otherwise use billing address
            var shippingAddress = request.ShippingAddress != null
                ? MapDtoToAddress(request.ShippingAddress)
                : CloneAddress(billingAddress);

            // Calculate totals from custom items
            decimal subTotal = 0;
            decimal tax = 0;

            foreach (var item in request.CustomItems)
            {
                var itemTotal = item.Price * item.Quantity;
                subTotal += itemTotal;

                if (item.TaxGroupId.HasValue && taxGroups.TryGetValue(item.TaxGroupId.Value, out var taxRate))
                {
                    tax += itemTotal * (taxRate / 100m);
                }
            }

            var total = subTotal + tax;
            var currencyCode = _settings.StoreCurrencyCode;

            // Create the invoice
            var invoice = invoiceFactory.CreateDraft(
                invoiceNumber,
                customer.Id,
                billingAddress,
                shippingAddress,
                currencyCode,
                subTotal,
                tax,
                total,
                authorName,
                authorId);

            // Create the order
            var order = orderFactory.Create(
                invoice.Id,
                warehouse.Id,
                shippingOption.Id,
                shippingCost: 0); // Will be set when fulfilling
            order.Invoice = invoice;
            order.LineItems = [];

            // Add custom items as line items
            foreach (var customItem in request.CustomItems)
            {
                var taxRate = customItem.TaxGroupId.HasValue && taxGroups.TryGetValue(customItem.TaxGroupId.Value, out var rate)
                    ? rate
                    : 0m;

                var lineItem = new LineItem
                {
                    Id = Shared.Extensions.GuidExtensions.NewSequentialGuid,
                    OrderId = order.Id,
                    Order = order,
                    Sku = customItem.Sku,
                    Name = customItem.Name,
                    Quantity = customItem.Quantity,
                    Amount = customItem.Price,
                    IsTaxable = customItem.TaxGroupId.HasValue,
                    TaxRate = taxRate,
                    LineItemType = LineItemType.Custom,
                    DateCreated = now,
                    DateUpdated = now,
                    ExtendedData = new Dictionary<string, object>
                    {
                        [Constants.ExtendedDataKeys.IsPhysicalProduct] = customItem.IsPhysicalProduct
                    }
                };

                order.LineItems.Add(lineItem);
                db.LineItems.Add(lineItem);
            }

            invoice.Orders = [order];

            db.Invoices.Add(invoice);
            db.Orders.Add(order);

            await db.SaveChangesAsync(cancellationToken);

            return OperationResult<CreateDraftOrderResultDto>.Success(new CreateDraftOrderResultDto
            {
                IsSuccessful = true,
                InvoiceId = invoice.Id,
                InvoiceNumber = invoice.InvoiceNumber
            });
        });

        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<List<CustomerLookupResultDto>> SearchCustomersAsync(
        string? email,
        string? name,
        int limit = 10,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(email) && string.IsNullOrWhiteSpace(name))
        {
            return [];
        }

        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            var searchEmail = email?.Trim().ToLower();
            var searchName = name?.Trim().ToLower();

            // Query invoices matching the search criteria
            var query = db.Invoices
                .AsNoTracking()
                .Where(i => !i.IsDeleted);

            // Apply search filters
            if (!string.IsNullOrEmpty(searchEmail))
            {
                query = query.Where(i => i.BillingAddress.Email != null &&
                    i.BillingAddress.Email.ToLower().Contains(searchEmail));
            }

            if (!string.IsNullOrEmpty(searchName))
            {
                query = query.Where(i => i.BillingAddress.Name != null &&
                    i.BillingAddress.Name.ToLower().Contains(searchName));
            }

            // Get matching invoices, ordered by most recent
            // Load full entities to ensure owned entities (Address, CountyState) are properly included
            var invoices = await query
                .OrderByDescending(i => i.DateCreated)
                .Take(100) // Limit to prevent scanning too many records
                .ToListAsync(cancellationToken);

            // Group by billing email to get unique customers
            var customerGroups = invoices
                .Where(i => !string.IsNullOrWhiteSpace(i.BillingAddress.Email))
                .GroupBy(i => i.BillingAddress.Email!.ToLower())
                .Take(limit);

            List<CustomerLookupResultDto> customers = [];

            foreach (var group in customerGroups)
            {
                var firstInvoice = group.First();
                var billingAddress = firstInvoice.BillingAddress;

                // Collect unique shipping addresses from all invoices for this customer
                var shippingAddresses = group
                    .Select(i => i.ShippingAddress)
                    .Where(a => !string.IsNullOrWhiteSpace(a.AddressOne))
                    .DistinctBy(a => NormalizeAddressKey(a))
                    .Select(MapAddressToDto)
                    .ToList();

                customers.Add(new CustomerLookupResultDto
                {
                    Name = billingAddress.Name ?? string.Empty,
                    Email = billingAddress.Email ?? string.Empty,
                    Phone = billingAddress.Phone,
                    BillingAddress = MapAddressToDto(billingAddress),
                    PastShippingAddresses = shippingAddresses
                });
            }

            return customers;
        });

        scope.Complete();
        return result;
    }

    private static string NormalizeAddressKey(Address address)
    {
        // Create a normalized key for de-duplication
        var key = $"{address.AddressOne?.Trim().ToLower()}|{address.TownCity?.Trim().ToLower()}|{address.PostalCode?.Trim().ToLower()}|{address.CountryCode?.Trim().ToLower()}";
        return key;
    }

    private static AddressDto MapAddressToDto(Address address)
    {
        return new AddressDto
        {
            Name = address.Name,
            Company = address.Company,
            AddressOne = address.AddressOne,
            AddressTwo = address.AddressTwo,
            TownCity = address.TownCity,
            CountyState = address.CountyState?.Name,
            PostalCode = address.PostalCode,
            Country = address.Country,
            CountryCode = address.CountryCode,
            Email = address.Email,
            Phone = address.Phone
        };
    }

    private static Address MapDtoToAddress(AddressDto dto)
    {
        return new Address
        {
            Name = dto.Name,
            Company = dto.Company,
            AddressOne = dto.AddressOne,
            AddressTwo = dto.AddressTwo,
            TownCity = dto.TownCity,
            CountyState = new CountyState { Name = dto.CountyState },
            PostalCode = dto.PostalCode,
            Country = dto.Country,
            CountryCode = dto.CountryCode,
            Email = dto.Email,
            Phone = dto.Phone
        };
    }

    private static Address CloneAddress(Address source)
    {
        return new Address
        {
            Name = source.Name,
            Company = source.Company,
            AddressOne = source.AddressOne,
            AddressTwo = source.AddressTwo,
            TownCity = source.TownCity,
            CountyState = new CountyState { Name = source.CountyState?.Name, RegionCode = source.CountyState?.RegionCode },
            PostalCode = source.PostalCode,
            Country = source.Country,
            CountryCode = source.CountryCode,
            Email = source.Email,
            Phone = source.Phone
        };
    }

    /// <summary>
    /// Creates a custom line item from the DTO, looking up tax group info if needed.
    /// Uses centralized geographic tax rate lookup when shipping address is available.
    /// </summary>
    private async Task<LineItem> CreateCustomLineItemAsync(
        MerchelloDbContext db,
        Guid orderId,
        AddCustomItemDto customItem,
        Address? shippingAddress,
        CancellationToken cancellationToken)
    {
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
                taxGroupName = taxGroup.Name;

                // Use centralized geographic lookup if address available
                if (!string.IsNullOrWhiteSpace(shippingAddress?.CountryCode))
                {
                    taxRate = await taxService.GetApplicableRateAsync(
                        customItem.TaxGroupId.Value,
                        shippingAddress.CountryCode,
                        shippingAddress.CountyState?.RegionCode,
                        cancellationToken);
                }
                else
                {
                    // Fallback to base rate if no address
                    taxRate = taxGroup.TaxPercentage;
                }
            }
            else
            {
                logger.LogWarning("Tax group {TaxGroupId} not found for custom item", customItem.TaxGroupId);
                isTaxable = false;
            }
        }

        return new LineItem
        {
            Id = GuidExtensions.NewSequentialGuid,
            OrderId = orderId,
            LineItemType = LineItemType.Custom,
            Name = customItem.Name,
            Sku = string.IsNullOrWhiteSpace(customItem.Sku) ? $"CUSTOM-{DateTime.UtcNow.Ticks}" : customItem.Sku,
            Amount = customItem.Price,
            Quantity = customItem.Quantity,
            IsTaxable = isTaxable,
            TaxRate = taxRate,
            ExtendedData = new Dictionary<string, object>
            {
                [Constants.ExtendedDataKeys.IsPhysicalProduct] = customItem.IsPhysicalProduct,
                ["TaxGroupId"] = customItem.TaxGroupId?.ToString() ?? string.Empty,
                ["TaxGroupName"] = taxGroupName ?? string.Empty
            }
        };
    }

    /// <summary>
    /// Builds a grouping context for new products being added and calls the strategy.
    /// This delegates all grouping logic to the configured strategy.
    /// Custom items are handled separately since they have explicit user selections.
    /// </summary>
    private async Task<OrderGroupingResult> BuildGroupingForNewItemsAsync(
        MerchelloDbContext db,
        Invoice invoice,
        List<AddProductToOrderDto> productsToAdd,
        CancellationToken cancellationToken)
    {
        if (!productsToAdd.Any())
        {
            return new OrderGroupingResult { Groups = [] };
        }

        // Load products with necessary relationships
        var productIds = productsToAdd.Select(p => p.ProductId).ToList();
        var products = productIds.Any()
            ? await db.Products
                .AsNoTracking()
                .Include(p => p.ProductRoot!)
                    .ThenInclude(pr => pr!.ProductRootWarehouses.OrderBy(prw => prw.PriorityOrder))
                        .ThenInclude(prw => prw.Warehouse)
                            .ThenInclude(w => w!.ServiceRegions)
                .Include(p => p.ProductRoot!)
                    .ThenInclude(pr => pr!.ProductRootWarehouses)
                        .ThenInclude(prw => prw.Warehouse)
                            .ThenInclude(w => w!.ShippingOptions)
                                .ThenInclude(so => so.ShippingCosts)
                .Include(p => p.ProductWarehouses)
                    .ThenInclude(pw => pw.Warehouse)
                .Include(p => p.ShippingOptions)
                .Include(p => p.AllowedShippingOptions)
                .Include(p => p.ExcludedShippingOptions)
                .Where(p => productIds.Contains(p.Id))
                .AsSplitQuery()
                .ToDictionaryAsync(p => p.Id, cancellationToken)
            : new Dictionary<Guid, Product>();

        // Load warehouses
        var warehouseIds = productsToAdd.Select(p => p.WarehouseId)
            .Distinct()
            .ToList();

        var warehouses = await db.Warehouses
            .AsNoTracking()
            .Include(w => w.ShippingOptions)
                .ThenInclude(so => so.ShippingCosts)
            .Include(w => w.ServiceRegions)
            .Where(w => warehouseIds.Contains(w.Id))
            .ToDictionaryAsync(w => w.Id, cancellationToken);

        // Build virtual basket with line items for the products being added
        List<LineItem> virtualLineItems = [];
        var lineItemShippingSelections = new Dictionary<Guid, (Guid WarehouseId, Guid ShippingOptionId)>();

        // Add products as virtual line items
        foreach (var productDto in productsToAdd)
        {
            if (!products.TryGetValue(productDto.ProductId, out var product))
            {
                continue;
            }

            var lineItemId = productDto.ProductId; // Use ProductId as the line item identifier
            virtualLineItems.Add(new LineItem
            {
                Id = lineItemId,
                ProductId = productDto.ProductId,
                Name = product.Name ?? "Product",
                Sku = product.Sku,
                Quantity = productDto.Quantity,
                Amount = product.Price * productDto.Quantity
            });

            // Record the explicit shipping selection
            lineItemShippingSelections[lineItemId] = (productDto.WarehouseId, productDto.ShippingOptionId);
        }

        // Build the virtual basket
        var virtualBasket = new Basket
        {
            Id = Guid.NewGuid(),
            LineItems = virtualLineItems,
            Currency = invoice.CurrencyCode,
            BillingAddress = invoice.BillingAddress
        };

        // Build the grouping context
        var context = new OrderGroupingContext
        {
            Basket = virtualBasket,
            BillingAddress = invoice.BillingAddress,
            ShippingAddress = invoice.ShippingAddress,
            CustomerId = invoice.CustomerId,
            CustomerEmail = invoice.BillingAddress?.Email,
            Products = products,
            Warehouses = warehouses,
            LineItemShippingSelections = lineItemShippingSelections
        };

        // Get the strategy and execute grouping
        var strategy = strategyResolver.GetStrategy();
        logger.LogDebug("Using order grouping strategy: {StrategyKey} for order edit", strategy.Metadata.Key);

        var groupingResult = await strategy.GroupItemsAsync(context, cancellationToken);

        return groupingResult;
    }

    /// <summary>
    /// Adds a product line item to an order, including stock validation and add-ons.
    /// </summary>
    private async Task<(bool Success, string? ErrorMessage)> AddProductLineItemAsync(
        MerchelloDbContext db,
        Order targetOrder,
        AddProductToOrderDto productDto,
        Address? shippingAddress,
        string currencyCode,
        List<string> changes,
        CancellationToken cancellationToken)
    {
        var product = await db.Products
            .Include(p => p.ProductRoot!)
            .ThenInclude(pr => pr.TaxGroup)
            .FirstOrDefaultAsync(p => p.Id == productDto.ProductId, cancellationToken);

        if (product == null)
        {
            logger.LogWarning("Product {ProductId} not found when adding to order", productDto.ProductId);
            return (true, null); // Skip missing products, don't fail the whole operation
        }

        var warehouseId = productDto.WarehouseId;

        // Validate and reserve stock
        var isTracked = await inventoryService.IsStockTrackedAsync(
            productDto.ProductId, warehouseId, cancellationToken);

        if (isTracked)
        {
            var availableStock = await inventoryService.GetAvailableStockAsync(
                productDto.ProductId, warehouseId, cancellationToken);

            if (availableStock < productDto.Quantity)
            {
                return (false, $"Insufficient stock for '{product.Name}'. Available: {availableStock}, Requested: {productDto.Quantity}");
            }

            var reserveResult = await inventoryService.ReserveStockAsync(
                productDto.ProductId, warehouseId, productDto.Quantity, cancellationToken);

            if (!reserveResult.ResultObject)
            {
                var error = reserveResult.Messages.FirstOrDefault()?.Message ?? "Failed to reserve stock";
                return (false, error);
            }
        }

        // Determine tax info using the active tax provider
        var taxRate = 0m;
        var isTaxable = false;
        var taxGroupId = product.ProductRoot?.TaxGroupId;

        if (taxGroupId.HasValue && !string.IsNullOrEmpty(shippingAddress?.CountryCode))
        {
            taxRate = await GetTaxRateFromProviderAsync(
                sku: product.Sku ?? $"PROD-{product.Id:N}"[..20],
                name: product.Name ?? product.ProductRoot?.RootName ?? "Unknown Product",
                amount: product.Price,
                quantity: productDto.Quantity,
                taxGroupId: taxGroupId.Value,
                shippingAddress: shippingAddress,
                currencyCode: currencyCode,
                cancellationToken: cancellationToken);
            isTaxable = taxRate > 0;
        }

        // Get product image
        string? imageUrl = null;
        if (product.Images.Any())
        {
            imageUrl = product.Images.First();
        }
        else if (product.ProductRoot?.RootImages.Any() == true)
        {
            imageUrl = product.ProductRoot.RootImages.First();
        }

        // Create parent product line item
        var parentSku = product.Sku ?? $"PROD-{product.Id:N}"[..20];
        var isDigital = product.ProductRoot?.IsDigitalProduct ?? false;
        var parentLineItem = new LineItem
        {
            Id = GuidExtensions.NewSequentialGuid,
            OrderId = targetOrder.Id,
            LineItemType = LineItemType.Product,
            ProductId = product.Id,
            Name = product.Name ?? product.ProductRoot?.RootName ?? "Unknown Product",
            Sku = parentSku,
            Amount = product.Price,
            OriginalAmount = product.Price,
            Quantity = productDto.Quantity,
            IsTaxable = isTaxable,
            TaxRate = taxRate,
            ExtendedData = new Dictionary<string, object>
            {
                [Constants.ExtendedDataKeys.IsPhysicalProduct] = !isDigital,
                ["ImageUrl"] = imageUrl ?? string.Empty
            }
        };

        targetOrder.LineItems!.Add(parentLineItem);
        db.LineItems.Add(parentLineItem);
        changes.Add($"Added {productDto.Quantity}x {parentLineItem.Name}");

        // Create child add-on line items
        foreach (var addon in productDto.Addons)
        {
            var addonSku = $"{parentSku}{addon.SkuSuffix ?? $"-ADDON-{addon.OptionValueId:N}"[..15]}";
            var addonLineItem = new LineItem
            {
                Id = GuidExtensions.NewSequentialGuid,
                OrderId = targetOrder.Id,
                LineItemType = LineItemType.Addon,
                DependantLineItemSku = parentSku,
                Name = addon.Name,
                Sku = addonSku,
                Amount = addon.PriceAdjustment,
                Quantity = productDto.Quantity,
                IsTaxable = isTaxable,
                TaxRate = taxRate,
                ExtendedData = new Dictionary<string, object>
                {
                    ["OptionId"] = addon.OptionId.ToString(),
                    ["OptionValueId"] = addon.OptionValueId.ToString(),
                    ["CostAdjustment"] = addon.CostAdjustment,
                    ["IsAddon"] = true,
                    ["WeightKg"] = addon.WeightKg ?? 0m,
                    ["LengthCm"] = addon.LengthCm ?? 0m,
                    ["WidthCm"] = addon.WidthCm ?? 0m,
                    ["HeightCm"] = addon.HeightCm ?? 0m
                }
            };

            targetOrder.LineItems.Add(addonLineItem);
            db.LineItems.Add(addonLineItem);
            changes.Add($"  + Add-on: {addon.Name}");
        }

        return (true, null);
    }

    // ============================================
    // Promotional Discount Methods
    // ============================================

    /// <inheritdoc />
    public async Task<CrudResult<Invoice>> ApplyPromotionalDiscountAsync(
        ApplyPromotionalDiscountParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Invoice>();

        // Get the discount
        var discount = await discountService.GetByIdAsync(parameters.DiscountId, cancellationToken);
        if (discount == null)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = "Discount not found",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        // Validate discount is active
        if (discount.Status != DiscountStatus.Active)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = $"Discount '{discount.Name}' is not active (status: {discount.Status})",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        // Check if discount has expired
        if (discount.EndsAt.HasValue && discount.EndsAt.Value < DateTime.UtcNow)
        {
            result.Messages.Add(new ResultMessage
            {
                Message = $"Discount '{discount.Name}' has expired",
                ResultMessageType = ResultMessageType.Error
            });
            return result;
        }

        // Check usage limits
        if (discount.TotalUsageLimit.HasValue)
        {
            var currentUsageCount = await discountService.GetUsageCountAsync(discount.Id, cancellationToken);
            if (currentUsageCount >= discount.TotalUsageLimit.Value)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = $"Discount '{discount.Name}' has reached its usage limit",
                    ResultMessageType = ResultMessageType.Error
                });
                return result;
            }
        }

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<Task>(async db =>
        {
            var invoice = await db.Invoices
                .Include(i => i.Orders)!
                .ThenInclude(o => o.LineItems)
                .FirstOrDefaultAsync(i => i.Id == parameters.InvoiceId && !i.IsDeleted, cancellationToken);

            if (invoice == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Invoice not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            var orders = invoice.Orders?.ToList() ?? [];
            var (canEdit, cannotEditReason) = CanEditInvoice(orders);
            if (!canEdit)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = cannotEditReason ?? "Invoice cannot be edited",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            // Check if this discount has already been applied
            var existingDiscountSku = $"PROMO-{discount.Id}";
            var alreadyApplied = orders
                .SelectMany(o => o.LineItems ?? [])
                .Any(li => li.LineItemType == LineItemType.Discount && li.Sku == existingDiscountSku);

            if (alreadyApplied)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = $"Discount '{discount.Name}' has already been applied to this invoice",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            // Calculate subtotal for percentage discounts and minimum requirements
            var productLineItems = orders
                .SelectMany(o => o.LineItems ?? [])
                .Where(li => li.LineItemType == LineItemType.Product || li.LineItemType == LineItemType.Custom || li.LineItemType == LineItemType.Addon)
                .ToList();
            var subTotal = productLineItems.Sum(li => currencyService.Round(li.Amount * li.Quantity, invoice.CurrencyCode));

            // Check minimum requirements
            if (discount.RequirementType == DiscountRequirementType.MinimumPurchaseAmount &&
                discount.RequirementValue.HasValue &&
                subTotal < discount.RequirementValue.Value)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = $"Minimum purchase of {invoice.CurrencySymbol}{discount.RequirementValue.Value} required for discount '{discount.Name}'",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            if (discount.RequirementType == DiscountRequirementType.MinimumQuantity &&
                discount.RequirementValue.HasValue)
            {
                var totalQuantity = productLineItems.Sum(li => li.Quantity);
                if (totalQuantity < (int)discount.RequirementValue.Value)
                {
                    result.Messages.Add(new ResultMessage
                    {
                        Message = $"Minimum quantity of {(int)discount.RequirementValue.Value} items required for discount '{discount.Name}'",
                        ResultMessageType = ResultMessageType.Error
                    });
                    return;
                }
            }

            // Calculate the discount amount based on category and value type
            decimal discountAmount;

            switch (discount.Category)
            {
                case DiscountCategory.AmountOffProducts:
                case DiscountCategory.AmountOffOrder:
                    discountAmount = discount.ValueType switch
                    {
                        DiscountValueType.Percentage => currencyService.Round(subTotal * (discount.Value / 100m), invoice.CurrencyCode),
                        DiscountValueType.FixedAmount => discount.Value,
                        DiscountValueType.Free => subTotal,
                        _ => 0m
                    };
                    break;

                case DiscountCategory.FreeShipping:
                    var shippingTotal = orders.Sum(o => o.ShippingCost);
                    discountAmount = shippingTotal; // Free shipping = discount equals shipping cost
                    break;

                default:
                    // For BuyXGetY and other complex discounts, we'd need the full discount engine
                    // For now, fallback to simple calculation
                    discountAmount = discount.ValueType switch
                    {
                        DiscountValueType.Percentage => currencyService.Round(subTotal * (discount.Value / 100m), invoice.CurrencyCode),
                        DiscountValueType.FixedAmount => discount.Value,
                        _ => 0m
                    };
                    break;
            }

            // Cap discount to prevent negative totals
            discountAmount = Math.Min(discountAmount, subTotal);

            if (discountAmount <= 0)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Calculated discount amount is zero or negative",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            // Get first order to attach discount line item
            var targetOrder = orders.FirstOrDefault();
            if (targetOrder == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "No order found to attach discount to",
                    ResultMessageType = ResultMessageType.Error
                });
                return;
            }

            // Create the discount line item
            var discountLineItem = new LineItem
            {
                Id = GuidExtensions.NewSequentialGuid,
                OrderId = targetOrder.Id,
                Order = targetOrder,
                LineItemType = LineItemType.Discount,
                DependantLineItemSku = null, // Order-level discount
                Name = discount.Code != null ? $"{discount.Name} ({discount.Code})" : discount.Name,
                Sku = existingDiscountSku,
                Amount = -discountAmount, // Discounts stored as negative
                Quantity = 1,
                IsTaxable = false,
                TaxRate = 0,
                DateCreated = DateTime.UtcNow,
                DateUpdated = DateTime.UtcNow,
                ExtendedData = new Dictionary<string, object>
                {
                    [Constants.ExtendedDataKeys.DiscountId] = discount.Id.ToString(),
                    [Constants.ExtendedDataKeys.DiscountValueType] = discount.ValueType.ToString(),
                    [Constants.ExtendedDataKeys.DiscountValue] = discount.Value,
                    [Constants.ExtendedDataKeys.VisibleToCustomer] = true,
                    [Constants.ExtendedDataKeys.ApplyAfterTax] = discount.ApplyAfterTax
                }
            };

            targetOrder.LineItems ??= [];
            targetOrder.LineItems.Add(discountLineItem);
            db.LineItems.Add(discountLineItem);

            // Recalculate invoice totals
            RecalculateInvoiceTotals(invoice, orders);
            ApplyPricingRateToStoreAmounts(invoice, orders);

            // Add note to timeline
            var noteText = $"**Promotional Discount Applied**\n\n" +
                          $"Discount: {discount.Name}\n" +
                          (discount.Code != null ? $"Code: {discount.Code}\n" : "") +
                          $"Amount: -{invoice.CurrencySymbol}{discountAmount}";

            invoice.Notes.Add(new InvoiceNote
            {
                DateCreated = DateTime.UtcNow,
                AuthorId = parameters.AuthorId,
                Author = parameters.AuthorName ?? "System",
                Description = noteText,
                VisibleToCustomer = false
            });

            invoice.DateUpdated = DateTime.UtcNow;

            await db.SaveChangesAsync(cancellationToken);

            // Usage is now tracked via line items - no separate recording needed

            logger.LogInformation(
                "Applied promotional discount '{DiscountName}' ({DiscountId}) to invoice {InvoiceId} for {Amount}",
                discount.Name, discount.Id, invoice.Id, discountAmount);

            result.ResultObject = invoice;
        });
        scope.Complete();

        return result;
    }

    /// <summary>
    /// Gets the tax rate for a line item using the active tax provider.
    /// </summary>
    private async Task<decimal> GetTaxRateFromProviderAsync(
        string sku,
        string name,
        decimal amount,
        int quantity,
        Guid taxGroupId,
        Address shippingAddress,
        string currencyCode,
        CancellationToken cancellationToken)
    {
        var activeProvider = await taxProviderManager.GetActiveProviderAsync(cancellationToken);
        if (activeProvider == null)
        {
            logger.LogWarning("No active tax provider found, falling back to direct tax service");
            return await taxService.GetApplicableRateAsync(
                taxGroupId,
                shippingAddress.CountryCode ?? string.Empty,
                shippingAddress.CountyState?.RegionCode,
                cancellationToken);
        }

        var request = new TaxCalculationRequest
        {
            ShippingAddress = shippingAddress,
            BillingAddress = null,
            CurrencyCode = currencyCode,
            LineItems =
            [
                new TaxableLineItem
                {
                    Sku = sku,
                    Name = name,
                    Amount = amount,
                    Quantity = quantity,
                    TaxGroupId = taxGroupId
                }
            ]
        };

        var result = await activeProvider.Provider.CalculateTaxAsync(request, cancellationToken);
        if (!result.Success)
        {
            logger.LogWarning("Tax provider calculation failed: {ErrorMessage}", result.ErrorMessage);
            return 0m;
        }

        return result.LineResults.FirstOrDefault()?.TaxRate ?? 0m;
    }
}

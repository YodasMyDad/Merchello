using System.Text.Json;
using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Handlers;
using Merchello.Core.Accounting.Handlers.Interfaces;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Strategies;
using Merchello.Core.Checkout.Strategies.Interfaces;
using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Customers.Services.Interfaces;
using Merchello.Core.Customers.Services.Parameters;
using Merchello.Core.Data;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Discounts.Services.Interfaces;
using Merchello.Core.ExchangeRates.Models;
using Merchello.Core.ExchangeRates.Services.Interfaces;
using Merchello.Core.Locality.Dtos;
using Merchello.Core.Locality.Factories;
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
using Merchello.Core.Products.Services.Parameters;
using Merchello.Core.Shared;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shipping.Dtos;
using Merchello.Core.Shipping.Factories;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Providers.Interfaces;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Shipping.Services.Parameters;
using Merchello.Core.Tax.Providers.Interfaces;
using Merchello.Core.Tax.Providers.Models;
using Merchello.Core.Tax.Services.Interfaces;
using Merchello.Core.Tax.Services.Models;
using Merchello.Core.Warehouses.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Accounting.Services;

public class InvoiceService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IShippingService shippingService,
    IShippingCostResolver shippingCostResolver,
    IShippingProviderManager shippingProviderManager,
    IInventoryService inventoryService,
    IOrderStatusHandler statusHandler,
    IPaymentService paymentService,
    ICustomerService customerService,
    Lazy<ICheckoutDiscountService> checkoutDiscountService,
    IMerchelloNotificationPublisher notificationPublisher,
    IExchangeRateCache exchangeRateCache,
    ICurrencyService currencyService,
    ILineItemService lineItemService,
    IDiscountService discountService,
    ITaxProviderManager taxProviderManager,
    InvoiceFactory invoiceFactory,
    OrderFactory orderFactory,
    LineItemFactory lineItemFactory,
    AddressFactory addressFactory,
    IOptions<MerchelloSettings> settings,
    ILogger<InvoiceService> logger,
    ITaxOrchestrationService? taxOrchestrationService = null) : IInvoiceService
{
    private readonly MerchelloSettings _settings = settings.Value;

    public async Task<CrudResult<Invoice>> CreateOrderFromBasketAsync(
        Basket basket,
        CheckoutSession checkoutSession,
        InvoiceSource? source = null,
        CancellationToken cancellationToken = default,
        string? purchaseOrder = null)
    {
        var result = new CrudResult<Invoice>();

        // Validate billing email exists
        var billingEmail = checkoutSession.BillingAddress.Email;
        if (string.IsNullOrWhiteSpace(billingEmail))
        {
            result.AddErrorMessage("Billing email is required to create an invoice.");
            return result;
        }

        // Get or create customer from billing email
        var customer = await customerService.GetOrCreateByEmailAsync(new GetOrCreateCustomerParameters
        {
            Email = billingEmail,
            BillingAddress = checkoutSession.BillingAddress,
            AcceptsMarketing = checkoutSession.AcceptsMarketing
        }, cancellationToken);

        // Set customer on basket for discount eligibility
        basket.CustomerId = customer.Id;

        var requiresShipping = BasketRequiresShipping(basket);

        // Get the warehouse shipping groups using the same logic used during checkout
        // IMPORTANT: Get shipping BEFORE refreshing discounts so free shipping discounts have accurate costs
        var shippingResult = requiresShipping
            ? await shippingService.GetShippingOptionsForBasket(
                new GetShippingOptionsParameters
                {
                    Basket = basket,
                    ShippingAddress = checkoutSession.ShippingAddress,
                    SelectedShippingOptions = checkoutSession.SelectedShippingOptions
                },
                cancellationToken)
            : new ShippingSelectionResult
            {
                WarehouseGroups = [],
                SubTotal = basket.SubTotal,
                Tax = basket.Tax,
                Total = basket.Total
            };

        if (requiresShipping && !shippingResult.WarehouseGroups.Any())
        {
            result.AddErrorMessage("No warehouse shipping groups found for basket. Cannot create order.");
            return result;
        }

        // Pre-validate stock availability before any further processing
        // IMPORTANT: Use the allocated quantity from the warehouse group line item (not basket quantity)
        // For multi-warehouse fulfillment, a single basket line item may be split across multiple orders
        var stockValidationItems = shippingResult.WarehouseGroups
            .SelectMany(g => g.LineItems
                .Select(li => (li, bl: basket.LineItems.FirstOrDefault(bl => bl.Id == li.LineItemId)))
                .Where(x => x.bl?.ProductId != null)
                .Select(x => (x.bl!.ProductId!.Value, g.WarehouseId, x.li.Quantity)))
            .ToList();

        if (stockValidationItems.Count > 0)
        {
            var stockValidation = await inventoryService.ValidateBasketStockAsync(stockValidationItems, cancellationToken);
            if (!stockValidation.IsValid)
            {
                var errorMessages = stockValidation.UnavailableItems
                    .Select(i => $"{i.ProductName}: requested {i.Requested}, available {i.Available}");
                result.AddErrorMessage("Stock unavailable: " + string.Join("; ", errorMessages));
                return result;
            }
        }

        // Calculate total shipping cost from selected options before refreshing discounts
        // This ensures free shipping discounts have accurate shipping costs to work with
        var totalShippingCost = 0m;
        if (requiresShipping)
        {
            foreach (var group in shippingResult.WarehouseGroups)
            {
                // First check if the strategy already resolved the selection (POST-SELECTION flow)
                var selectionKey = group.SelectedShippingOptionId ?? string.Empty;

                // Fall back to lookup from checkout session if not set
                if (string.IsNullOrEmpty(selectionKey))
                {
                    selectionKey = checkoutSession.SelectedShippingOptions.GetValueOrDefault(group.GroupId) ?? string.Empty;
                }
                if (string.IsNullOrEmpty(selectionKey))
                {
                    selectionKey = checkoutSession.SelectedShippingOptions.GetValueOrDefault(group.WarehouseId) ?? string.Empty;
                }

                var selectedOption = group.AvailableShippingOptions
                    .FirstOrDefault(o => o.SelectionKey == selectionKey);
                if (selectedOption != null)
                {
                    totalShippingCost += selectedOption.Cost;
                }
                else if (checkoutSession.QuotedShippingCosts.TryGetValue(group.GroupId, out var quotedCost))
                {
                    // Fallback to quoted cost for dynamic providers
                    totalShippingCost += quotedCost.Cost;
                }
            }
        }

        // Update basket shipping total with resolved costs
        basket.Shipping = totalShippingCost;

        // NOW refresh automatic discounts with accurate shipping context
        // This ensures free shipping discounts are calculated correctly
        var countryCode = checkoutSession.ShippingAddress.CountryCode ?? "US";
        basket = await checkoutDiscountService.Value.RefreshAutomaticDiscountsAsync(basket, countryCode, cancellationToken);

        using var scope = efCoreScopeProvider.CreateScope();
        var (invoice, orders) = await scope.ExecuteWithContextAsync<(Invoice? Invoice, List<Order> Orders)>(async db =>
        {
            // Generate next invoice number using MAX+1 (unique index prevents duplicates)
            var maxNumber = await db.Invoices
                .Select(i => i.InvoiceNumber)
                .Where(n => n.StartsWith(_settings.InvoiceNumberPrefix))
                .Select(n => n.Substring(_settings.InvoiceNumberPrefix.Length))
                .ToListAsync(cancellationToken);

            var nextNumber = maxNumber
                .Select(n => int.TryParse(n, out var num) ? num : 0)
                .DefaultIfEmpty(0)
                .Max() + 1;

            var invoiceNumber = $"{_settings.InvoiceNumberPrefix}{nextNumber:D4}";

            // Load flat-rate shipping options - parse SelectionKeys to extract Guids
            var shippingOptionIds = new List<Guid>();
            foreach (var selKey in checkoutSession.SelectedShippingOptions.Values)
            {
                if (Shipping.Extensions.SelectionKeyExtensions.TryParse(selKey, out var optionId, out _, out _) && optionId.HasValue)
                {
                    shippingOptionIds.Add(optionId.Value);
                }
            }
            shippingOptionIds = shippingOptionIds.Distinct().ToList();

            var shippingOptions = shippingOptionIds.Count > 0
                ? await db.ShippingOptions
                    .Where(so => shippingOptionIds.Contains(so.Id))
                    .ToDictionaryAsync(so => so.Id, cancellationToken)
                : new Dictionary<Guid, ShippingOption>();

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
                customer.Id,
                source,
                purchaseOrder: purchaseOrder);

            // Persist upsell impressions from checkout session for conversion attribution
            if (checkoutSession.UpsellImpressions.Count > 0)
            {
                newInvoice.ExtendedData[Constants.ExtendedDataKeys.UpsellImpressions] =
                    JsonSerializer.Serialize(checkoutSession.UpsellImpressions);
            }

            ExchangeRateQuote? pricingQuote = null;
            if (!string.Equals(presentmentCurrency, storeCurrency, StringComparison.OrdinalIgnoreCase))
            {
                pricingQuote = await exchangeRateCache.GetRateQuoteAsync(presentmentCurrency, storeCurrency, cancellationToken);

                if (pricingQuote == null || pricingQuote.Rate <= 0m)
                {
                    result.AddErrorMessage($"No exchange rate available to create invoice in '{presentmentCurrency}' (store currency '{storeCurrency}').");
                    return (null, []);
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
                // First check if the strategy already resolved the selection (POST-SELECTION flow)
                var selectionKey = group.SelectedShippingOptionId ?? string.Empty;

                // Fall back to lookup from checkout session if not set
                if (string.IsNullOrEmpty(selectionKey))
                {
                    selectionKey = checkoutSession.SelectedShippingOptions.GetValueOrDefault(group.GroupId) ?? string.Empty;
                }
                if (string.IsNullOrEmpty(selectionKey))
                {
                    selectionKey = checkoutSession.SelectedShippingOptions.GetValueOrDefault(group.WarehouseId) ?? string.Empty;
                }

                // Parse the SelectionKey to determine if flat-rate or dynamic
                if (!Shipping.Extensions.SelectionKeyExtensions.TryParse(selectionKey, out var shippingOptionId, out var providerKey, out var serviceCode))
                {
                    logger.LogWarning("Invalid or missing shipping selection for warehouse group {GroupId} (Warehouse: {WarehouseId})",
                        group.GroupId, group.WarehouseId);
                    continue;
                }

                // Variables for order creation
                decimal baseShippingCost;
                Guid orderShippingOptionId;
                string? orderProviderKey = null;
                string? orderServiceCode = null;
                string? orderServiceName = null;
                decimal? quotedShippingCost = null;
                DateTime? quotedAt = null;
                bool? isDeliveryDateGuaranteed = null;

                if (shippingOptionId.HasValue)
                {
                    // Flat-rate ShippingOption selection
                    if (!shippingOptions.TryGetValue(shippingOptionId.Value, out var shippingOption))
                    {
                        logger.LogWarning("Shipping option {ShippingOptionId} not found for warehouse group {GroupId}",
                            shippingOptionId.Value, group.GroupId);
                        continue;
                    }

                    orderShippingOptionId = shippingOptionId.Value;
                    orderProviderKey = shippingOption.ProviderKey;
                    baseShippingCost = ConvertToPresentmentCurrency(
                        CalculateShippingCost(shippingOption, checkoutSession.ShippingAddress),
                        pricingQuote,
                        presentmentCurrency);
                    isDeliveryDateGuaranteed = shippingOption.IsDeliveryDateGuaranteed;
                }
                else if (!string.IsNullOrEmpty(providerKey) && !string.IsNullOrEmpty(serviceCode))
                {
                    // Dynamic provider selection
                    orderShippingOptionId = Guid.Empty;
                    orderProviderKey = providerKey;
                    orderServiceCode = serviceCode;

                    // Get the shipping info from the group's available options
                    var dynamicOption = group.AvailableShippingOptions
                        .FirstOrDefault(o => o.SelectionKey == selectionKey);
                    orderServiceName = dynamicOption?.ServiceName ?? dynamicOption?.Name;

                    // Use quoted cost from session (captured at selection time)
                    if (checkoutSession.QuotedShippingCosts.TryGetValue(group.GroupId, out var quoted))
                    {
                        baseShippingCost = ConvertToPresentmentCurrency(quoted.Cost, pricingQuote, presentmentCurrency);
                        quotedShippingCost = quoted.Cost;
                        quotedAt = quoted.QuotedAt;
                    }
                    else if (dynamicOption != null)
                    {
                        baseShippingCost = ConvertToPresentmentCurrency(dynamicOption.Cost, pricingQuote, presentmentCurrency);
                        quotedShippingCost = dynamicOption.Cost;
                        quotedAt = DateTime.UtcNow;
                    }
                    else
                    {
                        logger.LogWarning("No quoted cost found for dynamic shipping selection {SelectionKey} in group {GroupId}",
                            selectionKey, group.GroupId);
                        continue;
                    }
                }
                else
                {
                    logger.LogWarning("Invalid shipping selection format for warehouse group {GroupId}: {SelectionKey}",
                        group.GroupId, selectionKey);
                    continue;
                }

                // Infer service category from delivery time data (works for both flat-rate and dynamic)
                // Flat-rate options populate DaysFrom/DaysTo from ShippingOption.MinDeliveryDays/MaxDeliveryDays
                // Dynamic options populate from carrier API transit time responses
                var selectedOptionInfo = group.AvailableShippingOptions
                    .FirstOrDefault(o => o.SelectionKey == selectionKey);
                var orderServiceCategory = InferServiceCategory(selectedOptionInfo);

                // Check for delivery date selection
                DateTime? requestedDeliveryDate = null;
                decimal? deliveryDateSurcharge = null;

                if (checkoutSession.SelectedDeliveryDates.TryGetValue(group.GroupId, out var selectedDate))
                {
                    requestedDeliveryDate = selectedDate;
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

                    // Convert line item amount from store currency to presentment currency
                    var orderLineItem = lineItemFactory.CreateForOrder(
                        basketLineItem,
                        shippingLineItem.Quantity,
                        ConvertToPresentmentCurrency(shippingLineItem.Amount, pricingQuote, presentmentCurrency),
                        cost);

                    orderLineItems.Add(orderLineItem);

                    // Attach any add-on (custom) items dependent on this product SKU
                    var dependentAddons = basket.LineItems
                        .Where(li => li.IsAddonLinkedToParent(basketLineItem))
                        .ToList();

                    foreach (var addon in dependentAddons)
                    {
                        // Convert add-on amount from store currency to presentment currency
                        var addonOrderLine = lineItemFactory.CreateAddonForOrder(
                            addon,
                            shippingLineItem.Quantity,
                            ConvertToPresentmentCurrency(addon.Amount, pricingQuote, presentmentCurrency));
                        addonOrderLine.SetParentLineItemId(orderLineItem.Id);
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
                        // Convert discount amount from store currency to presentment currency, then scale
                        var discountOrderLine = lineItemFactory.CreateDiscountForOrder(
                            discountLineItem,
                            shippingLineItem.Quantity,
                            basketLineItem.Quantity,
                            ConvertToPresentmentCurrency(discountLineItem.Amount, pricingQuote, presentmentCurrency),
                            presentmentCurrency);
                        orderLineItems.Add(discountOrderLine);
                    }
                }

                var order = orderFactory.Create(
                    newInvoice.Id,
                    group.WarehouseId,
                    orderShippingOptionId,
                    totalShippingCost);
                order.RequestedDeliveryDate = requestedDeliveryDate;
                order.IsDeliveryDateGuaranteed = isDeliveryDateGuaranteed;
                order.DeliveryDateSurcharge = deliveryDateSurcharge;
                order.LineItems = orderLineItems;

                // Set dynamic provider fields
                order.ShippingProviderKey = orderProviderKey;
                order.ShippingServiceCode = orderServiceCode;
                order.ShippingServiceName = orderServiceName;
                order.ShippingServiceCategory = orderServiceCategory;
                order.QuotedShippingCost = quotedShippingCost;
                order.QuotedAt = quotedAt;

                orders.Add(order);
            }

            var groupedLineItemIds = shippingResult.WarehouseGroups
                .SelectMany(g => g.LineItems)
                .Select(li => li.LineItemId)
                .ToHashSet();

            var ungroupedProductItems = basket.LineItems
                .Where(li => li.LineItemType == LineItemType.Product && !groupedLineItemIds.Contains(li.Id))
                .ToList();

            if (ungroupedProductItems.Count > 0)
            {
                var targetOrder = orders.FirstOrDefault();
                if (targetOrder == null)
                {
                    var fallbackWarehouseId = await db.Warehouses
                        .AsNoTracking()
                        .Select(w => w.Id)
                        .FirstOrDefaultAsync(cancellationToken);

                    if (fallbackWarehouseId == Guid.Empty)
                    {
                        result.AddErrorMessage("No warehouse available for digital order creation.");
                        return (null, []);
                    }

                    targetOrder = orderFactory.Create(newInvoice.Id, fallbackWarehouseId, Guid.Empty, 0);
                    targetOrder.ShippingProviderKey = "digital";
                    targetOrder.ShippingServiceCode = "digital";
                    targetOrder.ShippingServiceName = "Digital delivery";
                    orders.Add(targetOrder);
                }

                foreach (var basketLineItem in ungroupedProductItems)
                {
                    var cost = 0m;
                    if (basketLineItem.ProductId.HasValue &&
                        products.TryGetValue(basketLineItem.ProductId.Value, out var product))
                    {
                        cost = product.CostOfGoods;
                    }

                    var orderLineItem = lineItemFactory.CreateForOrder(
                        basketLineItem,
                        basketLineItem.Quantity,
                        ConvertToPresentmentCurrency(basketLineItem.Amount, pricingQuote, presentmentCurrency),
                        cost);

                    targetOrder.LineItems!.Add(orderLineItem);

                    var dependentAddons = basket.LineItems
                        .Where(li => li.IsAddonLinkedToParent(basketLineItem))
                        .ToList();

                    foreach (var addon in dependentAddons)
                    {
                        var addonOrderLine = lineItemFactory.CreateAddonForOrder(
                            addon,
                            basketLineItem.Quantity,
                            ConvertToPresentmentCurrency(addon.Amount, pricingQuote, presentmentCurrency));
                        addonOrderLine.SetParentLineItemId(orderLineItem.Id);
                        targetOrder.LineItems.Add(addonOrderLine);
                    }

                    var dependentDiscounts = basket.LineItems
                        .Where(li => li.LineItemType == LineItemType.Discount &&
                                     !string.IsNullOrEmpty(li.DependantLineItemSku) &&
                                     !string.IsNullOrEmpty(basketLineItem.Sku) &&
                                     li.DependantLineItemSku == basketLineItem.Sku)
                        .ToList();

                    foreach (var discountLineItem in dependentDiscounts)
                    {
                        var discountOrderLine = lineItemFactory.CreateDiscountForOrder(
                            discountLineItem,
                            basketLineItem.Quantity,
                            basketLineItem.Quantity,
                            ConvertToPresentmentCurrency(discountLineItem.Amount, pricingQuote, presentmentCurrency),
                            presentmentCurrency);
                        targetOrder.LineItems.Add(discountOrderLine);
                    }
                }
            }

            if (!orders.Any())
            {
                result.AddErrorMessage("No orders were created from basket. Check shipping selections.");
                return (null, []);
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
                    // Convert order-level discount amount from store currency to presentment currency
                    var orderDiscountLine = lineItemFactory.CreateDiscountForOrder(
                        discountLineItem,
                        allocatedQuantity: 1,
                        originalQuantity: 1,
                        ConvertToPresentmentCurrency(discountLineItem.Amount, pricingQuote, presentmentCurrency),
                        presentmentCurrency);
                    firstOrderLineItems.Add(orderDiscountLine);
                }
            }

            newInvoice.Orders = orders;

            // Recalculate invoice totals from actual order line items and shipping (including shipping tax)
            var recalcError = await RecalculateInvoiceTotalsAsync(newInvoice, orders, cancellationToken);
            if (!string.IsNullOrWhiteSpace(recalcError))
            {
                result.AddErrorMessage(recalcError);
                return (null, []);
            }
            ApplyPricingRateToStoreAmounts(newInvoice, orders);

            // Publish InvoiceSavingNotification - handlers can validate/modify or cancel
            var invoiceSavingNotification = new InvoiceSavingNotification(newInvoice);
            if (await notificationPublisher.PublishCancelableAsync(invoiceSavingNotification, cancellationToken))
            {
                result.AddErrorMessage($"Invoice creation cancelled: {invoiceSavingNotification.CancelReason ?? "Cancelled by handler"}");
                return (null, []);
            }

            // Publish OrderCreatingNotification for each order - handlers can validate/modify or cancel
            foreach (var order in orders)
            {
                var orderCreatingNotification = new OrderCreatingNotification(order);
                if (await notificationPublisher.PublishCancelableAsync(orderCreatingNotification, cancellationToken))
                {
                    result.AddErrorMessage($"Order creation cancelled for warehouse {order.WarehouseId}: {orderCreatingNotification.CancelReason ?? "Cancelled by handler"}");
                    return (null, []);
                }
            }

            // Reserve stock BEFORE persisting invoice - prevents orphan invoices if reservation fails
            foreach (var order in orders)
            {
                List<string> reservationResults = [];
                var allReservationsSuccessful = true;

                foreach (var lineItem in (order.LineItems ?? []).Where(li => li.ProductId.HasValue))
                {
                    if (IsDigitalLineItem(lineItem))
                    {
                        reservationResults.Add($"Item '{lineItem.Name}' - Digital product (no stock reservation)");
                        continue;
                    }

                    var isTracked = await inventoryService.IsStockTrackedAsync(
                        lineItem.ProductId!.Value,
                        order.WarehouseId,
                        cancellationToken);

                    if (!isTracked)
                    {
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

                if (!allReservationsSuccessful)
                {
                    result.AddErrorMessage($"Failed to reserve stock for order: {string.Join("; ", reservationResults)}");
                    return (null, []);
                }

                order.Status = OrderStatus.ReadyToFulfill;

                logger.LogInformation("Order {OrderId} stock reservations: {Reservations}",
                    order.Id, string.Join("; ", reservationResults));
            }

            // Publish OrderSavingNotification for each order before persistence
            foreach (var order in orders)
            {
                var orderSavingNotification = new OrderSavingNotification(order);
                if (await notificationPublisher.PublishCancelableAsync(orderSavingNotification, cancellationToken))
                {
                    logger.LogWarning("Order {OrderId} save notification cancelled: {Reason}",
                        order.Id, orderSavingNotification.CancelReason);
                }
            }

            // Save invoice, orders, and stock reservations atomically.
            // Retry with a new invoice number on unique constraint violation (race condition).
            db.Invoices.Add(newInvoice);
            for (var attempt = 0; attempt < 3; attempt++)
            {
                try
                {
                    await db.SaveChangesAsync(cancellationToken);
                    break;
                }
                catch (DbUpdateException) when (attempt < 2)
                {
                    // Unique constraint on InvoiceNumber - regenerate and retry
                    var currentMax = await db.Invoices
                        .Select(i => i.InvoiceNumber)
                        .Where(n => n.StartsWith(_settings.InvoiceNumberPrefix))
                        .Select(n => n.Substring(_settings.InvoiceNumberPrefix.Length))
                        .ToListAsync(cancellationToken);

                    var retryNumber = currentMax
                        .Select(n => int.TryParse(n, out var num) ? num : 0)
                        .DefaultIfEmpty(0)
                        .Max() + 1;

                    newInvoice.InvoiceNumber = $"{_settings.InvoiceNumberPrefix}{retryNumber:D4}";
                }
            }

            logger.LogInformation("Created invoice {InvoiceId} with {OrderCount} orders from {GroupCount} warehouse groups",
                newInvoice.Id, orders.Count, shippingResult.WarehouseGroups.Count);

            return (newInvoice, orders);
        });

        if (invoice == null)
        {
            return result;
        }

        scope.Complete();

        // Publish post-persistence notifications AFTER scope completion
        // This ensures handlers get their own clean DbContext without nesting issues
        // Wrapped in try-catch: invoice is already committed, notification failures must not
        // prevent the invoice from being returned to the caller
        try
        {
            await notificationPublisher.PublishAsync(new InvoiceSavedNotification(invoice), cancellationToken);

            foreach (var order in orders)
            {
                await notificationPublisher.PublishAsync(new OrderCreatedNotification(order), cancellationToken);
            }

            // Publish OrderSavedNotification for each order
            foreach (var order in orders)
            {
                await notificationPublisher.PublishAsync(new OrderSavedNotification(order), cancellationToken);
            }

            // Publish aggregate notification for the entire checkout operation
            await notificationPublisher.PublishAsync(
                new InvoiceAggregateChangedNotification(
                    invoice,
                    AggregateChangeType.Created,
                    AggregateChangeSource.Invoice,
                    invoice),
                cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Error publishing post-save notifications for invoice {InvoiceId}. Invoice was saved successfully.",
                invoice.Id);
        }

        // Note: Abandoned checkout conversion is now handled on successful payment
        // via AbandonedCheckoutConversionHandler (PaymentCreatedNotification).
        // We intentionally do not mark conversion at invoice creation time.

        // Record discount usage after invoice creation (soft enforcement).
        // If limits are exceeded or a duplicate record exists, log but do not fail the order.
        try
        {
            await RecordDiscountUsageAsync(invoice, orders, invoice.CustomerId, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to record discount usage for invoice {InvoiceId}", invoice.Id);
        }

        result.ResultObject = invoice;
        return result;
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

        var regionCode = shippingAddress.CountyState?.RegionCode;
        var cost = shippingCostResolver.GetTotalShippingCost(
            shippingOption,
            countryCode,
            regionCode);

        if (cost.HasValue)
        {
            return cost.Value;
        }

        logger.LogWarning("No shipping cost configured for option {OptionId} to {Country}/{State}",
            shippingOption.Id, countryCode, regionCode);

        return 0;
    }

    private static bool BasketRequiresShipping(Basket basket)
    {
        return basket.LineItems.Any(li =>
            li.LineItemType == LineItemType.Product && !IsDigitalLineItem(li));
    }

    private static bool IsDigitalLineItem(LineItem lineItem)
    {
        if (!lineItem.ExtendedData.TryGetValue("IsDigital", out var value))
        {
            return false;
        }

        var unwrapped = value.UnwrapJsonElement();
        return unwrapped switch
        {
            bool b => b,
            string s => bool.TryParse(s, out var parsed) && parsed,
            _ => false
        };
    }

    private async Task RecordDiscountUsageAsync(
        Invoice invoice,
        IReadOnlyCollection<Order> orders,
        Guid? customerId,
        CancellationToken ct)
    {
        var discountLineItems = orders
            .SelectMany(o => o.LineItems ?? [])
            .Where(li => li.LineItemType == LineItemType.Discount)
            .ToList();

        if (discountLineItems.Count == 0)
        {
            return;
        }

        var discountAmounts = new Dictionary<Guid, decimal>();
        foreach (var lineItem in discountLineItems)
        {
            var discountId = TryGetDiscountId(lineItem);
            if (!discountId.HasValue)
            {
                continue;
            }

            var amount = Math.Abs((lineItem.AmountInStoreCurrency ?? lineItem.Amount) * lineItem.Quantity);
            if (amount <= 0)
            {
                continue;
            }

            discountAmounts.TryAdd(discountId.Value, 0m);
            discountAmounts[discountId.Value] += amount;
        }

        if (discountAmounts.Count == 0)
        {
            return;
        }

        var discounts = await discountService.GetByIdsAsync(discountAmounts.Keys.ToList(), ct);
        var discountLookup = discounts.ToDictionary(d => d.Id);

        foreach (var (discountId, amount) in discountAmounts)
        {
            discountLookup.TryGetValue(discountId, out var discount);
            var totalLimit = discount?.TotalUsageLimit;
            var perCustomerLimit = discount?.PerCustomerUsageLimit;

            var recorded = await discountService.TryRecordUsageAsync(
                discountId,
                invoice.Id,
                customerId,
                amount,
                totalLimit,
                perCustomerLimit,
                ct);

            if (recorded)
            {
                continue;
            }

            if (discount == null)
            {
                logger.LogWarning(
                    "Discount usage not recorded for invoice {InvoiceId}: discount {DiscountId} not found.",
                    invoice.Id,
                    discountId);
                continue;
            }

            if (discount.TotalUsageLimit.HasValue ||
                (discount.PerCustomerUsageLimit.HasValue && customerId.HasValue))
            {
                logger.LogWarning(
                    "Discount usage limit exceeded for discount {DiscountId} ({Code}) on invoice {InvoiceId}. Order created (soft enforcement).",
                    discount.Id,
                    discount.Code ?? "no-code",
                    invoice.Id);
            }
            else
            {
                logger.LogInformation(
                    "Discount usage not recorded for discount {DiscountId} ({Code}) on invoice {InvoiceId} (duplicate or unavailable).",
                    discount.Id,
                    discount.Code ?? "no-code",
                    invoice.Id);
            }
        }
    }

    private static Guid? TryGetDiscountId(LineItem lineItem)
    {
        if (!lineItem.ExtendedData.TryGetValue(Constants.ExtendedDataKeys.DiscountId, out var value) || value == null)
        {
            return null;
        }

        var unwrapped = value.UnwrapJsonElement();
        return unwrapped switch
        {
            Guid guid => guid,
            string s when Guid.TryParse(s, out var parsed) => parsed,
            _ => null
        };
    }

    public async Task<CrudResult<bool>> UpdateOrderStatusAsync(
        UpdateOrderStatusParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<bool>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var order = await db.Orders
                .Include(o => o.Invoice)
                .FirstOrDefaultAsync(o => o.Id == parameters.OrderId, cancellationToken);

            if (order == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = $"Order {parameters.OrderId} not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
            }

            // Check if transition is allowed
            var canTransition = await statusHandler.CanTransitionAsync(order, parameters.NewStatus, cancellationToken);
            if (!canTransition)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = $"Cannot transition order from {order.Status} to {parameters.NewStatus}",
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
            }

            var oldStatus = order.Status;

            // Publish "Before" notification - handlers can modify order or cancel
            var changingNotification = new OrderStatusChangingNotification(order, oldStatus, parameters.NewStatus, parameters.Reason);
            if (await notificationPublisher.PublishCancelableAsync(changingNotification, cancellationToken))
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = changingNotification.CancelReason ?? "Operation cancelled",
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
            }

            await statusHandler.OnStatusChangingAsync(order, oldStatus, parameters.NewStatus, cancellationToken);

            order.Status = parameters.NewStatus;
            if (!string.IsNullOrWhiteSpace(parameters.Reason) && parameters.NewStatus == OrderStatus.Cancelled)
            {
                order.CancellationReason = parameters.Reason;
            }
            if (!string.IsNullOrWhiteSpace(parameters.Reason))
            {
                order.InternalNotes = (order.InternalNotes ?? "") + $"\n[{DateTime.UtcNow:yyyy-MM-dd HH:mm}] Status change to {parameters.NewStatus}: {parameters.Reason}";
            }

            await db.SaveChangesAsync(cancellationToken);
            await statusHandler.OnStatusChangedAsync(order, oldStatus, parameters.NewStatus, cancellationToken);

            // Publish "After" notification
            await notificationPublisher.PublishAsync(
                new OrderStatusChangedNotification(order, oldStatus, parameters.NewStatus, parameters.Reason), cancellationToken);

            // Publish aggregate notification
            if (order.Invoice != null)
            {
                await notificationPublisher.PublishAsync(
                    new InvoiceAggregateChangedNotification(order.Invoice, AggregateChangeType.Updated, AggregateChangeSource.Order, order),
                    cancellationToken);
            }

            logger.LogInformation("Order {OrderId} status updated from {OldStatus} to {NewStatus}",
                parameters.OrderId, oldStatus, parameters.NewStatus);

            result.ResultObject = true;
            return true;
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
        await scope.ExecuteWithContextAsync<bool>(async db =>
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
                return false;
            }

            // Check if order can be cancelled
            if (order.Status == OrderStatus.Shipped || order.Status == OrderStatus.Completed)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Cannot cancel an order that has already been shipped or completed",
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
            }

            if (order.Status == OrderStatus.Cancelled)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Order is already cancelled",
                    ResultMessageType = ResultMessageType.Warning
                });
                result.ResultObject = true;
                return false;
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
            return true;
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
        await scope.ExecuteWithContextAsync<bool>(async db =>
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
                return false;
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
                return false;
            }

            // Check if already deleted
            if (invoice.IsDeleted)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Cannot cancel a deleted invoice",
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
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
                return false;
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
            return true;
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
                .AsSplitQuery()
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

            // Apply source type filter
            if (!string.IsNullOrWhiteSpace(parameters.SourceType))
            {
                query = query.Where(i => i.Source != null && i.Source.Type == parameters.SourceType);
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
            query = ApplyOrdering(query, parameters.OrderBy, db.Database.IsSqlite());

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

    private static IQueryable<Invoice> ApplyOrdering(IQueryable<Invoice> query, InvoiceOrderBy orderBy, bool isSqlite)
    {
        return orderBy switch
        {
            InvoiceOrderBy.DateAsc => query.OrderBy(i => i.DateCreated),
            InvoiceOrderBy.DateDesc => query.OrderByDescending(i => i.DateCreated),
            // SQLite decimal ordering can translate to ef_compare, which may be unavailable
            // in some runtime setups. Cast to double for provider-safe ordering.
            InvoiceOrderBy.TotalAsc => isSqlite
                ? query.OrderBy(i => (double)(i.TotalInStoreCurrency ?? i.Total))
                : query.OrderBy(i => i.TotalInStoreCurrency ?? i.Total),
            InvoiceOrderBy.TotalDesc => isSqlite
                ? query.OrderByDescending(i => (double)(i.TotalInStoreCurrency ?? i.Total))
                : query.OrderByDescending(i => i.TotalInStoreCurrency ?? i.Total),
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
                .Include(i => i.Orders)!
                    .ThenInclude(o => o.FulfilmentProviderConfiguration)
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

        // Load invoices before deletion for notifications
        List<Invoice> invoicesToDelete;
        using (var readScope = efCoreScopeProvider.CreateScope())
        {
            invoicesToDelete = await readScope.ExecuteWithContextAsync(async db =>
                await db.Invoices
                    .AsNoTracking()
                    .Where(i => idList.Contains(i.Id) && !i.IsDeleted)
                    .ToListAsync(cancellationToken));
            readScope.Complete();
        }

        if (invoicesToDelete.Count == 0)
        {
            return 0;
        }

        // Publish "Before" notifications - handlers can cancel individual invoices
        var idsToDelete = new List<Guid>();
        var deletedInvoices = new List<Invoice>();

        foreach (var invoice in invoicesToDelete)
        {
            var deletingNotification = new InvoiceDeletingNotification(invoice);
            if (await notificationPublisher.PublishCancelableAsync(deletingNotification, cancellationToken))
            {
                logger.LogInformation("Invoice {InvoiceId} deletion cancelled: {Reason}",
                    invoice.Id, deletingNotification.CancelReason);
                continue;
            }

            idsToDelete.Add(invoice.Id);
            deletedInvoices.Add(invoice);
        }

        if (idsToDelete.Count == 0)
        {
            return 0;
        }

        using var scope = efCoreScopeProvider.CreateScope();
        var deletedCount = await scope.ExecuteWithContextAsync(async db =>
        {
            var now = DateTime.UtcNow;
            var count = await db.Invoices
                .Where(i => idsToDelete.Contains(i.Id))
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(i => i.IsDeleted, true)
                    .SetProperty(i => i.DateDeleted, now)
                    .SetProperty(i => i.DateUpdated, now),
                    cancellationToken);

            logger.LogInformation("Soft-deleted {Count} invoices", count);
            return count;
        });

        scope.Complete();

        // Publish "After" notifications
        foreach (var invoice in deletedInvoices)
        {
            await notificationPublisher.PublishAsync(
                new InvoiceDeletedNotification(invoice),
                cancellationToken);
        }

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
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var invoice = await db.Invoices.FirstOrDefaultAsync(i => i.Id == invoiceId, cancellationToken);
            if (invoice == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Invoice not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
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
            return true;
        });
        scope.Complete();

        return result;
    }

    /// <inheritdoc />
    public Task<CrudResult<Address>> UpdateBillingAddressAsync(
        Guid invoiceId,
        Address address,
        CancellationToken cancellationToken = default)
    {
        return UpdateInvoiceFieldAsync(
            invoiceId,
            invoice =>
            {
                invoice.BillingAddress = address;
                return address;
            },
            cancellationToken);
    }

    /// <inheritdoc />
    public Task<CrudResult<Address>> UpdateShippingAddressAsync(
        Guid invoiceId,
        Address address,
        CancellationToken cancellationToken = default)
    {
        return UpdateInvoiceFieldAsync(
            invoiceId,
            invoice =>
            {
                invoice.ShippingAddress = address;
                return address;
            },
            cancellationToken);
    }

    /// <inheritdoc />
    public Task<CrudResult<string?>> UpdatePurchaseOrderAsync(
        Guid invoiceId,
        string? purchaseOrder,
        CancellationToken cancellationToken = default)
    {
        return UpdateInvoiceFieldAsync(
            invoiceId,
            invoice =>
            {
                invoice.PurchaseOrder = purchaseOrder;
                return purchaseOrder;
            },
            cancellationToken);
    }

    private async Task<CrudResult<T>> UpdateInvoiceFieldAsync<T>(
        Guid invoiceId,
        Func<Invoice, T> applyUpdate,
        CancellationToken cancellationToken)
    {
        var result = new CrudResult<T>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var invoice = await db.Invoices.FirstOrDefaultAsync(i => i.Id == invoiceId, cancellationToken);
            if (invoice == null)
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = "Invoice not found",
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
            }

            result.ResultObject = applyUpdate(invoice);
            invoice.DateUpdated = DateTime.UtcNow;

            await db.SaveChangesAsync(cancellationToken);
            return true;
        });
        scope.Complete();

        return result;
    }

    /// <inheritdoc />
    public Task<CrudResult<Invoice>> SetDueDateAsync(
        Guid invoiceId,
        DateTime? dueDate,
        CancellationToken cancellationToken = default)
    {
        return UpdateInvoiceFieldAsync(
            invoiceId,
            invoice =>
            {
                invoice.DueDate = dueDate;
                return invoice;
            },
            cancellationToken);
    }

    /// <inheritdoc />
    public async Task<CrudResult<Invoice>> BackdateInvoiceAsync(
        Guid invoiceId,
        DateTime dateCreated,
        CancellationToken cancellationToken = default)
    {
        var result = new CrudResult<Invoice>();

        using var scope = efCoreScopeProvider.CreateScope();
        await scope.ExecuteWithContextAsync<bool>(async db =>
        {
            var invoice = await db.Invoices
                .Include(i => i.Orders!)
                    .ThenInclude(o => o.LineItems!)
                .Include(i => i.Orders!)
                    .ThenInclude(o => o.Shipments!)
                .Include(i => i.Payments!)
                .AsSplitQuery()
                .FirstOrDefaultAsync(i => i.Id == invoiceId, cancellationToken);

            if (invoice == null)
            {
                result.AddErrorMessage("Invoice not found.");
                return false;
            }

            invoice.DateCreated = dateCreated;
            invoice.DateUpdated = dateCreated;

            foreach (var order in invoice.Orders ?? [])
            {
                order.DateCreated = dateCreated;
                order.DateUpdated = dateCreated;

                foreach (var lineItem in order.LineItems ?? [])
                    lineItem.DateCreated = dateCreated;

                foreach (var shipment in order.Shipments ?? [])
                    shipment.DateCreated = dateCreated;
            }

            foreach (var payment in invoice.Payments ?? [])
                payment.DateCreated = dateCreated;

            if (invoice.Notes is { Count: > 0 })
            {
                foreach (var note in invoice.Notes)
                    note.DateCreated = dateCreated;
            }

            await db.SaveChangesAsync(cancellationToken);
            result.ResultObject = invoice;
            return true;
        });
        scope.Complete();

        return result;
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

        return await GetInvoiceCountInternalAsync(email, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<int> GetInvoiceCountAsync(CancellationToken cancellationToken = default)
    {
        return await GetInvoiceCountInternalAsync(null, cancellationToken);
    }

    private async Task<int> GetInvoiceCountInternalAsync(
        string? billingEmail,
        CancellationToken cancellationToken)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var count = await scope.ExecuteWithContextAsync(async db =>
        {
            var query = db.Invoices
                .AsNoTracking()
                .Where(i => !i.IsDeleted);

            if (!string.IsNullOrWhiteSpace(billingEmail))
            {
                query = query.Where(i => i.BillingAddress.Email == billingEmail);
            }

            return await query.CountAsync(cancellationToken);
        });
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
                .AsSplitQuery()
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




    private async Task<string?> RecalculateInvoiceTotalsAsync(Invoice invoice, List<Order> orders, CancellationToken ct)
    {
        var currencyCode = string.IsNullOrWhiteSpace(invoice.CurrencyCode) ? _settings.StoreCurrencyCode : invoice.CurrencyCode;
        var allLineItems = orders.SelectMany(o => o.LineItems ?? []).ToList();
        var shippingTotal = orders.Sum(o => o.ShippingCost);
        var taxableShippingTotal = shippingTotal > 0
            ? await GetTaxableShippingTotalAsync(invoice, shippingTotal, ct)
            : 0m;

        var shippingAddress = invoice.ShippingAddress ?? new Address();
        var countryCode = shippingAddress.CountryCode;
        var stateCode = shippingAddress.CountyState?.RegionCode;
        var taxableLineItems = BuildTaxableLineItemsForTaxCalculation(allLineItems);

        var orchestrationResult = taxOrchestrationService != null
            ? await taxOrchestrationService.CalculateAsync(
                new TaxOrchestrationRequest
                {
                    ShippingAddress = shippingAddress,
                    BillingAddress = invoice.BillingAddress,
                    CurrencyCode = currencyCode,
                    LineItems = taxableLineItems,
                    ShippingAmount = taxableShippingTotal,
                    CustomerId = invoice.CustomerId,
                    CustomerEmail = invoice.BillingAddress.Email,
                    IsTaxExempt = false,
                    TransactionDate = invoice.DateCreated,
                    ReferenceNumber = invoice.InvoiceNumber,
                    AllowEstimate = false
                },
                ct)
            : TaxOrchestrationResult.Centralized();

        if (!orchestrationResult.Success)
        {
            return orchestrationResult.ErrorMessage ?? "Authoritative tax calculation failed.";
        }

        if (!orchestrationResult.UseCentralizedCalculation && orchestrationResult.ProviderResult != null)
        {
            ApplyProviderLineResultsToLineItems(allLineItems, orchestrationResult.ProviderResult.LineResults);

            var baseResult = lineItemService.CalculateFromLineItems(new CalculateLineItemsParameters
            {
                LineItems = allLineItems,
                ShippingAmount = taxableShippingTotal,
                CurrencyCode = currencyCode,
                IsShippingTaxable = false,
                ShippingTaxRate = 0m
            });

            invoice.SubTotal = baseResult.SubTotal;
            invoice.Discount = baseResult.Discount;
            invoice.AdjustedSubTotal = baseResult.AdjustedSubTotal;
            invoice.Tax = currencyService.Round(orchestrationResult.ProviderResult.TotalTax, currencyCode);
            invoice.Total = currencyService.Round(
                invoice.AdjustedSubTotal + invoice.Tax + shippingTotal,
                currencyCode);

            decimal? effectiveShippingTaxRate = taxableShippingTotal > 0
                ? Math.Round((orchestrationResult.ProviderResult.ShippingTax / taxableShippingTotal) * 100m, 4)
                : null;
            SetEffectiveShippingTaxRate(invoice, effectiveShippingTaxRate);
            SetInvoiceTaxMetadata(
                invoice,
                orchestrationResult.ProviderAlias,
                orchestrationResult.ProviderResult.TransactionId,
                orchestrationResult.ProviderResult.IsEstimated,
                orchestrationResult.ProviderResult.EstimationReason);
            return null;
        }

        var isShippingTaxable = false;
        decimal? shippingTaxRate = null;

        if (!string.IsNullOrWhiteSpace(countryCode))
        {
            var shippingTaxConfiguration = await taxProviderManager.GetShippingTaxConfigurationAsync(
                countryCode,
                stateCode,
                ct) ?? ShippingTaxConfigurationResult.NotTaxed();

            isShippingTaxable = shippingTaxConfiguration.Mode != ShippingTaxMode.NotTaxed;
            shippingTaxRate = shippingTaxConfiguration.Mode == ShippingTaxMode.FixedRate
                ? shippingTaxConfiguration.Rate
                : null;
        }

        var calcResult = lineItemService.CalculateFromLineItems(new CalculateLineItemsParameters
        {
            LineItems = allLineItems,
            ShippingAmount = taxableShippingTotal,
            CurrencyCode = currencyCode,
            IsShippingTaxable = isShippingTaxable,
            ShippingTaxRate = shippingTaxRate
        });

        invoice.SubTotal = calcResult.SubTotal;
        invoice.Discount = calcResult.Discount;
        invoice.AdjustedSubTotal = calcResult.AdjustedSubTotal;
        invoice.Tax = calcResult.Tax;
        invoice.Total = currencyService.Round(
            calcResult.AdjustedSubTotal + invoice.Tax + shippingTotal,
            currencyCode);

        SetEffectiveShippingTaxRate(invoice, calcResult.EffectiveShippingTaxRate);
        SetInvoiceTaxMetadata(
            invoice,
            orchestrationResult.ProviderAlias,
            transactionId: null,
            isEstimated: orchestrationResult.IsEstimated,
            estimationReason: orchestrationResult.EstimationReason);

        return null;
    }

    private static List<TaxableLineItem> BuildTaxableLineItemsForTaxCalculation(IEnumerable<LineItem> lineItems)
    {
        return lineItems
            .Where(li => li.LineItemType is LineItemType.Product or LineItemType.Custom or LineItemType.Addon)
            .Select(li => new TaxableLineItem
            {
                LineItemId = li.Id,
                Sku = string.IsNullOrWhiteSpace(li.Sku) ? li.Id.ToString("N") : li.Sku!,
                Name = li.Name ?? li.Sku ?? li.Id.ToString("N"),
                Amount = li.Amount,
                Quantity = li.Quantity,
                TaxGroupId = li.TaxGroupId,
                IsTaxable = li.IsTaxable
            })
            .ToList();
    }

    private static void ApplyProviderLineResultsToLineItems(
        IReadOnlyCollection<LineItem> lineItems,
        IReadOnlyCollection<LineTaxResult> lineResults)
    {
        if (lineResults.Count == 0)
        {
            return;
        }

        var taxableLineItems = lineItems
            .Where(li => li.LineItemType is LineItemType.Product or LineItemType.Custom or LineItemType.Addon)
            .ToList();

        var byId = taxableLineItems.ToDictionary(li => li.Id);
        var bySku = taxableLineItems
            .Where(li => !string.IsNullOrWhiteSpace(li.Sku))
            .GroupBy(li => li.Sku!, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => new Queue<LineItem>(g), StringComparer.OrdinalIgnoreCase);

        foreach (var lineResult in lineResults)
        {
            LineItem? lineItem = null;

            if (lineResult.LineItemId.HasValue && byId.TryGetValue(lineResult.LineItemId.Value, out var idMatch))
            {
                lineItem = idMatch;
            }
            else if (!string.IsNullOrWhiteSpace(lineResult.Sku)
                     && bySku.TryGetValue(lineResult.Sku, out var skuMatches)
                     && skuMatches.Count > 0)
            {
                lineItem = skuMatches.Dequeue();
            }

            if (lineItem == null)
            {
                continue;
            }

            lineItem.TaxRate = lineResult.TaxRate;
            lineItem.IsTaxable = lineResult.IsTaxable;
        }
    }

    private static void SetEffectiveShippingTaxRate(Invoice invoice, decimal? effectiveShippingTaxRate)
    {
        if (effectiveShippingTaxRate.HasValue)
        {
            invoice.ExtendedData[Constants.ExtendedDataKeys.EffectiveShippingTaxRate] = effectiveShippingTaxRate.Value;
        }
        else
        {
            invoice.ExtendedData.Remove(Constants.ExtendedDataKeys.EffectiveShippingTaxRate);
        }
    }

    private static void SetInvoiceTaxMetadata(
        Invoice invoice,
        string? providerAlias,
        string? transactionId,
        bool isEstimated,
        string? estimationReason)
    {
        if (!string.IsNullOrWhiteSpace(providerAlias))
        {
            invoice.ExtendedData[Constants.ExtendedDataKeys.TaxProviderAlias] = providerAlias;
        }
        else
        {
            invoice.ExtendedData.Remove(Constants.ExtendedDataKeys.TaxProviderAlias);
        }

        if (!string.IsNullOrWhiteSpace(transactionId))
        {
            invoice.ExtendedData[Constants.ExtendedDataKeys.TaxProviderTransactionId] = transactionId;
        }
        else
        {
            invoice.ExtendedData.Remove(Constants.ExtendedDataKeys.TaxProviderTransactionId);
        }

        invoice.ExtendedData[Constants.ExtendedDataKeys.TaxIsEstimated] = isEstimated;

        if (!string.IsNullOrWhiteSpace(estimationReason))
        {
            invoice.ExtendedData[Constants.ExtendedDataKeys.TaxEstimationReason] = estimationReason;
        }
        else
        {
            invoice.ExtendedData.Remove(Constants.ExtendedDataKeys.TaxEstimationReason);
        }
    }

    /// <summary>
    /// Gets the portion of shipping that should be taxed, excluding shipping from providers
    /// where rates already include tax (RatesIncludeTax = true).
    /// </summary>
    private async Task<decimal> GetTaxableShippingTotalAsync(
        Invoice invoice,
        decimal shippingTotal,
        CancellationToken ct)
    {
        // If no orders or no shipping, return the original total
        if (invoice.Orders == null || !invoice.Orders.Any() || shippingTotal <= 0)
        {
            return shippingTotal;
        }

        var taxInclusiveShipping = 0m;

        // Group orders by shipping option to minimize lookups
        var shippingOptionIds = invoice.Orders
            .Select(o => o.ShippingOptionId)
            .Distinct()
            .ToList();

        foreach (var shippingOptionId in shippingOptionIds)
        {
            var shippingOption = await shippingService.GetShippingOptionByIdAsync(shippingOptionId, ct);
            if (shippingOption?.ProviderKey == null)
            {
                continue;
            }

            // Check if provider has RatesIncludeTax = true
            var provider = await shippingProviderManager.GetProviderAsync(shippingOption.ProviderKey, requireEnabled: false, ct);
            if (provider?.Metadata.RatesIncludeTax == true)
            {
                // Sum shipping costs from orders using this option
                var shippingFromProvider = invoice.Orders
                    .Where(o => o.ShippingOptionId == shippingOptionId)
                    .Sum(o => o.ShippingCost);
                taxInclusiveShipping += shippingFromProvider;
            }
        }

        // Return only the taxable portion
        return Math.Max(0, shippingTotal - taxInclusiveShipping);
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
                    lineItem.CostInStoreCurrency = null;
                    lineItem.OriginalAmountInStoreCurrency = null;
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

                if (lineItem.Cost > 0)
                {
                    lineItem.CostInStoreCurrency = currencyService.Round(lineItem.Cost * rate, storeCurrency);
                }

                if (lineItem.OriginalAmount.HasValue)
                {
                    lineItem.OriginalAmountInStoreCurrency = currencyService.Round(lineItem.OriginalAmount.Value * rate, storeCurrency);
                }
            }
        }

        invoice.SubTotalInStoreCurrency = currencyService.Round(invoice.SubTotal * rate, storeCurrency);
        invoice.DiscountInStoreCurrency = currencyService.Round(invoice.Discount * rate, storeCurrency);
        invoice.TaxInStoreCurrency = currencyService.Round(invoice.Tax * rate, storeCurrency);
        invoice.TotalInStoreCurrency = currencyService.Round(invoice.Total * rate, storeCurrency);
    }

    /// <summary>
    /// Converts an amount from store currency to presentment currency.
    /// Used during invoice creation to convert basket amounts (stored in store currency)
    /// to the customer's selected display currency.
    /// </summary>
    /// <param name="storeCurrencyAmount">Amount in store currency (e.g., USD)</param>
    /// <param name="pricingQuote">Exchange rate quote (presentment → store), or null if same currency</param>
    /// <param name="presentmentCurrency">Target currency code (e.g., "GBP")</param>
    /// <returns>Amount converted to presentment currency with proper rounding</returns>
    private decimal ConvertToPresentmentCurrency(
        decimal storeCurrencyAmount,
        ExchangeRateQuote? pricingQuote,
        string presentmentCurrency)
    {
        // If no quote (same currency), no conversion needed
        if (pricingQuote == null || pricingQuote.Rate <= 0m)
            return storeCurrencyAmount;

        // Delegate to centralized method in ICurrencyService
        return currencyService.ConvertToPresentmentCurrency(storeCurrencyAmount, pricingQuote.Rate, presentmentCurrency);
    }

    internal static ShippingServiceCategory? InferServiceCategory(ShippingOptionInfo? option)
    {
        if (option == null) return null;

        // IsNextDay explicitly set (flat-rate or dynamic)
        if (option.IsNextDay) return ShippingServiceCategory.Overnight;

        // No delivery time data configured
        if (option.DaysFrom <= 0) return null;

        return option.DaysFrom switch
        {
            <= 1 => ShippingServiceCategory.Overnight,
            <= 3 => ShippingServiceCategory.Express,
            <= 7 => ShippingServiceCategory.Standard,
            _ => ShippingServiceCategory.Economy
        };
    }


    /// <inheritdoc />
    public async Task<OperationResult<CreateManualOrderResultDto>> CreateManualOrderAsync(
        CreateManualOrderDto request,
        Guid? authorId,
        string? authorName,
        CancellationToken cancellationToken = default)
    {
        // Validate billing email exists
        var billingEmail = request.BillingAddress.Email;
        if (string.IsNullOrWhiteSpace(billingEmail))
        {
            return OperationResult<CreateManualOrderResultDto>.Fail("Billing email is required to create a manual order.");
        }

        // Get or create customer from billing email (outside scope to avoid nesting)
        var billingAddress = MapDtoToAddress(request.BillingAddress);
        var customer = await customerService.GetOrCreateByEmailAsync(new GetOrCreateCustomerParameters
        {
            Email = billingEmail,
            BillingAddress = billingAddress,
            AcceptsMarketing = false
        }, cancellationToken);

        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync<OperationResult<CreateManualOrderResultDto>>(async db =>
        {
            // Generate next invoice number using MAX+1 (unique index prevents duplicates)
            var maxNumbers = await db.Invoices
                .Select(i => i.InvoiceNumber)
                .Where(n => n.StartsWith(_settings.InvoiceNumberPrefix))
                .Select(n => n.Substring(_settings.InvoiceNumberPrefix.Length))
                .ToListAsync(cancellationToken);

            var nextNumber = maxNumbers
                .Select(n => int.TryParse(n, out var num) ? num : 0)
                .DefaultIfEmpty(0)
                .Max() + 1;

            var invoiceNumber = $"{_settings.InvoiceNumberPrefix}{nextNumber:D4}";

            // Use shipping address if provided, otherwise use billing address
            var shippingAddress = request.ShippingAddress != null
                ? MapDtoToAddress(request.ShippingAddress)
                : CloneAddress(billingAddress);

            var currencyCode = _settings.StoreCurrencyCode;

            // Calculate totals from custom items (if any)
            decimal subTotal = 0;
            decimal tax = 0;
            Dictionary<Guid, decimal> taxGroups = [];

            if (request.CustomItems.Any())
            {
                // Get tax groups for custom items
                var taxGroupIds = request.CustomItems
                    .Where(c => c.TaxGroupId.HasValue)
                    .Select(c => c.TaxGroupId!.Value)
                    .Distinct()
                    .ToList();

                taxGroups = taxGroupIds.Count > 0
                    ? await db.TaxGroups
                        .Where(tg => taxGroupIds.Contains(tg.Id))
                        .ToDictionaryAsync(tg => tg.Id, tg => tg.TaxPercentage, cancellationToken)
                    : [];

                foreach (var item in request.CustomItems)
                {
                    var addonTotalPerUnit = GetValidCustomItemAddons(item).Sum(addon => addon.PriceAdjustment);
                    var itemTotal = (item.Price + addonTotalPerUnit) * item.Quantity;
                    subTotal += itemTotal;

                    if (item.TaxGroupId.HasValue && taxGroups.TryGetValue(item.TaxGroupId.Value, out var taxRate))
                    {
                        tax += itemTotal * (taxRate / 100m);
                    }
                }
            }

            var total = subTotal + tax;

            // Create the invoice
            var invoice = invoiceFactory.CreateManual(
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

            // Only create an order if there are custom items to add
            // Otherwise, orders will be created when products are added via the edit flow
            if (request.CustomItems.Any())
            {
                // Get first warehouse and its first shipping option for custom items
                var warehouse = await db.Warehouses
                    .Include(w => w.ShippingOptions)
                    .FirstOrDefaultAsync(cancellationToken);

                if (warehouse == null)
                {
                    return OperationResult<CreateManualOrderResultDto>.Fail("No warehouse found. Please configure at least one warehouse.");
                }

                var shippingOption = warehouse.ShippingOptions.FirstOrDefault();
                if (shippingOption == null)
                {
                    return OperationResult<CreateManualOrderResultDto>.Fail($"Warehouse '{warehouse.Name}' has no shipping options. Please configure at least one shipping option.");
                }

                var order = orderFactory.Create(
                    invoice.Id,
                    warehouse.Id,
                    shippingOption.Id,
                    shippingCost: 0);
                order.Invoice = invoice;
                order.LineItems = [];

                // Add custom items as line items
                foreach (var customItem in request.CustomItems)
                {
                    var taxRate = customItem.TaxGroupId.HasValue && taxGroups.TryGetValue(customItem.TaxGroupId.Value, out var rate)
                        ? rate
                        : 0m;

                    var lineItem = LineItemFactory.CreateCustomLineItem(
                        orderId: order.Id,
                        name: customItem.Name,
                        sku: customItem.Sku,
                        amount: customItem.Price,
                        cost: customItem.Cost,
                        quantity: customItem.Quantity,
                        isTaxable: customItem.TaxGroupId.HasValue,
                        taxRate: taxRate,
                        extendedData: new Dictionary<string, object>
                        {
                            [Constants.ExtendedDataKeys.IsPhysicalProduct] = customItem.IsPhysicalProduct
                        });
                    lineItem.Order = order;

                    order.LineItems.Add(lineItem);
                    db.LineItems.Add(lineItem);

                    var addonLineItems = CreateCustomAddonLineItems(
                        order.Id,
                        lineItem.Sku ?? string.Empty,
                        lineItem.Id,
                        customItem,
                        lineItem.IsTaxable,
                        lineItem.TaxRate);
                    foreach (var addonLineItem in addonLineItems)
                    {
                        addonLineItem.Order = order;
                        order.LineItems.Add(addonLineItem);
                        db.LineItems.Add(addonLineItem);
                    }
                }

                invoice.Orders = [order];
                db.Orders.Add(order);
            }
            else
            {
                // No custom items - create invoice without orders
                // Orders will be created when products are added via the edit modal
                invoice.Orders = [];
            }

            db.Invoices.Add(invoice);

            // Retry with a new invoice number on unique constraint violation (race condition)
            for (var attempt = 0; attempt < 3; attempt++)
            {
                try
                {
                    await db.SaveChangesAsync(cancellationToken);
                    break;
                }
                catch (DbUpdateException) when (attempt < 2)
                {
                    var currentMax = await db.Invoices
                        .Select(i => i.InvoiceNumber)
                        .Where(n => n.StartsWith(_settings.InvoiceNumberPrefix))
                        .Select(n => n.Substring(_settings.InvoiceNumberPrefix.Length))
                        .ToListAsync(cancellationToken);

                    var retryNumber = currentMax
                        .Select(n => int.TryParse(n, out var num) ? num : 0)
                        .DefaultIfEmpty(0)
                        .Max() + 1;

                    invoice.InvoiceNumber = $"{_settings.InvoiceNumberPrefix}{retryNumber:D4}";
                }
            }

            return OperationResult<CreateManualOrderResultDto>.Ok(new CreateManualOrderResultDto
            {
                IsSuccessful = true,
                InvoiceId = invoice.Id,
                InvoiceNumber = invoice.InvoiceNumber
            });
        });

        scope.Complete();
        return result;
    }

    private static List<CustomItemAddonDto> GetValidCustomItemAddons(AddCustomItemDto customItem)
    {
        return (customItem.Addons ?? [])
            .Where(addon =>
                !string.IsNullOrWhiteSpace(addon.Key) &&
                !string.IsNullOrWhiteSpace(addon.Value))
            .ToList();
    }

    private static List<LineItem> CreateCustomAddonLineItems(
        Guid orderId,
        string parentSku,
        Guid parentLineItemId,
        AddCustomItemDto customItem,
        bool isTaxable,
        decimal taxRate)
    {
        var safeParentSku = string.IsNullOrWhiteSpace(parentSku)
            ? $"CUSTOM-{Guid.NewGuid():N}"[..20]
            : parentSku.Trim();
        var addons = GetValidCustomItemAddons(customItem);
        if (!addons.Any())
        {
            return [];
        }

        List<LineItem> lineItems = [];
        for (var i = 0; i < addons.Count; i++)
        {
            var addon = addons[i];
            var addonName = $"{addon.Key.Trim()}: {addon.Value.Trim()}";
            var addonSku = BuildCustomAddonSku(safeParentSku, addon, i);

            var addonLineItem = LineItemFactory.CreateAddonForOrderEdit(
                orderId: orderId,
                parentSku: safeParentSku,
                parentLineItemId: parentLineItemId,
                name: addonName,
                sku: addonSku,
                priceAdjustment: addon.PriceAdjustment,
                quantity: customItem.Quantity,
                isTaxable: isTaxable,
                taxRate: taxRate,
                extendedData: new Dictionary<string, object>
                {
                    ["CustomAddonKey"] = addon.Key.Trim(),
                    ["CustomAddonValue"] = addon.Value.Trim(),
                    ["CostAdjustment"] = addon.CostAdjustment,
                    ["SkuSuffix"] = addon.SkuSuffix?.Trim() ?? string.Empty,
                    ["IsAddon"] = true
                });
            addonLineItem.Cost = addon.CostAdjustment;

            lineItems.Add(addonLineItem);
        }

        return lineItems;
    }

    private static string BuildCustomAddonSku(string parentSku, CustomItemAddonDto addon, int index)
    {
        var suffix = addon.SkuSuffix?.Trim();
        if (!string.IsNullOrWhiteSpace(suffix))
        {
            return $"{parentSku}-{suffix}";
        }

        return $"{parentSku}-ADDON-{index + 1}";
    }

    private Address MapDtoToAddress(AddressDto dto)
    {
        var address = addressFactory.CreateAddress(
            dto.Name,
            dto.AddressOne,
            dto.AddressTwo,
            dto.TownCity,
            dto.PostalCode,
            dto.CountryCode,
            dto.CountyState,
            dto.RegionCode,
            dto.Company,
            dto.Phone,
            dto.Email);
        address.Country = dto.Country;
        return address;
    }

    private Address CloneAddress(Address source)
    {
        var clone = addressFactory.CreateAddress(
            source.Name,
            source.AddressOne,
            source.AddressTwo,
            source.TownCity,
            source.PostalCode,
            source.CountryCode,
            source.CountyState?.Name,
            source.CountyState?.RegionCode,
            source.Company,
            source.Phone,
            source.Email);
        clone.Country = source.Country;
        return clone;
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
        await scope.ExecuteWithContextAsync<bool>(async db =>
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
                return false;
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
                return false;
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
                return false;
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
                return false;
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
                    return false;
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
                return false;
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
                return false;
            }

            // Create the discount line item
            var discountLineItem = lineItemFactory.CreateDiscountLineItem(
                name: discount.Code != null ? $"{discount.Name} ({discount.Code})" : discount.Name,
                sku: existingDiscountSku,
                amount: -discountAmount,
                orderId: targetOrder.Id,
                extendedData: new Dictionary<string, object>
                {
                    [Constants.ExtendedDataKeys.DiscountId] = discount.Id.ToString(),
                    [Constants.ExtendedDataKeys.DiscountValueType] = discount.ValueType.ToString(),
                    [Constants.ExtendedDataKeys.DiscountValue] = discount.Value,
                    [Constants.ExtendedDataKeys.VisibleToCustomer] = true,
                    [Constants.ExtendedDataKeys.ApplyAfterTax] = discount.ApplyAfterTax
                });
            discountLineItem.Order = targetOrder;

            targetOrder.LineItems ??= [];
            targetOrder.LineItems.Add(discountLineItem);
            db.LineItems.Add(discountLineItem);

            // Recalculate invoice totals (including shipping tax)
            var recalcError = await RecalculateInvoiceTotalsAsync(invoice, orders, cancellationToken);
            if (!string.IsNullOrWhiteSpace(recalcError))
            {
                result.Messages.Add(new ResultMessage
                {
                    Message = recalcError,
                    ResultMessageType = ResultMessageType.Error
                });
                return false;
            }
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
            return true;
        });
        scope.Complete();

        return result;
    }


    /// <inheritdoc />
    public async Task<Invoice?> GetUnpaidInvoiceForBasketAsync(Guid basketId, CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            // Get the basket (LineItems is stored as JSON, automatically deserialized)
            var basket = await db.Baskets
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.Id == basketId, cancellationToken);

            if (basket == null)
            {
                return (Invoice: (Invoice?)null, Basket: (Basket?)null);
            }

            // Query directly on BasketId column - efficient indexed lookup
            // Include orders and line items for content validation
            var invoice = await db.Invoices
                .AsNoTracking()
                .Include(i => i.Payments)
                .Include(i => i.Orders!)
                    .ThenInclude(o => o.LineItems)
                .Where(i => i.BasketId == basketId && !i.IsDeleted && !i.IsCancelled)
                .OrderByDescending(i => i.DateCreated)
                .FirstOrDefaultAsync(cancellationToken);

            return (Invoice: invoice, Basket: basket);
        });
        scope.Complete();

        var invoice = result.Invoice;
        var basket = result.Basket;

        if (invoice == null || basket == null)
        {
            return null;
        }

        // Check if invoice has already been paid
        if (HasSuccessfulPayment(invoice.Payments))
        {
            logger.LogInformation(
                "Invoice {InvoiceId} for basket {BasketId} already has successful payment. Will create new invoice.",
                invoice.Id, basketId);
            return null;
        }

        // Validate that basket hasn't been modified since invoice was created
        // If basket was updated after invoice creation, the invoice may have stale data
        if (basket.DateUpdated > invoice.DateCreated)
        {
            logger.LogInformation(
                "Basket {BasketId} was modified ({BasketUpdated}) after invoice {InvoiceId} was created ({InvoiceCreated}). Will create new invoice instead.",
                basketId, basket.DateUpdated, invoice.Id, invoice.DateCreated);
            return null;
        }

        // Validate basket contents match invoice - ensures we don't reuse stale invoice data
        if (!BasketMatchesInvoice(basket, invoice))
        {
            logger.LogInformation(
                "Basket {BasketId} contents do not match invoice {InvoiceId}. Will create new invoice instead.",
                basketId, invoice.Id);
            return null;
        }

        logger.LogInformation(
            "Found existing unpaid invoice {InvoiceId} for basket {BasketId}",
            invoice.Id, basketId);

        return invoice;
    }

    /// <summary>
    /// Validates that basket line items match invoice order line items.
    /// Compares product SKUs and quantities to ensure the invoice hasn't become stale.
    /// </summary>
    private static bool BasketMatchesInvoice(Basket basket, Invoice invoice)
    {
        // Get product line items from basket (excluding discounts, shipping, etc.)
        var basketProductItems = basket.LineItems
            .Where(li => li.LineItemType == LineItemType.Product)
            .ToList();

        // Get all product line items from all orders in the invoice
        var invoiceProductItems = invoice.Orders?
            .SelectMany(o => o.LineItems ?? [])
            .Where(li => li.LineItemType == LineItemType.Product)
            .ToList() ?? [];

        // Quick check: same number of product line items
        if (basketProductItems.Count != invoiceProductItems.Count)
        {
            return false;
        }

        // Build lookup of invoice items by SKU for comparison
        // Group by SKU and sum quantities (in case of multi-warehouse split)
        var invoiceSkuQuantities = invoiceProductItems
            .GroupBy(li => li.Sku ?? "")
            .ToDictionary(g => g.Key, g => g.Sum(li => li.Quantity));

        // Verify each basket item has matching SKU and quantity in invoice
        foreach (var basketItem in basketProductItems)
        {
            var sku = basketItem.Sku ?? "";
            if (!invoiceSkuQuantities.TryGetValue(sku, out var invoiceQuantity))
            {
                return false; // SKU not found in invoice
            }

            if (basketItem.Quantity != invoiceQuantity)
            {
                return false; // Quantity mismatch
            }
        }

        return true;
    }

    /// <summary>
    /// Checks if an invoice has any successful payments.
    /// </summary>
    private static bool HasSuccessfulPayment(ICollection<Payment>? payments)
    {
        if (payments == null || payments.Count == 0)
            return false;

        return payments.Any(p => p.PaymentSuccess && p.PaymentType == PaymentType.Payment);
    }
}

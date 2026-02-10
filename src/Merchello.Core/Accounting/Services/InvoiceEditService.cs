using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Accounting.Factories;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core.Accounting.Services.Parameters;
using Merchello.Core.Checkout.Dtos;
using Merchello.Core.Checkout.Factories;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Strategies.Interfaces;
using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Data;
using Merchello.Core.Discounts.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Core.Shared;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Models.Enums;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shipping.Providers.Interfaces;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Tax.Providers.Interfaces;
using Merchello.Core.Tax.Providers.Models;
using Merchello.Core.Tax.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Accounting.Services;

public class InvoiceEditService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IShippingService shippingService,
    IShippingProviderManager shippingProviderManager,
    IInventoryService inventoryService,
    ICurrencyService currencyService,
    ILineItemService lineItemService,
    ITaxService taxService,
    ITaxProviderManager taxProviderManager,
    IOrderGroupingStrategyResolver strategyResolver,
    LineItemFactory lineItemFactory,
    BasketFactory basketFactory,
    OrderFactory orderFactory,
    IOptions<MerchelloSettings> settings,
    ILogger<InvoiceEditService> logger) : IInvoiceEditService
{
    private readonly MerchelloSettings _settings = settings.Value;

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
                .AsSplitQuery()
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
            // Note: This is for display purposes only. The actual stored invoice.Tax includes shipping tax.
            var calcResult = lineItemService.CalculateFromLineItems(new CalculateLineItemsParameters
            {
                LineItems = allLineItems,
                ShippingAmount = shippingTotal,
                CurrencyCode = currencyCode,
                IsShippingTaxable = false,
                ShippingTaxRate = null // Not used when IsShippingTaxable = false
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
                FulfillmentStatus = orders.GetFulfillmentStatus(),
                FulfillmentStatusCssClass = orders.GetFulfillmentStatusCssClass(),
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

            // Load products for new items (if any)
            var productsToAdd = request.ProductsToAdd;
            Dictionary<Guid, Product> productsToAddLookup = [];
            if (productsToAdd.Count > 0)
            {
                var productIdsToAdd = productsToAdd
                    .Select(p => p.ProductId)
                    .Distinct()
                    .ToList();

                productsToAddLookup = await db.Products
                    .AsNoTracking()
                    .Include(p => p.ProductRoot!)
                        .ThenInclude(pr => pr.TaxGroup)
                    .Where(p => productIdsToAdd.Contains(p.Id))
                    .ToDictionaryAsync(p => p.Id, cancellationToken);
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
                        var discountTypeStr = existingDiscount.ExtendedData?
                            .GetValueOrDefault(Constants.ExtendedDataKeys.DiscountValueType)
                            .UnwrapJsonElement()
                            ?.ToString();
                        var discountValueRaw = existingDiscount.ExtendedData?.GetValueOrDefault(Constants.ExtendedDataKeys.DiscountValue);

                        var discountValue = discountValueRaw != null
                            ? Convert.ToDecimal(discountValueRaw.UnwrapJsonElement())
                            : Math.Abs(existingDiscount.Amount);

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

            // Add new product line items (with add-ons)
            foreach (var productDto in productsToAdd)
            {
                if (!productsToAddLookup.TryGetValue(productDto.ProductId, out var product))
                {
                    warnings.Add($"Product {productDto.ProductId} not found.");
                    continue;
                }

                var warehouseId = productDto.WarehouseId;
                var isTracked = false;
                var available = 0;

                if (warehouseId != Guid.Empty)
                {
                    isTracked = await inventoryService.IsStockTrackedAsync(
                        productDto.ProductId, warehouseId, cancellationToken);
                    available = await inventoryService.GetAvailableStockAsync(
                        productDto.ProductId, warehouseId, cancellationToken);
                }

                var unitPrice = ConvertStoreToPresentmentCurrency(invoice, product.Price, currencyCode);

                // Determine tax info using the active tax provider
                var taxRate = 0m;
                var isTaxable = false;
                var taxGroupId = product.ProductRoot?.TaxGroupId;

                if (taxGroupId.HasValue && !string.IsNullOrEmpty(invoice.ShippingAddress?.CountryCode))
                {
                    taxRate = await GetTaxRateFromProviderAsync(
                        sku: product.Sku ?? $"PROD-{product.Id:N}"[..20],
                        name: product.Name ?? product.ProductRoot?.RootName ?? "Unknown Product",
                        amount: unitPrice,
                        quantity: productDto.Quantity,
                        taxGroupId: taxGroupId.Value,
                        shippingAddress: invoice.ShippingAddress,
                        currencyCode: currencyCode,
                        cancellationToken: cancellationToken);
                    isTaxable = taxRate > 0;
                }

                virtualLineItems.Add(new VirtualLineItem
                {
                    Id = Guid.NewGuid(),
                    Amount = unitPrice,
                    Quantity = productDto.Quantity,
                    IsTaxable = isTaxable,
                    TaxRate = taxRate,
                    Discount = null,
                    OriginalQuantity = 0,
                    IsStockTracked = isTracked,
                    AvailableStock = available,
                    HadOriginalDiscount = false
                });

                foreach (var addon in productDto.Addons)
                {
                    var addonPrice = ConvertStoreToPresentmentCurrency(invoice, addon.PriceAdjustment, currencyCode);
                    virtualLineItems.Add(new VirtualLineItem
                    {
                        Id = Guid.NewGuid(),
                        Amount = addonPrice,
                        Quantity = productDto.Quantity,
                        IsTaxable = isTaxable,
                        TaxRate = taxRate,
                        Discount = null,
                        OriginalQuantity = 0,
                        IsStockTracked = false,
                        AvailableStock = 0,
                        HadOriginalDiscount = false
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

            if (request.ProductsToAdd.Any())
            {
                var groupingResult = await BuildGroupingForNewItemsAsync(
                    db,
                    invoice,
                    request.ProductsToAdd,
                    cancellationToken);

                if (groupingResult.Success)
                {
                    foreach (var group in groupingResult.Groups)
                    {
                        var warehouseId = group.WarehouseId ?? Guid.Empty;
                        var selectionKey = group.SelectedShippingOptionId ?? string.Empty;

                        Shipping.Extensions.SelectionKeyExtensions.TryParse(selectionKey, out var parsedOptionId, out var providerKey, out var serviceCode);
                        var shippingOptionId = parsedOptionId ?? Guid.Empty;

                        var existingOrder = orders.FirstOrDefault(o =>
                            o.WarehouseId == warehouseId &&
                            (shippingOptionId != Guid.Empty
                                ? o.ShippingOptionId == shippingOptionId
                                : !string.IsNullOrWhiteSpace(providerKey) &&
                                  !string.IsNullOrWhiteSpace(serviceCode) &&
                                  string.Equals(o.ShippingProviderKey, providerKey, StringComparison.OrdinalIgnoreCase) &&
                                  string.Equals(o.ShippingServiceCode, serviceCode, StringComparison.OrdinalIgnoreCase)));

                        if (existingOrder == null)
                        {
                            shippingTotal += ResolveGroupShippingCost(group, invoice);
                        }
                    }
                }
                else if (groupingResult.Errors.Count > 0)
                {
                    warnings.Add($"Unable to calculate shipping for new items: {string.Join("; ", groupingResult.Errors)}");
                }
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

    /// <inheritdoc />
    public Task<PreviewDiscountResultDto> PreviewDiscountAsync(
        PreviewDiscountRequestDto request,
        CancellationToken cancellationToken = default)
    {
        var currencyCode = !string.IsNullOrWhiteSpace(request.CurrencyCode)
            ? request.CurrencyCode
            : _settings.StoreCurrencyCode;

        var lineTotal = request.LineItemPrice * request.Quantity;
        var discountAmount = request.DiscountType == DiscountValueType.FixedAmount
            ? Math.Min(request.DiscountValue * request.Quantity, lineTotal)
            : lineTotal * (request.DiscountValue / 100m);

        var roundedLineTotal = currencyService.Round(lineTotal, currencyCode);
        var roundedDiscount = currencyService.Round(discountAmount, currencyCode);

        return Task.FromResult(new PreviewDiscountResultDto
        {
            LineTotal = roundedLineTotal,
            DiscountAmount = roundedDiscount,
            DiscountedTotal = currencyService.Round(roundedLineTotal - roundedDiscount, currencyCode)
        });
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
                            var discountLineItem = lineItemFactory.CreateDiscountLineItem(
                                name: editItem.Discount.Reason ?? "Discount",
                                sku: $"DISCOUNT-{lineItem.Sku}",
                                amount: -discountAmount,
                                dependantLineItemSku: lineItem.Sku,
                                orderId: order2.Id,
                                extendedData: new Dictionary<string, object>
                                {
                                    [Constants.ExtendedDataKeys.DiscountValueType] = editItem.Discount.Type.ToString(),
                                    [Constants.ExtendedDataKeys.DiscountValue] = editItem.Discount.Value,
                                    [Constants.ExtendedDataKeys.VisibleToCustomer] = editItem.Discount.IsVisibleToCustomer
                                });

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
                        var selectionKey = group.SelectedShippingOptionId ?? string.Empty;

                        // Parse SelectionKey to get ShippingOptionId (for flat-rate) or provider info (for dynamic)
                        Shipping.Extensions.SelectionKeyExtensions.TryParse(selectionKey, out var parsedOptionId, out var providerKey, out var serviceCode);
                        var shippingOptionId = parsedOptionId ?? Guid.Empty;

                        // Find existing order for this warehouse + shipping option or create new
                        var targetOrder = orders.FirstOrDefault(o =>
                            o.WarehouseId == warehouseId && o.ShippingOptionId == shippingOptionId);
                        var groupShippingCost = ResolveGroupShippingCost(group, invoice);
                        var createdNewOrder = false;

                        if (targetOrder == null)
                        {
                            // Get shipping option name for the change log
                            var shippingOptionName = group.AvailableShippingOptions
                                .FirstOrDefault(so => so.SelectionKey == selectionKey)?.Name ?? "shipping";

                            targetOrder = orderFactory.Create(invoice.Id, warehouseId, shippingOptionId, shippingCost: groupShippingCost);
                            targetOrder.ShippingProviderKey = providerKey;
                            targetOrder.ShippingServiceCode = serviceCode;
                            targetOrder.LineItems = [];
                            db.Orders.Add(targetOrder);
                            orders.Add(targetOrder);
                            changes.Add($"Created new order for products with {shippingOptionName}");
                            createdNewOrder = true;
                        }

                        if (createdNewOrder && groupShippingCost > 0)
                        {
                            changes.Add($"  + Shipping added: {invoice.CurrencySymbol}{groupShippingCost}");
                        }

                        targetOrder.LineItems ??= [];

                        // Add products from this group
                        foreach (var groupLineItem in group.LineItems)
                        {
                            var productDto = request.ProductsToAdd.FirstOrDefault(p => p.ProductId == groupLineItem.LineItemId);
                            if (productDto != null)
                            {
                                var addProductResult = await AddProductLineItemAsync(
                                    db, invoice, targetOrder, productDto, invoice.ShippingAddress, invoice.CurrencyCode, changes, cancellationToken);
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
                                .OrderBy(w => w.Id)
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

                        var discountLineItem = lineItemFactory.CreateDiscountLineItem(
                            name: orderDiscount.Reason ?? "Order Discount",
                            sku: $"ORDERDISCOUNT-{DateTime.UtcNow.Ticks}",
                            amount: -discountAmount,
                            orderId: targetOrder.Id,
                            extendedData: new Dictionary<string, object>
                            {
                                [Constants.ExtendedDataKeys.DiscountValueType] = orderDiscount.Type.ToString(),
                                [Constants.ExtendedDataKeys.DiscountValue] = orderDiscount.Value,
                                [Constants.ExtendedDataKeys.VisibleToCustomer] = orderDiscount.IsVisibleToCustomer
                            });

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

                // Recalculate totals using stored line item tax rates (including shipping tax)
                await RecalculateInvoiceTotalsAsync(invoice, orders, cancellationToken);
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

                return OperationResult<EditInvoiceResultDto>.Ok(new EditInvoiceResultDto
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

    // ============================================
    // Private Helpers
    // ============================================

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
                    var typeStr = typeObj.UnwrapJsonElement()?.ToString();
                    if (typeStr != null && Enum.TryParse<DiscountValueType>(typeStr, out var parsedType))
                    {
                        discountValueType = parsedType;
                    }
                }

                if (d.ExtendedData?.TryGetValue(Constants.ExtendedDataKeys.DiscountValue, out var valueObj) == true)
                {
                    try { discountValue = Convert.ToDecimal(valueObj.UnwrapJsonElement()); }
                    catch { /* keep default */ }
                }

                var visibleToCustomer = false;
                if (d.ExtendedData?.TryGetValue(Constants.ExtendedDataKeys.VisibleToCustomer, out var visibleObj) == true)
                {
                    visibleToCustomer = visibleObj.UnwrapJsonElement() is true;
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
                ProductRootName = a.Name ?? "", // Add-ons use their name directly
                SelectedOptions = [], // Add-ons don't have variant options
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
            ProductRootName = lineItem.GetProductRootName(),
            SelectedOptions = lineItem.GetSelectedOptions()
                .Select(o => new SelectedOptionDto
                {
                    OptionName = o.OptionName,
                    ValueName = o.ValueName
                }).ToList(),
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
            var typeStr = typeObj.UnwrapJsonElement()?.ToString();
            if (typeStr != null && Enum.TryParse<DiscountValueType>(typeStr, out var parsedType))
            {
                discountValueType = parsedType;
            }
        }

        if (d.ExtendedData?.TryGetValue(Constants.ExtendedDataKeys.DiscountValue, out var valueObj) == true)
        {
            try { discountValue = Convert.ToDecimal(valueObj.UnwrapJsonElement()); }
            catch { /* keep default */ }
        }

        var visibleToCustomer = false;
        if (d.ExtendedData?.TryGetValue(Constants.ExtendedDataKeys.VisibleToCustomer, out var visibleObj) == true)
        {
            visibleToCustomer = visibleObj.UnwrapJsonElement() is true;
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

    private async Task RecalculateInvoiceTotalsAsync(Invoice invoice, List<Order> orders, CancellationToken ct)
    {
        var currencyCode = string.IsNullOrWhiteSpace(invoice.CurrencyCode) ? _settings.StoreCurrencyCode : invoice.CurrencyCode;
        var allLineItems = orders.SelectMany(o => o.LineItems ?? []).ToList();
        var shippingTotal = orders.Sum(o => o.ShippingCost);

        // Get shipping tax settings from provider (same approach as CheckoutService.CalculateBasketAsync)
        // This ensures invoice tax calculation matches checkout display
        var countryCode = invoice.ShippingAddress?.CountryCode;
        var stateCode = invoice.ShippingAddress?.CountyState?.RegionCode;

        var isShippingTaxable = false;
        decimal? shippingTaxRate = null;

        if (!string.IsNullOrWhiteSpace(countryCode))
        {
            isShippingTaxable = await taxProviderManager.IsShippingTaxedForLocationAsync(
                countryCode, stateCode, ct);

            if (isShippingTaxable)
            {
                shippingTaxRate = await taxProviderManager.GetShippingTaxRateForLocationAsync(
                    countryCode, stateCode, ct);
            }
        }

        // Get taxable shipping amount (excludes shipping from providers with RatesIncludeTax = true)
        var taxableShippingTotal = shippingTotal > 0
            ? await GetTaxableShippingTotalAsync(invoice, shippingTotal, ct)
            : 0m;

        // Use centralized calculation method with unified shipping tax handling
        // IMPORTANT: We use the stored TaxRate on each line item, NOT the current TaxGroup rate.
        // This ensures historical invoices are not affected by future TaxGroup rate changes.
        // Shipping tax is now calculated in the same pass as line item tax (same as checkout)
        var calcResult = lineItemService.CalculateFromLineItems(new CalculateLineItemsParameters
        {
            LineItems = allLineItems,
            ShippingAmount = taxableShippingTotal,
            CurrencyCode = currencyCode,
            IsShippingTaxable = isShippingTaxable,
            ShippingTaxRate = shippingTaxRate // null for proportional calculation
        });

        // Update invoice with calculated values
        invoice.SubTotal = calcResult.SubTotal;
        invoice.Discount = calcResult.Discount;
        invoice.AdjustedSubTotal = calcResult.AdjustedSubTotal;
        invoice.Tax = calcResult.Tax;
        invoice.Total = currencyService.Round(
            calcResult.AdjustedSubTotal + invoice.Tax + shippingTotal, currencyCode);

        // Store effective shipping tax rate in ExtendedData (for proportional mode display)
        if (calcResult.EffectiveShippingTaxRate.HasValue)
        {
            invoice.ExtendedData[Constants.ExtendedDataKeys.EffectiveShippingTaxRate] =
                calcResult.EffectiveShippingTaxRate.Value;
        }
        else
        {
            invoice.ExtendedData.Remove(Constants.ExtendedDataKeys.EffectiveShippingTaxRate);
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

    private decimal ResolveGroupShippingCost(OrderGroup group, Invoice invoice)
    {
        if (group.AvailableShippingOptions == null || group.AvailableShippingOptions.Count == 0)
        {
            return 0m;
        }

        var selectionKey = group.SelectedShippingOptionId;
        var selectedOption = !string.IsNullOrWhiteSpace(selectionKey)
            ? group.AvailableShippingOptions.FirstOrDefault(o => o.SelectionKey == selectionKey)
            : null;

        var option = selectedOption ?? group.AvailableShippingOptions.OrderBy(o => o.Cost).FirstOrDefault();
        if (option == null)
        {
            return 0m;
        }

        return ConvertStoreToPresentmentCurrency(invoice, option.Cost, invoice.CurrencyCode);
    }

    private decimal ConvertStoreToPresentmentCurrency(Invoice invoice, decimal storeAmount, string? currencyCode)
    {
        var presentmentCurrency = string.IsNullOrWhiteSpace(currencyCode)
            ? _settings.StoreCurrencyCode
            : currencyCode;

        if (string.IsNullOrWhiteSpace(invoice.CurrencyCode) ||
            string.IsNullOrWhiteSpace(invoice.StoreCurrencyCode))
        {
            return currencyService.Round(storeAmount, presentmentCurrency);
        }

        if (string.Equals(invoice.CurrencyCode, invoice.StoreCurrencyCode, StringComparison.OrdinalIgnoreCase))
        {
            return currencyService.Round(storeAmount, presentmentCurrency);
        }

        if (!invoice.PricingExchangeRate.HasValue || invoice.PricingExchangeRate.Value <= 0m)
        {
            return currencyService.Round(storeAmount, presentmentCurrency);
        }

        return currencyService.ConvertToPresentmentCurrency(
            storeAmount,
            invoice.PricingExchangeRate.Value,
            presentmentCurrency);
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

        return LineItemFactory.CreateCustomLineItem(
            orderId: orderId,
            name: customItem.Name,
            sku: string.IsNullOrWhiteSpace(customItem.Sku) ? $"CUSTOM-{DateTime.UtcNow.Ticks}" : customItem.Sku,
            amount: customItem.Price,
            cost: customItem.Cost,
            quantity: customItem.Quantity,
            isTaxable: isTaxable,
            taxRate: taxRate,
            extendedData: new Dictionary<string, object>
            {
                [Constants.ExtendedDataKeys.IsPhysicalProduct] = customItem.IsPhysicalProduct,
                ["TaxGroupId"] = customItem.TaxGroupId?.ToString() ?? string.Empty,
                ["TaxGroupName"] = taxGroupName ?? string.Empty
            });
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
                            
                .Include(p => p.ProductRoot!)
                    .ThenInclude(pr => pr!.ProductRootWarehouses)
                        .ThenInclude(prw => prw.Warehouse)
                            .ThenInclude(w => w!.ShippingOptions)
                                
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
                
            
            .Where(w => warehouseIds.Contains(w.Id))
            .ToDictionaryAsync(w => w.Id, cancellationToken);

        // Build virtual basket with line items for the products being added
        List<LineItem> virtualLineItems = [];
        var lineItemShippingSelections = new Dictionary<Guid, (Guid WarehouseId, string SelectionKey)>();

        // Add products as virtual line items
        foreach (var productDto in productsToAdd)
        {
            if (!products.TryGetValue(productDto.ProductId, out var product))
            {
                continue;
            }

            var lineItemId = productDto.ProductId; // Use ProductId as the line item identifier
            virtualLineItems.Add(LineItemFactory.CreateVirtualForPreview(
                productId: productDto.ProductId,
                name: product.Name ?? "Product",
                sku: product.Sku ?? string.Empty,
                quantity: productDto.Quantity,
                unitPrice: product.Price));

            // Record the explicit shipping selection (convert Guid to SelectionKey format)
            var selectionKey = !string.IsNullOrWhiteSpace(productDto.SelectionKey)
                ? productDto.SelectionKey
                : productDto.ShippingOptionId != Guid.Empty
                    ? Shipping.Extensions.SelectionKeyExtensions.ForShippingOption(productDto.ShippingOptionId)
                    : string.Empty;

            if (productDto.WarehouseId != Guid.Empty && !string.IsNullOrWhiteSpace(selectionKey))
            {
                lineItemShippingSelections[lineItemId] = (productDto.WarehouseId, selectionKey);
            }
        }

        // Build the virtual basket
        var storeCurrency = string.IsNullOrWhiteSpace(invoice.StoreCurrencyCode)
            ? _settings.StoreCurrencyCode
            : invoice.StoreCurrencyCode;

        var currencySymbol = currencyService.GetCurrency(storeCurrency).Symbol;
        var virtualBasket = basketFactory.Create(invoice.CustomerId, storeCurrency, currencySymbol);
        virtualBasket.LineItems = virtualLineItems;
        virtualBasket.BillingAddress = invoice.BillingAddress;
        virtualBasket.ShippingAddress = invoice.ShippingAddress;

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
        Invoice invoice,
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

        var unitPrice = ConvertStoreToPresentmentCurrency(invoice, product.Price, currencyCode);

        if (taxGroupId.HasValue && !string.IsNullOrEmpty(shippingAddress?.CountryCode))
        {
            taxRate = await GetTaxRateFromProviderAsync(
                sku: product.Sku ?? $"PROD-{product.Id:N}"[..20],
                name: product.Name ?? product.ProductRoot?.RootName ?? "Unknown Product",
                amount: unitPrice,
                quantity: productDto.Quantity,
                taxGroupId: taxGroupId.Value,
                shippingAddress: shippingAddress,
                currencyCode: currencyCode,
                cancellationToken: cancellationToken);
            isTaxable = taxRate > 0;
        }

        // Get product image (use first available from variant or root)
        var imageUrl = product.Images.FirstOrDefault()
            ?? product.ProductRoot?.RootImages.FirstOrDefault();

        // Create parent product line item
        var parentSku = product.Sku ?? $"PROD-{product.Id:N}"[..20];
        var isDigital = product.ProductRoot?.IsDigitalProduct ?? false;
        var parentLineItem = LineItemFactory.CreateProductForOrderEdit(
            orderId: targetOrder.Id,
            product: product,
            quantity: productDto.Quantity,
            isTaxable: isTaxable,
            taxRate: taxRate,
            extendedData: new Dictionary<string, object>
            {
                [Constants.ExtendedDataKeys.IsPhysicalProduct] = !isDigital,
                ["ImageUrl"] = imageUrl ?? string.Empty
            },
            unitPriceOverride: unitPrice,
            originalAmountOverride: unitPrice);

        targetOrder.LineItems!.Add(parentLineItem);
        db.LineItems.Add(parentLineItem);
        changes.Add($"Added {productDto.Quantity}x {parentLineItem.Name}");

        // Create child add-on line items
        foreach (var addon in productDto.Addons)
        {
            var addonSku = $"{parentSku}{addon.SkuSuffix ?? $"-ADDON-{addon.OptionValueId:N}"[..15]}";
            var addonPrice = ConvertStoreToPresentmentCurrency(invoice, addon.PriceAdjustment, currencyCode);
            var addonLineItem = LineItemFactory.CreateAddonForOrderEdit(
                orderId: targetOrder.Id,
                parentSku: parentSku,
                name: addon.Name,
                sku: addonSku,
                priceAdjustment: addonPrice,
                quantity: productDto.Quantity,
                isTaxable: isTaxable,
                taxRate: taxRate,
                extendedData: new Dictionary<string, object>
                {
                    ["OptionId"] = addon.OptionId.ToString(),
                    ["OptionValueId"] = addon.OptionValueId.ToString(),
                    ["CostAdjustment"] = addon.CostAdjustment,
                    ["IsAddon"] = true,
                    ["WeightKg"] = addon.WeightKg ?? 0m,
                    ["LengthCm"] = addon.LengthCm ?? 0m,
                    ["WidthCm"] = addon.WidthCm ?? 0m,
                    ["HeightCm"] = addon.HeightCm ?? 0m
                });

            targetOrder.LineItems.Add(addonLineItem);
            db.LineItems.Add(addonLineItem);
            changes.Add($"  + Add-on: {addon.Name}");
        }

        return (true, null);
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

        var result = await activeProvider.Provider.CalculateOrderTaxAsync(request, cancellationToken);
        if (!result.Success)
        {
            logger.LogWarning("Tax provider calculation failed: {ErrorMessage}", result.ErrorMessage);
            return 0m;
        }

        return result.LineResults.FirstOrDefault()?.TaxRate ?? 0m;
    }
}

using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Strategies;
using Merchello.Core.Checkout.Strategies.Interfaces;
using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Data;
using Merchello.Core.Locality.Models;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Notifications.OrderGrouping;
using Merchello.Core.Products.Extensions;
using Merchello.Core.Products.Models;
using Merchello.Core.Settings.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shipping.Dtos;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Providers.Interfaces;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Shipping.Services.Parameters;
using Merchello.Core.Warehouses.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Shipping.Services;

public class ShippingService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IOrderGroupingStrategyResolver strategyResolver,
    IMerchelloNotificationPublisher notificationPublisher,
    IShippingOptionEligibilityService shippingOptionEligibilityService,
    IShippingProviderManager providerManager,
    IOptions<MerchelloSettings> settings,
    ILogger<ShippingService> logger,
    IMerchelloStoreSettingsService? storeSettingsService = null) : IShippingService
{
    private readonly MerchelloSettings _settings = settings.Value;
    private readonly IMerchelloStoreSettingsService? _storeSettingsService = storeSettingsService;

    /// <summary>
    /// Calculates the aggregate stock status based on available stock, track stock setting, and threshold.
    /// </summary>
    private static StockStatus CalculateAggregateStockStatus(int totalAvailableStock, bool hasAnyTrackingWarehouse, int lowStockThreshold)
    {
        if (!hasAnyTrackingWarehouse)
        {
            return StockStatus.Untracked;
        }

        if (totalAvailableStock <= 0)
        {
            return StockStatus.OutOfStock;
        }

        if (totalAvailableStock <= lowStockThreshold)
        {
            return StockStatus.LowStock;
        }

        return StockStatus.InStock;
    }

    /// <summary>
    /// Calculates warehouse stock information for a product.
    /// </summary>
    /// <param name="product">The product with loaded warehouse associations</param>
    /// <param name="destinationCountryCode">Optional destination country for region serviceability check</param>
    /// <param name="destinationStateCode">Optional destination state for region serviceability check</param>
    /// <returns>Stock calculation result with fulfilling warehouse if found</returns>
    private static WarehouseStockResult CalculateWarehouseStock(
        Products.Models.Product product,
        string? destinationCountryCode = null,
        string? destinationStateCode = null)
    {
        // Get warehouse stock info for this product
        var warehouseStock = product.ProductWarehouses?
            .Where(pw => pw.Warehouse != null)
            .ToDictionary(
                pw => pw.WarehouseId,
                pw => new
                {
                    pw.Stock,
                    pw.ReservedStock,
                    pw.TrackStock,
                    AvailableStock = pw.Stock - pw.ReservedStock
                }) ?? [];

        // Get warehouses from ProductRoot in priority order
        var productRootWarehouses = product.ProductRoot?.ProductRootWarehouses?
            .OrderBy(prw => prw.PriorityOrder)
            .Where(prw => prw.Warehouse != null)
            .ToList() ?? [];

        // Calculate total available stock across all warehouses
        var totalAvailableStock = 0;
        var hasAnyStock = false;
        var hasAnyTrackingWarehouse = false;
        FulfillmentWarehouseDto? fulfillingWarehouse = null;
        var checkDestination = !string.IsNullOrEmpty(destinationCountryCode);

        foreach (var prw in productRootWarehouses)
        {
            var warehouse = prw.Warehouse!;

            // Get stock info for this warehouse
            var stockInfo = warehouseStock.GetValueOrDefault(warehouse.Id);
            if (stockInfo == null)
            {
                // No ProductWarehouse row means this variant is not stocked at this warehouse.
                // Treat as unavailable to stay consistent with WarehouseService selection logic.
                continue;
            }

            var trackStock = stockInfo.TrackStock;
            var availableStock = stockInfo.AvailableStock;

            // Accumulate total available stock
            if (trackStock)
            {
                hasAnyTrackingWarehouse = true;
                totalAvailableStock += Math.Max(0, availableStock);
                if (availableStock > 0)
                {
                    hasAnyStock = true;
                }
            }
            else
            {
                // Non-tracked stock is always available
                hasAnyStock = true;
            }

            // Skip if we already found a fulfilling warehouse
            if (fulfillingWarehouse != null)
            {
                continue;
            }

            // Check stock availability (if tracking)
            if (trackStock && availableStock <= 0)
            {
                continue;
            }

            // Check if warehouse can serve the destination region (only if destination provided)
            if (checkDestination && !warehouse.CanServeRegion(destinationCountryCode!, destinationStateCode))
            {
                continue;
            }

            // This warehouse can fulfill the order
            fulfillingWarehouse = new FulfillmentWarehouseDto
            {
                Id = warehouse.Id,
                Name = warehouse.Name ?? string.Empty,
                AvailableStock = trackStock ? availableStock : int.MaxValue
            };
        }

        return new WarehouseStockResult(totalAvailableStock, hasAnyStock, hasAnyTrackingWarehouse, fulfillingWarehouse);
    }

    private async Task<(Products.Models.Product? Product, WarehouseStockResult StockResult, StockStatus AggregateStockStatus)>
        GetProductStockContextAsync(
            Guid productId,
            string? destinationCountryCode,
            string? destinationStateCode,
            CancellationToken cancellationToken)
    {
        using var scope = efCoreScopeProvider.CreateScope();

        var product = await scope.ExecuteWithContextAsync(async db =>
            await db.Products
                .AsNoTracking()
                .Include(p => p.ProductRoot)
                    .ThenInclude(pr => pr!.ProductRootWarehouses.OrderBy(prw => prw.PriorityOrder))
                        .ThenInclude(prw => prw.Warehouse)
                .Include(p => p.ProductWarehouses)
                    .ThenInclude(pw => pw.Warehouse)
                .AsSplitQuery()
                .FirstOrDefaultAsync(p => p.Id == productId, cancellationToken));

        scope.Complete();

        if (product == null)
        {
            return (null, new WarehouseStockResult(0, false, false, null), StockStatus.OutOfStock);
        }

        var stockResult = CalculateWarehouseStock(product, destinationCountryCode, destinationStateCode);
        var lowStockThreshold = await GetLowStockThresholdAsync(cancellationToken);

        var aggregateStockStatus = CalculateAggregateStockStatus(
            stockResult.TotalAvailableStock,
            stockResult.HasAnyTrackingWarehouse,
            lowStockThreshold);

        return (product, stockResult, aggregateStockStatus);
    }

    private static ProductFulfillmentOptionsDto CreateMissingProductFulfillmentOptions()
    {
        var missingStatus = StockStatus.OutOfStock;
        return new ProductFulfillmentOptionsDto
        {
            CanAddToOrder = false,
            BlockedReason = "Product not found",
            AggregateStockStatus = missingStatus,
            AggregateStockStatusLabel = missingStatus.ToLabel(),
            AggregateStockStatusCssClass = missingStatus.ToCssClass()
        };
    }

    private async Task<int> GetLowStockThresholdAsync(CancellationToken ct)
    {
        if (_storeSettingsService == null)
        {
            return _settings.LowStockThreshold;
        }

        var runtime = await _storeSettingsService.GetRuntimeSettingsAsync(ct);
        return runtime.Merchello.LowStockThreshold;
    }

    /// <summary>
    /// Gets shipping options for a basket, grouping products by warehouse and shipping option availability.
    /// Delegates to the configured order grouping strategy for custom grouping logic.
    /// </summary>
    public async Task<ShippingSelectionResult> GetShippingOptionsForBasket(
        GetShippingOptionsParameters parameters,
        CancellationToken cancellationToken = default)
    {
        var basket = parameters.Basket;
        var shippingAddress = parameters.ShippingAddress;
        var selectedShippingOptions = parameters.SelectedShippingOptions ?? [];

        if (string.IsNullOrWhiteSpace(shippingAddress.CountryCode))
        {
            logger.LogWarning("Shipping address must have a valid country code");
            return new ShippingSelectionResult
            {
                WarehouseGroups = [],
                SubTotal = basket.SubTotal,
                Tax = basket.Tax,
                Total = basket.Total
            };
        }

        var productIds = basket.LineItems
            .Where(li => li.ProductId.HasValue)
            .Select(li => li.ProductId!.Value)
            .Distinct()
            .ToList();

        var strategy = strategyResolver.GetStrategy();
        var useAllWarehouses = !string.Equals(
            strategy.Metadata.Key,
            "default-warehouse",
            StringComparison.OrdinalIgnoreCase);

        // Load products with necessary relationships for warehouse selection
        using var scope = efCoreScopeProvider.CreateScope();
        var (products, warehouses) = await scope.ExecuteWithContextAsync(async db =>
        {
            var loadedProducts = await db.Products
                .AsNoTracking()
                .Include(p => p.ProductRoot)
                    .ThenInclude(pr => pr!.ProductRootWarehouses.OrderBy(prw => prw.PriorityOrder))
                        .ThenInclude(prw => prw.Warehouse)

                .Include(p => p.ProductRoot)
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
                .ToDictionaryAsync(p => p.Id, cancellationToken);

            Dictionary<Guid, Warehouse> loadedWarehouses;
            if (useAllWarehouses)
            {
                // Custom strategies may rely on full warehouse context.
                loadedWarehouses = await db.Warehouses
                    .AsNoTracking()
                    .Include(w => w.ShippingOptions)
                    .ToDictionaryAsync(w => w.Id, cancellationToken);
            }
            else
            {
                // Default strategy only needs warehouses referenced by products in the basket.
                var warehouseIds = loadedProducts.Values
                    .SelectMany(p => p.ProductRoot?.ProductRootWarehouses ?? [])
                    .Select(prw => prw.WarehouseId)
                    .Concat(loadedProducts.Values.SelectMany(p => p.ProductWarehouses ?? []).Select(pw => pw.WarehouseId))
                    .Distinct()
                    .ToList();

                loadedWarehouses = warehouseIds.Count == 0
                    ? []
                    : await db.Warehouses
                        .AsNoTracking()
                        .Include(w => w.ShippingOptions)
                        .Where(w => warehouseIds.Contains(w.Id))
                        .ToDictionaryAsync(w => w.Id, cancellationToken);
            }

            return (loadedProducts, loadedWarehouses);
        });
        scope.Complete();

        // Build the grouping context
        var context = new OrderGroupingContext
        {
            Basket = basket,
            BillingAddress = basket.BillingAddress,
            ShippingAddress = shippingAddress,
            CustomerId = basket.CustomerId,
            CustomerEmail = basket.BillingAddress?.Email,
            Products = products,
            Warehouses = warehouses,
            SelectedShippingOptions = selectedShippingOptions
        };

        // Get the configured strategy and execute grouping
        logger.LogDebug("Using order grouping strategy: {StrategyKey}", strategy.Metadata.Key);

        var groupingResult = await strategy.GroupItemsAsync(context, cancellationToken);

        if (!groupingResult.Success)
        {
            logger.LogWarning(
                "Order grouping failed for basket {BasketId}: {Errors}",
                basket.Id,
                string.Join("; ", groupingResult.Errors));
        }

        // Publish modifying notification - handlers can modify the result
        var modifyingNotification = new OrderGroupingModifyingNotification(context, groupingResult, strategy.Metadata.Key);
        if (await notificationPublisher.PublishCancelableAsync(modifyingNotification, cancellationToken))
        {
            logger.LogWarning(
                "Order grouping cancelled for basket {BasketId}: {Reason}",
                basket.Id,
                modifyingNotification.CancelReason);

            return new ShippingSelectionResult
            {
                WarehouseGroups = [],
                SubTotal = basket.SubTotal,
                Tax = basket.Tax,
                Total = basket.Total
            };
        }

        // Publish completed notification for observation
        await notificationPublisher.PublishAsync(
            new OrderGroupingNotification(context, groupingResult, strategy.Metadata.Key),
            cancellationToken);

        // Map OrderGroup to WarehouseShippingGroup for backward compatibility
        var warehouseGroups = groupingResult.Groups
            .Select(g => new WarehouseShippingGroup
            {
                GroupId = g.GroupId,
                WarehouseId = g.WarehouseId ?? Guid.Empty,
                LineItems = g.LineItems,
                AvailableShippingOptions = g.AvailableShippingOptions,
                SelectedShippingOptionId = g.SelectedShippingOptionId
            })
            .ToList();

        return new ShippingSelectionResult
        {
            WarehouseGroups = warehouseGroups,
            SubTotal = groupingResult.SubTotal,
            Tax = groupingResult.Tax,
            Total = groupingResult.Total
        };
    }

    public async Task<OrderShippingSummary> GetShippingSummaryForReview(
        Basket basket,
        Address shippingAddress,
        Dictionary<Guid, string> selectedShippingOptions,
        CancellationToken cancellationToken = default)
    {
        // Get warehouse assignments using the same logic as GetShippingOptionsForBasket
        var shippingResult = await GetShippingOptionsForBasket(new GetShippingOptionsParameters
        {
            Basket = basket,
            ShippingAddress = shippingAddress,
            SelectedShippingOptions = selectedShippingOptions
        }, cancellationToken);

        // Parse SelectionKeys to extract flat-rate ShippingOptionIds
        var shippingOptionIds = new List<Guid>();
        foreach (var selKey in selectedShippingOptions.Values)
        {
            if (Extensions.SelectionKeyExtensions.TryParse(selKey, out var optionId, out _, out _) && optionId.HasValue)
            {
                shippingOptionIds.Add(optionId.Value);
            }
        }

        // Load flat-rate shipping options from database
        Dictionary<Guid, ShippingOption> shippingOptions = [];
        if (shippingOptionIds.Count > 0)
        {
            using var scope = efCoreScopeProvider.CreateScope();
            shippingOptions = await scope.ExecuteWithContextAsync(async db =>
                await db.ShippingOptions
                    .AsNoTracking()
                    .Where(so => shippingOptionIds.Contains(so.Id))
                    .ToDictionaryAsync(so => so.Id, cancellationToken));
            scope.Complete();
        }

        List<ShipmentSummary> shipmentSummaries = [];

        foreach (var warehouseGroup in shippingResult.WarehouseGroups)
        {
            // Try to get selection by GroupId first, then fall back to WarehouseId for backward compatibility
            var selectionKey = selectedShippingOptions.GetValueOrDefault(warehouseGroup.GroupId);
            if (string.IsNullOrEmpty(selectionKey))
            {
                selectionKey = selectedShippingOptions.GetValueOrDefault(warehouseGroup.WarehouseId);
            }

            if (string.IsNullOrEmpty(selectionKey))
            {
                continue;
            }

            // Parse the SelectionKey
            if (!Extensions.SelectionKeyExtensions.TryParse(selectionKey, out var optionId, out var providerKey, out var serviceCode))
            {
                continue;
            }

            ShipmentSummary? summary = null;

            if (optionId.HasValue && shippingOptions.TryGetValue(optionId.Value, out var shippingOption))
            {
                // Flat-rate option from database
                summary = new ShipmentSummary
                {
                    ShippingMethodName = shippingOption.Name ?? string.Empty,
                    DeliveryTimeDescription = ShippingOptionInfo.FormatDeliveryTime(shippingOption.DaysFrom, shippingOption.DaysTo, shippingOption.IsNextDay),
                    ShippingCost = shippingOption.FixedCost ?? 0,
                    LineItems = warehouseGroup.LineItems.Select(li => new ShipmentLineItemSummary
                    {
                        Name = li.Name,
                        Sku = li.Sku,
                        Quantity = li.Quantity,
                        Amount = li.Amount
                    }).ToList()
                };
            }
            else if (!string.IsNullOrEmpty(providerKey))
            {
                // Dynamic provider option - find in AvailableShippingOptions
                var dynamicOption = warehouseGroup.AvailableShippingOptions
                    .FirstOrDefault(o => o.SelectionKey == selectionKey);

                if (dynamicOption != null)
                {
                    summary = new ShipmentSummary
                    {
                        ShippingMethodName = dynamicOption.Name,
                        DeliveryTimeDescription = dynamicOption.DeliveryTimeDescription,
                        ShippingCost = dynamicOption.Cost,
                        LineItems = warehouseGroup.LineItems.Select(li => new ShipmentLineItemSummary
                        {
                            Name = li.Name,
                            Sku = li.Sku,
                            Quantity = li.Quantity,
                            Amount = li.Amount
                        }).ToList()
                    };
                }
            }

            if (summary != null)
            {
                shipmentSummaries.Add(summary);
            }
        }

        return new OrderShippingSummary
        {
            Shipments = shipmentSummaries,
            TotalShippingCost = shipmentSummaries.Sum(s => s.ShippingCost)
        };
    }

    public async Task<List<Guid>> GetRequiredWarehouses(
        Basket basket,
        Address shippingAddress,
        CancellationToken cancellationToken = default)
    {
        // Get warehouse assignments using the warehouse selection logic
        var shippingResult = await GetShippingOptionsForBasket(new GetShippingOptionsParameters
        {
            Basket = basket,
            ShippingAddress = shippingAddress
        }, cancellationToken);

        return shippingResult.WarehouseGroups
            .Select(g => g.WarehouseId)
            .Distinct()
            .ToList();
    }

    public async Task<List<ShippingOption>> GetAllShippingOptions(CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.ShippingOptions
                .AsNoTracking()
                .OrderBy(so => so.Name)
                .ToListAsync(cancellationToken));
        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<ProductShippingOptionsResultDto> GetShippingOptionsForProductAsync(
        Guid productId,
        string countryCode,
        string? regionCode = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(countryCode))
        {
            return new ProductShippingOptionsResultDto
            {
                CanShipToLocation = false,
                Message = "Country code is required"
            };
        }

        // Build enabled provider and live-rate capability lookups.
        var providers = await providerManager.GetEnabledProvidersAsync(cancellationToken) ?? [];
        var enabledProviderKeys = providers
            .Select(p => p.Provider.Metadata.Key)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var usesLiveRatesLookup = providers.ToDictionary(
            p => p.Provider.Metadata.Key,
            p => p.Provider.Metadata.ConfigCapabilities?.UsesLiveRates == true,
            StringComparer.OrdinalIgnoreCase);

        using var scope = efCoreScopeProvider.CreateScope();

        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            // Load the product with shipping options
            var product = await db.Products
                .AsNoTracking()
                .Include(p => p.ProductRoot)
                    .ThenInclude(pr => pr!.ProductRootWarehouses)
                        .ThenInclude(prw => prw.Warehouse)
                            .ThenInclude(w => w!.ShippingOptions)
                .Include(p => p.ProductWarehouses)
                    .ThenInclude(pw => pw.Warehouse)
                        .ThenInclude(w => w!.ShippingOptions)
                .Include(p => p.ShippingOptions)
                    .ThenInclude(so => so.Warehouse)
                .Include(p => p.AllowedShippingOptions)
                    .ThenInclude(so => so.Warehouse)
                .Include(p => p.ExcludedShippingOptions)
                .AsSplitQuery()
                .FirstOrDefaultAsync(p => p.Id == productId, cancellationToken);

            if (product == null)
            {
                return new ProductShippingOptionsResultDto
                {
                    CanShipToLocation = false,
                    Message = "Product not found"
                };
            }

            // Get all associated warehouses (variant + root) and check destination serviceability.
            var associatedWarehouses = product.ProductWarehouses
                .Where(pw => pw.Warehouse != null)
                .Select(pw => pw.Warehouse!)
                .Concat(
                    product.ProductRoot?.ProductRootWarehouses?
                        .Where(prw => prw.Warehouse != null)
                        .Select(prw => prw.Warehouse!)
                    ?? [])
                .DistinctBy(w => w.Id)
                .ToList();

            if (associatedWarehouses.Count > 0 &&
                associatedWarehouses.All(w => !w.CanServeRegion(countryCode, regionCode)))
            {
                return new ProductShippingOptionsResultDto
                {
                    CanShipToLocation = false,
                    Message = "This product cannot be shipped to your location"
                };
            }

            // Resolve allowed options (respecting product allow/exclude configuration).
            var allowedOptions = product.GetAllowedShippingOptions()
                .Where(so => so.IsEnabled)
                .ToList();

            var eligibleOptions = shippingOptionEligibilityService.GetEligibleOptions(
                allowedOptions,
                countryCode,
                regionCode,
                enabledProviderKeys,
                usesLiveRatesLookup);

            var methods = eligibleOptions
                .Select((eligible, index) =>
                {
                    var option = eligible.Option;
                    var deliveryTime = ShippingOptionInfo.FormatDeliveryTime(option.DaysFrom, option.DaysTo, option.IsNextDay);
                    return new ProductShippingMethodDto
                    {
                        Name = option.Name ?? "Standard Shipping",
                        DeliveryTimeDescription = deliveryTime,
                        EstimatedCost = eligible.UsesLiveRates ? null : eligible.Cost,
                        IsEstimate = true,
                        ServiceLevel = option.IsNextDay ? "express" : "standard",
                        SortOrder = index
                    };
                })
                .ToList();

            // Remove duplicates (same name) keeping lowest cost
            var uniqueMethods = methods
                .GroupBy(m => m.Name)
                .Select(g => g.OrderBy(m => m.EstimatedCost ?? decimal.MaxValue).First())
                .OrderBy(m => m.SortOrder)
                .ToList();

            return new ProductShippingOptionsResultDto
            {
                CanShipToLocation = uniqueMethods.Count > 0,
                AvailableMethods = uniqueMethods,
                RequiresCheckoutForRates = eligibleOptions.Any(o => o.UsesLiveRates),
                Message = uniqueMethods.Count == 0 ? "No shipping options available for your location" : null
            };
        });

        scope.Complete();
        return result;
    }

    /// <summary>
    /// Gets a shipping option by its ID
    /// </summary>
    public async Task<ShippingOption?> GetShippingOptionByIdAsync(
        Guid shippingOptionId,
        CancellationToken cancellationToken = default)
    {
        using var scope = efCoreScopeProvider.CreateScope();
        var result = await scope.ExecuteWithContextAsync(async db =>
            await db.ShippingOptions
                .Include(so => so.Warehouse)
                .FirstOrDefaultAsync(so => so.Id == shippingOptionId, cancellationToken));
        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<WarehouseShippingOptionsResultDto> GetShippingOptionsForWarehouseAsync(
        Guid warehouseId,
        string destinationCountryCode,
        string? destinationStateCode = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(destinationCountryCode))
        {
            return new WarehouseShippingOptionsResultDto
            {
                CanShipToDestination = false,
                Message = "Destination country code is required"
            };
        }

        // Build set of enabled provider keys and lookup for live rates capability
        var providers = await providerManager.GetEnabledProvidersAsync(cancellationToken) ?? [];
        var enabledProviderKeys = providers
            .Select(p => p.Provider.Metadata.Key)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var usesLiveRatesLookup = providers.ToDictionary(
            p => p.Provider.Metadata.Key,
            p => p.Provider.Metadata.ConfigCapabilities?.UsesLiveRates == true,
            StringComparer.OrdinalIgnoreCase);

        using var scope = efCoreScopeProvider.CreateScope();

        var result = await scope.ExecuteWithContextAsync(async db =>
        {
            // Load warehouse with shipping options and service regions
            var warehouse = await db.Warehouses
                .AsNoTracking()
                .Include(w => w.ShippingOptions.Where(so => so.IsEnabled))
                    
                
                .FirstOrDefaultAsync(w => w.Id == warehouseId, cancellationToken);

            if (warehouse == null)
            {
                return new WarehouseShippingOptionsResultDto
                {
                    CanShipToDestination = false,
                    Message = "Warehouse not found"
                };
            }

            // Check if warehouse can serve this region
            if (!warehouse.CanServeRegion(destinationCountryCode, destinationStateCode))
            {
                return new WarehouseShippingOptionsResultDto
                {
                    CanShipToDestination = false,
                    Message = "This warehouse cannot ship to the selected destination"
                };
            }

            var eligibleOptions = shippingOptionEligibilityService.GetEligibleOptions(
                warehouse.ShippingOptions,
                destinationCountryCode,
                destinationStateCode,
                enabledProviderKeys,
                usesLiveRatesLookup);

            var availableOptions = eligibleOptions
                .Select(eligible =>
                {
                    var option = eligible.Option;
                    var deliveryTime = ShippingOptionInfo.FormatDeliveryTime(option.DaysFrom, option.DaysTo, option.IsNextDay);

                    return new WarehouseShippingOptionDto
                    {
                        Id = option.Id,
                        Name = option.Name ?? "Standard Shipping",
                        ProviderKey = option.ProviderKey,
                        ServiceType = option.ServiceType,
                        DaysFrom = option.DaysFrom,
                        DaysTo = option.DaysTo,
                        IsNextDay = option.IsNextDay,
                        EstimatedCost = eligible.UsesLiveRates ? null : eligible.Cost,
                        IsEstimate = eligible.UsesLiveRates,
                        DeliveryTimeDescription = deliveryTime
                    };
                })
                .ToList();

            return new WarehouseShippingOptionsResultDto
            {
                CanShipToDestination = availableOptions.Count > 0,
                AvailableOptions = availableOptions,
                Message = availableOptions.Count == 0 ? "No shipping options available for this destination" : null
            };
        });

        scope.Complete();
        return result;
    }

    /// <inheritdoc />
    public async Task<ProductFulfillmentOptionsDto> GetFulfillmentOptionsForProductAsync(
        Guid productId,
        string destinationCountryCode,
        string? destinationStateCode = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(destinationCountryCode))
        {
            return new ProductFulfillmentOptionsDto
            {
                CanAddToOrder = false,
                BlockedReason = "Destination country code is required"
            };
        }

        var (product, stockResult, aggregateStockStatus) =
            await GetProductStockContextAsync(productId, destinationCountryCode, destinationStateCode, cancellationToken);

        if (product == null)
        {
            return CreateMissingProductFulfillmentOptions();
        }

        // Check product availability (backend-controlled flag)
        var isAvailableForPurchase = product.AvailableForPurchase;

        // Determine blocked reason (priority order)
        string? blockedReason = null;
        if (!isAvailableForPurchase)
        {
            blockedReason = "Not available for purchase";
        }
        else if (!stockResult.HasAnyStock)
        {
            blockedReason = "Out of stock";
        }
        else if (stockResult.FulfillingWarehouse == null)
        {
            blockedReason = $"Cannot ship to {destinationCountryCode}";
        }

        // CanAddToOrder is the consolidated backend decision
        var canAddToOrder = isAvailableForPurchase && stockResult.HasAnyStock && stockResult.FulfillingWarehouse != null;

        return new ProductFulfillmentOptionsDto
        {
            CanAddToOrder = canAddToOrder,
            FulfillingWarehouse = stockResult.FulfillingWarehouse,
            BlockedReason = blockedReason,
            HasAvailableStock = stockResult.HasAnyStock,
            AvailableStock = stockResult.TotalAvailableStock,
            AggregateStockStatus = aggregateStockStatus,
            AggregateStockStatusLabel = aggregateStockStatus.ToLabel(),
            AggregateStockStatusCssClass = aggregateStockStatus.ToCssClass()
        };
    }

    /// <inheritdoc />
    public async Task<ProductFulfillmentOptionsDto> GetDefaultFulfillingWarehouseAsync(
        Guid productId,
        CancellationToken cancellationToken = default)
    {
        var (product, stockResult, aggregateStockStatus) =
            await GetProductStockContextAsync(productId, null, null, cancellationToken);

        if (product == null)
        {
            return CreateMissingProductFulfillmentOptions();
        }

        // Determine fulfilling warehouse - use result or fallback to first warehouse for display
        var fulfillingWarehouse = stockResult.FulfillingWarehouse;
        if (fulfillingWarehouse == null)
        {
            var productRootWarehouses = product.ProductRoot?.ProductRootWarehouses?
                .OrderBy(prw => prw.PriorityOrder)
                .Where(prw => prw.Warehouse != null)
                .ToList() ?? [];

            if (productRootWarehouses.Count > 0)
            {
                var firstWarehouse = productRootWarehouses[0].Warehouse!;
                fulfillingWarehouse = new FulfillmentWarehouseDto
                {
                    Id = firstWarehouse.Id,
                    Name = firstWarehouse.Name ?? string.Empty,
                    AvailableStock = 0
                };
            }
        }

        // Check product availability (backend-controlled flag)
        var isAvailableForPurchase = product.AvailableForPurchase;

        // Determine blocked reason (no region check in this method - used when no destination)
        string? blockedReason = null;
        if (!isAvailableForPurchase)
        {
            blockedReason = "Not available for purchase";
        }
        else if (!stockResult.HasAnyStock)
        {
            blockedReason = "Out of stock";
        }

        // CanAddToOrder: available for purchase AND has stock
        // (no region check since this is used when destination is unknown)
        var canAddToOrder = isAvailableForPurchase && stockResult.HasAnyStock;

        return new ProductFulfillmentOptionsDto
        {
            CanAddToOrder = canAddToOrder,
            FulfillingWarehouse = fulfillingWarehouse,
            BlockedReason = blockedReason,
            HasAvailableStock = stockResult.HasAnyStock,
            AvailableStock = stockResult.TotalAvailableStock,
            AggregateStockStatus = aggregateStockStatus,
            AggregateStockStatusLabel = aggregateStockStatus.ToLabel(),
            AggregateStockStatusCssClass = aggregateStockStatus.ToCssClass()
        };
    }
}



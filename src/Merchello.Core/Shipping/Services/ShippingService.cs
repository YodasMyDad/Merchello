using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Strategies;
using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Data;
using Merchello.Core.Locality.Models;
using Merchello.Core.Notifications;
using Merchello.Core.Notifications.OrderGrouping;
using Merchello.Core.Shipping.Dtos;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Shipping.Services;

public class ShippingService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IOrderGroupingStrategyResolver strategyResolver,
    IMerchelloNotificationPublisher notificationPublisher,
    ILogger<ShippingService> logger) : IShippingService
{
    /// <summary>
    /// Gets shipping options for a basket, grouping products by warehouse and shipping option availability.
    /// Delegates to the configured order grouping strategy for custom grouping logic.
    /// </summary>
    /// <param name="basket">The shopping basket</param>
    /// <param name="shippingAddress">The shipping destination address</param>
    /// <param name="selectedShippingOptions">Previously selected shipping options (keyed by WarehouseId or GroupId)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Shipping groups with available options for each group</returns>
    public async Task<ShippingSelectionResult> GetShippingOptionsForBasket(
        Basket basket,
        Address shippingAddress,
        Dictionary<Guid, Guid>? selectedShippingOptions = null,
        CancellationToken cancellationToken = default)
    {
        selectedShippingOptions ??= [];

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
            .ToList();

        // Load products with necessary relationships for warehouse selection
        using var scope = efCoreScopeProvider.CreateScope();
        var (products, warehouses) = await scope.ExecuteWithContextAsync(async db =>
        {
            var loadedProducts = await db.Products
                .AsNoTracking()
                .Include(p => p.ProductRoot)
                    .ThenInclude(pr => pr!.ProductRootWarehouses.OrderBy(prw => prw.PriorityOrder))
                        .ThenInclude(prw => prw.Warehouse)
                            .ThenInclude(w => w!.ServiceRegions)
                .Include(p => p.ProductRoot)
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
                .ToDictionaryAsync(p => p.Id, cancellationToken);

            // Load all warehouses for the context
            var loadedWarehouses = await db.Warehouses
                .AsNoTracking()
                .Include(w => w.ShippingOptions)
                    .ThenInclude(so => so.ShippingCosts)
                .Include(w => w.ServiceRegions)
                .ToDictionaryAsync(w => w.Id, cancellationToken);

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
        var strategy = strategyResolver.GetStrategy();
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
        Dictionary<Guid, Guid> selectedShippingOptions,
        CancellationToken cancellationToken = default)
    {
        // Get warehouse assignments using the same logic as GetShippingOptionsForBasket
        var shippingResult = await GetShippingOptionsForBasket(
            basket,
            shippingAddress,
            selectedShippingOptions,
            cancellationToken);

        var shippingOptionIds = selectedShippingOptions.Values.ToList();

        using var scope = efCoreScopeProvider.CreateScope();
        var shippingOptions = await scope.ExecuteWithContextAsync(async db =>
            await db.ShippingOptions
                .AsNoTracking()
                .Where(so => shippingOptionIds.Contains(so.Id))
                .ToDictionaryAsync(so => so.Id, cancellationToken));
        scope.Complete();

        List<ShipmentSummary> shipmentSummaries = [];

        foreach (var warehouseGroup in shippingResult.WarehouseGroups)
        {
            // Try to get selection by GroupId first, then fall back to WarehouseId for backward compatibility
            var selectedOptionId = selectedShippingOptions.GetValueOrDefault(warehouseGroup.GroupId);
            if (selectedOptionId == Guid.Empty)
            {
                selectedOptionId = selectedShippingOptions.GetValueOrDefault(warehouseGroup.WarehouseId);
            }

            if (selectedOptionId == Guid.Empty || !shippingOptions.TryGetValue(selectedOptionId, out var shippingOption))
            {
                continue;
            }

            shipmentSummaries.Add(new ShipmentSummary
            {
                ShippingMethodName = shippingOption.Name ?? string.Empty,
                DeliveryTimeDescription = shippingOption.IsNextDay
                    ? "Next Day Delivery"
                    : $"{shippingOption.DaysFrom}-{shippingOption.DaysTo} days",
                ShippingCost = shippingOption.FixedCost ?? 0,
                LineItems = warehouseGroup.LineItems.Select(li => new ShipmentLineItemSummary
                {
                    Name = li.Name,
                    Sku = li.Sku,
                    Quantity = li.Quantity,
                    Amount = li.Amount
                }).ToList()
            });
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
        var shippingResult = await GetShippingOptionsForBasket(
            basket,
            shippingAddress,
            null,
            cancellationToken);

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
        string? stateOrProvinceCode = null,
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
                                .ThenInclude(so => so.ShippingCosts)
                .Include(p => p.ProductRoot)
                    .ThenInclude(pr => pr!.ProductRootWarehouses)
                        .ThenInclude(prw => prw.Warehouse)
                            .ThenInclude(w => w!.ServiceRegions)
                .Include(p => p.AllowedShippingOptions)
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

            // Get warehouses that can service this location
            var productRootWarehouses = product.ProductRoot?.ProductRootWarehouses ?? [];
            var serviceableWarehouses = productRootWarehouses
                .Where(prw => prw.Warehouse != null &&
                              CanWarehouseServiceLocation(prw.Warehouse, countryCode, stateOrProvinceCode))
                .Select(prw => prw.Warehouse!)
                .ToList();

            if (serviceableWarehouses.Count == 0)
            {
                return new ProductShippingOptionsResultDto
                {
                    CanShipToLocation = false,
                    Message = "This product cannot be shipped to your location"
                };
            }

            // Get allowed shipping option IDs for this product
            var allowedOptionIds = product.AllowedShippingOptions?.Select(so => so.Id).ToHashSet();
            var excludedOptionIds = product.ExcludedShippingOptions?.Select(so => so.Id).ToHashSet() ?? [];

            // Collect all available shipping options from serviceable warehouses
            List<ProductShippingMethodDto> methods = [];
            var sortOrder = 0;

            foreach (var warehouse in serviceableWarehouses)
            {
                foreach (var shippingOption in warehouse.ShippingOptions ?? [])
                {
                    // Skip if excluded
                    if (excludedOptionIds.Contains(shippingOption.Id))
                        continue;

                    // Skip if not in allowed list (when allowlist is specified)
                    if (allowedOptionIds != null && allowedOptionIds.Count > 0 && !allowedOptionIds.Contains(shippingOption.Id))
                        continue;

                    // Check if this option can ship to the destination
                    var cost = GetShippingCostForDestination(shippingOption, countryCode, stateOrProvinceCode);
                    if (cost == null && shippingOption.FixedCost == null)
                        continue; // No rate available for this destination

                    var deliveryTime = shippingOption.IsNextDay
                        ? "Next Day Delivery"
                        : shippingOption.DaysFrom > 0 && shippingOption.DaysTo > 0
                            ? $"{shippingOption.DaysFrom}-{shippingOption.DaysTo} business days"
                            : null;

                    methods.Add(new ProductShippingMethodDto
                    {
                        Name = shippingOption.Name ?? "Standard Shipping",
                        DeliveryTimeDescription = deliveryTime,
                        EstimatedCost = cost ?? shippingOption.FixedCost,
                        IsEstimate = true, // Flat rate estimates - actual cost calculated at checkout
                        ServiceLevel = shippingOption.IsNextDay ? "express" : "standard",
                        SortOrder = sortOrder++
                    });
                }
            }

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
                RequiresCheckoutForRates = false, // Flat rate provider doesn't need checkout
                Message = uniqueMethods.Count == 0 ? "No shipping options available for your location" : null
            };
        });

        scope.Complete();
        return result;
    }

    private static bool CanWarehouseServiceLocation(
        Warehouses.Models.Warehouse warehouse,
        string countryCode,
        string? stateOrProvinceCode)
    {
        var serviceRegions = warehouse.ServiceRegions;
        if (serviceRegions == null || serviceRegions.Count == 0)
        {
            // No service regions defined means warehouse services everywhere
            return true;
        }

        // Check if any service region matches
        return serviceRegions.Any(sr =>
            string.Equals(sr.CountryCode, countryCode, StringComparison.OrdinalIgnoreCase) &&
            (string.IsNullOrEmpty(sr.StateOrProvinceCode) ||
             string.Equals(sr.StateOrProvinceCode, stateOrProvinceCode, StringComparison.OrdinalIgnoreCase)));
    }

    private static decimal? GetShippingCostForDestination(
        ShippingOption shippingOption,
        string countryCode,
        string? stateOrProvinceCode)
    {
        var costs = shippingOption.ShippingCosts;
        if (costs == null || costs.Count == 0)
            return shippingOption.FixedCost;

        // Try to find exact match (country + state)
        var exactMatch = costs.FirstOrDefault(c =>
            string.Equals(c.CountryCode, countryCode, StringComparison.OrdinalIgnoreCase) &&
            string.Equals(c.StateOrProvinceCode, stateOrProvinceCode, StringComparison.OrdinalIgnoreCase));

        if (exactMatch != null)
            return exactMatch.Cost;

        // Try country-only match
        var countryMatch = costs.FirstOrDefault(c =>
            string.Equals(c.CountryCode, countryCode, StringComparison.OrdinalIgnoreCase) &&
            string.IsNullOrEmpty(c.StateOrProvinceCode));

        if (countryMatch != null)
            return countryMatch.Cost;

        // Fall back to fixed cost
        return shippingOption.FixedCost;
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
}

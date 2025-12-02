using Merchello.Core.Checkout.Models;
using Merchello.Core.Data;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Shipping.Services;

public class ShippingService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IWarehouseService warehouseService,
    ILogger<ShippingService> logger) : IShippingService
{
    /// <summary>
    /// Gets shipping options for a basket, grouping products by warehouse and shipping option availability.
    /// Products from the same warehouse with different shipping restrictions are split into separate groups,
    /// allowing customers to choose different shipping methods for different products.
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
        var products = await scope.ExecuteWithContextAsync(async db =>
            await db.Products
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
                .ToDictionaryAsync(p => p.Id, cancellationToken));
        scope.Complete();

        List<WarehouseShippingGroup> warehouseGroups = [];
        List<string> warehouseSelectionFailures = [];

        // For each line item, select the best warehouse and determine shipping options
        foreach (var lineItem in basket.LineItems.Where(li => li.ProductId.HasValue))
        {
            if (!products.TryGetValue(lineItem.ProductId!.Value, out var product))
            {
                warehouseSelectionFailures.Add($"Product {lineItem.Name} not found");
                continue;
            }

            // Use WarehouseService to select best warehouse based on priority, region, and stock
            var selectionResult = await warehouseService.SelectWarehouseForProduct(
                product,
                shippingAddress,
                lineItem.Quantity,
                cancellationToken);

            if (!selectionResult.Success)
            {
                logger.LogWarning(
                    "Failed to select warehouse for product {ProductId} ({ProductName}): {Reason}",
                    product.Id,
                    product.Name,
                    selectionResult.FailureReason);

                warehouseSelectionFailures.Add($"{lineItem.Name}: {selectionResult.FailureReason}");
                continue;
            }

            // Handle single warehouse fulfillment
            if (selectionResult.Warehouse != null)
            {
                var warehouseId = selectionResult.Warehouse.Id;

                // Get allowed shipping options for this product based on restrictions
                // Use product's shipping options as base, or fall back to warehouse options if not configured
                var baseShippingOptions = product.ShippingOptions.Any()
                    ? product.ShippingOptions
                    : selectionResult.Warehouse.ShippingOptions;

                var allowedShippingOptions = GetAllowedShippingOptionsForProduct(
                    product,
                    baseShippingOptions).ToList();

                var allowedShippingOptionIds = allowedShippingOptions.Select(so => so.Id).OrderBy(id => id).ToList();

                // Find or create a group for this warehouse + shipping options combination
                // Products are grouped together ONLY if they have the same set of available shipping options
                // This allows products with different restrictions to be shipped separately with different methods
                var group = warehouseGroups.FirstOrDefault(g =>
                    g.WarehouseId == warehouseId &&
                    g.AvailableShippingOptions.Select(so => so.ShippingOptionId).OrderBy(id => id).SequenceEqual(allowedShippingOptionIds));

                if (group == null)
                {
                    // Create new group for this warehouse + shipping options profile
                    group = new WarehouseShippingGroup
                    {
                        GroupId = GenerateDeterministicGroupId(warehouseId, allowedShippingOptionIds),
                        WarehouseId = warehouseId,
                        AvailableShippingOptions = allowedShippingOptions.Select(so => new ShippingOptionInfo
                        {
                            ShippingOptionId = so.Id,
                            Name = so.Name ?? string.Empty,
                            DaysFrom = so.DaysFrom,
                            DaysTo = so.DaysTo,
                            IsNextDay = so.IsNextDay,
                            Cost = so.FixedCost ?? 0
                        }).ToList()
                    };

                    // Set selected option if provided (warehouse-level selection for backward compatibility)
                    // When there are multiple groups from same warehouse, all groups inherit the warehouse selection
                    var selectedOptionId = selectedShippingOptions.GetValueOrDefault(warehouseId);
                    if (selectedOptionId != Guid.Empty)
                    {
                        group.SelectedShippingOptionId = selectedOptionId;
                    }

                    warehouseGroups.Add(group);
                }

                // Add line item to this group
                var shippingLineItem = new ShippingLineItem
                {
                    LineItemId = lineItem.Id,
                    Name = lineItem.Name ?? string.Empty,
                    Sku = lineItem.Sku,
                    Quantity = lineItem.Quantity,
                    Amount = lineItem.Amount
                };

                if (!group.LineItems.Any(li => li.LineItemId == lineItem.Id))
                {
                    group.LineItems.Add(shippingLineItem);
                }
            }
            // Handle multi-warehouse fulfillment (split across multiple warehouses)
            else if (selectionResult.WarehouseAllocations.Any())
            {
                logger.LogInformation(
                    "Splitting line item {LineItemId} ({ProductName}) across {WarehouseCount} warehouses",
                    lineItem.Id,
                    lineItem.Name,
                    selectionResult.WarehouseAllocations.Count);

                foreach (var allocation in selectionResult.WarehouseAllocations)
                {
                    var warehouse = allocation.Warehouse;
                    var allocatedQuantity = allocation.AllocatedQuantity;

                    // Calculate proportional amount for this allocation
                    var proportionalAmount = (lineItem.Amount / lineItem.Quantity) * allocatedQuantity;

                    // Get allowed shipping options for this warehouse
                    var baseShippingOptions = product.ShippingOptions.Any()
                        ? product.ShippingOptions
                        : warehouse.ShippingOptions;

                    var allowedShippingOptions = GetAllowedShippingOptionsForProduct(
                        product,
                        baseShippingOptions).ToList();

                    var allowedShippingOptionIds = allowedShippingOptions.Select(so => so.Id).OrderBy(id => id).ToList();

                    // Find or create a group for this warehouse
                    var group = warehouseGroups.FirstOrDefault(g =>
                        g.WarehouseId == warehouse.Id &&
                        g.AvailableShippingOptions.Select(so => so.ShippingOptionId).OrderBy(id => id).SequenceEqual(allowedShippingOptionIds));

                    if (group == null)
                    {
                        group = new WarehouseShippingGroup
                        {
                            GroupId = GenerateDeterministicGroupId(warehouse.Id, allowedShippingOptionIds),
                            WarehouseId = warehouse.Id,
                            AvailableShippingOptions = allowedShippingOptions.Select(so => new ShippingOptionInfo
                            {
                                ShippingOptionId = so.Id,
                                Name = so.Name ?? string.Empty,
                                DaysFrom = so.DaysFrom,
                                DaysTo = so.DaysTo,
                                IsNextDay = so.IsNextDay,
                                Cost = so.FixedCost ?? 0
                            }).ToList()
                        };

                        var selectedOptionId = selectedShippingOptions.GetValueOrDefault(warehouse.Id);
                        if (selectedOptionId != Guid.Empty)
                        {
                            group.SelectedShippingOptionId = selectedOptionId;
                        }

                        warehouseGroups.Add(group);
                    }

                    // Add allocated portion to this group
                    var shippingLineItem = new ShippingLineItem
                    {
                        LineItemId = lineItem.Id,
                        Name = lineItem.Name ?? string.Empty,
                        Sku = lineItem.Sku,
                        Quantity = allocatedQuantity,
                        Amount = proportionalAmount
                    };

                    group.LineItems.Add(shippingLineItem);
                }
            }
        }

        if (warehouseSelectionFailures.Any())
        {
            logger.LogWarning(
                "Warehouse selection failures for basket {BasketId}: {Failures}",
                basket.Id,
                string.Join("; ", warehouseSelectionFailures));
        }

        return new ShippingSelectionResult
        {
            WarehouseGroups = warehouseGroups,
            SubTotal = basket.SubTotal,
            Tax = basket.Tax,
            Total = basket.Total
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
                .OrderBy(so => so.Name)
                .ToListAsync(cancellationToken));
        scope.Complete();
        return result;
    }

    /// <summary>
    /// Generates a deterministic GroupId based on warehouse and available shipping options
    /// This ensures the same combination always produces the same GroupId across requests
    /// </summary>
    private static Guid GenerateDeterministicGroupId(Guid warehouseId, List<Guid> shippingOptionIds)
    {
        // Create a deterministic string from warehouse + sorted shipping option IDs
        var combinedString = $"{warehouseId}|{string.Join(",", shippingOptionIds)}";

        // Generate a deterministic GUID from the string using MD5 hash
        using var md5 = System.Security.Cryptography.MD5.Create();
        var hash = md5.ComputeHash(System.Text.Encoding.UTF8.GetBytes(combinedString));
        return new Guid(hash);
    }

    /// <summary>
    /// Gets the allowed shipping options for a product based on its restriction mode from a given set of warehouse options
    /// </summary>
    private static IEnumerable<ShippingOption> GetAllowedShippingOptionsForProduct(
        Product product,
        ICollection<ShippingOption> warehouseShippingOptions)
    {
        return product.ShippingRestrictionMode switch
        {
            ShippingRestrictionMode.AllowList => warehouseShippingOptions
                .Where(wso => product.AllowedShippingOptions.Any(aso => aso.Id == wso.Id)),
            ShippingRestrictionMode.ExcludeList => warehouseShippingOptions
                .Where(wso => !product.ExcludedShippingOptions.Any(eso => eso.Id == wso.Id)),
            _ => warehouseShippingOptions
        };
    }

}

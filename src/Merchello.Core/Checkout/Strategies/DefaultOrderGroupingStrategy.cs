using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Strategies.Interfaces;
using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Products.Extensions;
using Merchello.Core.Products.Models;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Parameters;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.Checkout.Strategies;

/// <summary>
/// Default order grouping strategy that groups items by warehouse.
/// Items from the same warehouse with identical shipping options are grouped together.
/// Items that need multi-warehouse fulfillment are split proportionally.
/// </summary>
public class DefaultOrderGroupingStrategy(
    IWarehouseService warehouseService,
    IShippingCostResolver shippingCostResolver,
    ILogger<DefaultOrderGroupingStrategy> logger) : IOrderGroupingStrategy
{
    /// <inheritdoc />
    public OrderGroupingStrategyMetadata Metadata => new(
        Key: "default-warehouse",
        DisplayName: "Warehouse Grouping",
        Description: "Groups order items by warehouse based on stock availability and shipping region.");

    /// <inheritdoc />
    public async Task<OrderGroupingResult> GroupItemsAsync(
        OrderGroupingContext context,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(context.ShippingAddress.CountryCode))
        {
            logger.LogWarning("Shipping address must have a valid country code");
            return OrderGroupingResult.Fail("Shipping address must have a valid country code");
        }

        List<OrderGroup> orderGroups = [];
        List<string> errors = [];

        foreach (var lineItem in context.Basket.LineItems.Where(li => li.ProductId.HasValue))
        {
            if (!context.Products.TryGetValue(lineItem.ProductId!.Value, out var product))
            {
                errors.Add($"Product {lineItem.Name} not found");
                continue;
            }

            // Use WarehouseService to select best warehouse based on priority, region, and stock
            var selectionResult = await warehouseService.SelectWarehouseForProduct(new SelectWarehouseForProductParameters
            {
                Product = product,
                ShippingAddress = context.ShippingAddress,
                Quantity = lineItem.Quantity
            }, cancellationToken);

            if (!selectionResult.Success)
            {
                logger.LogWarning(
                    "Failed to select warehouse for product {ProductId} ({ProductName}): {Reason}",
                    product.Id,
                    product.Name,
                    selectionResult.FailureReason);

                errors.Add($"{lineItem.Name}: {selectionResult.FailureReason}");
                continue;
            }

            // Handle single warehouse fulfillment
            if (selectionResult.Warehouse != null)
            {
                AddLineItemToGroup(
                    orderGroups,
                    context,
                    product,
                    selectionResult.Warehouse.Id,
                    selectionResult.Warehouse.Name ?? "Warehouse",
                    selectionResult.Warehouse.ShippingOptions.ToList(),
                    lineItem.Id,
                    lineItem.Name ?? string.Empty,
                    lineItem.Sku,
                    lineItem.GetProductRootName(),
                    lineItem.GetSelectedOptions(),
                    lineItem.Quantity,
                    lineItem.Amount);
            }
            // Handle multi-warehouse fulfillment (split across multiple warehouses)
            else if (selectionResult.WarehouseAllocations.Any())
            {
                logger.LogInformation(
                    "Splitting line item {LineItemId} ({ProductName}) across {WarehouseCount} warehouses",
                    lineItem.Id,
                    lineItem.Name,
                    selectionResult.WarehouseAllocations.Count);

                // Extract display fields once for all allocations
                var productRootName = lineItem.GetProductRootName();
                var selectedOptions = lineItem.GetSelectedOptions();

                foreach (var allocation in selectionResult.WarehouseAllocations)
                {
                    var warehouse = allocation.Warehouse;
                    var allocatedQuantity = allocation.AllocatedQuantity;

                    // Calculate proportional amount for this allocation
                    var proportionalAmount = (lineItem.Amount / lineItem.Quantity) * allocatedQuantity;

                    AddLineItemToGroup(
                        orderGroups,
                        context,
                        product,
                        warehouse.Id,
                        warehouse.Name ?? "Warehouse",
                        warehouse.ShippingOptions.ToList(),
                        lineItem.Id,
                        lineItem.Name ?? string.Empty,
                        lineItem.Sku,
                        productRootName,
                        selectedOptions,
                        allocatedQuantity,
                        proportionalAmount);
                }
            }
        }

        if (errors.Count > 0)
        {
            logger.LogWarning(
                "Order grouping errors for basket {BasketId}: {Errors}",
                context.Basket.Id,
                string.Join("; ", errors));
        }

        return new OrderGroupingResult
        {
            Groups = orderGroups,
            Errors = errors,
            SubTotal = context.Basket.SubTotal,
            Tax = context.Basket.Tax,
            Total = context.Basket.Total
        };
    }

    private void AddLineItemToGroup(
        List<OrderGroup> orderGroups,
        OrderGroupingContext context,
        Product product,
        Guid warehouseId,
        string warehouseName,
        List<ShippingOption> warehouseShippingOptions,
        Guid lineItemId,
        string lineItemName,
        string? lineItemSku,
        string productRootName,
        List<SelectedOption> selectedOptions,
        int quantity,
        decimal amount)
    {
        // Get allowed shipping options for this product based on restrictions
        var baseShippingOptions = product.ShippingOptions.Any()
            ? product.ShippingOptions
            : warehouseShippingOptions;

        var allowedShippingOptions = product.GetAllowedShippingOptions(baseShippingOptions).ToList();

        // Check if this line item has a specific shipping selection (from order edit flow)
        // If so, group by that specific shipping option to ensure items with different
        // selected shipping methods end up in different orders
        Guid? selectedShippingOptionId = null;
        if (context.LineItemShippingSelections.TryGetValue(lineItemId, out var selection) &&
            selection.WarehouseId == warehouseId)
        {
            selectedShippingOptionId = selection.ShippingOptionId;
        }

        OrderGroup? group;

        if (selectedShippingOptionId.HasValue)
        {
            // Group by warehouse + selected shipping option (for order edit flow)
            group = orderGroups.FirstOrDefault(g =>
                g.WarehouseId == warehouseId &&
                g.SelectedShippingOptionId == selectedShippingOptionId.Value);

            if (group == null)
            {
                // Find the selected shipping option details
                var selectedOption = allowedShippingOptions.FirstOrDefault(so => so.Id == selectedShippingOptionId.Value);
                if (selectedOption == null)
                {
                    // Fallback: try to find in warehouse options
                    selectedOption = warehouseShippingOptions.FirstOrDefault(so => so.Id == selectedShippingOptionId.Value);
                }

                var shippingOptionsForGroup = selectedOption != null
                    ? [selectedOption]
                    : allowedShippingOptions;

                group = new OrderGroup
                {
                    GroupId = GenerateDeterministicGroupId(warehouseId, [selectedShippingOptionId.Value]),
                    GroupName = $"Shipment from {warehouseName}",
                    WarehouseId = warehouseId,
                    SelectedShippingOptionId = selectedShippingOptionId.Value,
                    AvailableShippingOptions = shippingOptionsForGroup.Select(so => new ShippingOptionInfo
                    {
                        ShippingOptionId = so.Id,
                        Name = so.Name ?? string.Empty,
                        DaysFrom = so.DaysFrom,
                        DaysTo = so.DaysTo,
                        IsNextDay = so.IsNextDay,
                        Cost = shippingCostResolver.GetTotalShippingCost(so, context.ShippingAddress.CountryCode!, context.ShippingAddress.CountyState?.RegionCode) ?? 0,
                        ProviderKey = so.ProviderKey
                    }).ToList()
                };

                orderGroups.Add(group);
            }
        }
        else
        {
            // Check if there's a selected shipping option for this warehouse that this product supports
            // The frontend sends selections keyed by groupId (not warehouseId), so we need to:
            // 1. Generate the expected groupId for this warehouse's available options
            // 2. Look up the selection using that groupId
            var allowedShippingOptionIds = allowedShippingOptions.Select(so => so.Id).OrderBy(id => id).ToList();
            var expectedGroupId = GenerateDeterministicGroupId(warehouseId, allowedShippingOptionIds);
            var groupSelectedOption = context.SelectedShippingOptions.GetValueOrDefault(expectedGroupId);

            // Fallback: try looking up by WarehouseId (handles key mismatch when GroupId changes between PRE/POST selection)
            if (groupSelectedOption == Guid.Empty)
            {
                groupSelectedOption = context.SelectedShippingOptions.GetValueOrDefault(warehouseId);
            }

            var productSupportsSelected = groupSelectedOption != Guid.Empty &&
                allowedShippingOptions.Any(so => so.Id == groupSelectedOption);

            if (productSupportsSelected)
            {
                // Selection exists: Group by warehouse + all available options (same as PRE-SELECTION)
                // but mark which option is selected. This allows users to see all options and change their selection.
                // Use consistent GroupId based on all options so the key is stable.
                group = orderGroups.FirstOrDefault(g =>
                    g.WarehouseId == warehouseId &&
                    g.AvailableShippingOptions.Select(so => so.ShippingOptionId).OrderBy(id => id).SequenceEqual(allowedShippingOptionIds));

                if (group == null)
                {
                    group = new OrderGroup
                    {
                        GroupId = GenerateDeterministicGroupId(warehouseId, allowedShippingOptionIds),
                        GroupName = $"Shipment from {warehouseName}",
                        WarehouseId = warehouseId,
                        SelectedShippingOptionId = groupSelectedOption,
                        AvailableShippingOptions = allowedShippingOptions.Select(so => new ShippingOptionInfo
                        {
                            ShippingOptionId = so.Id,
                            Name = so.Name ?? string.Empty,
                            DaysFrom = so.DaysFrom,
                            DaysTo = so.DaysTo,
                            IsNextDay = so.IsNextDay,
                            Cost = shippingCostResolver.GetTotalShippingCost(so, context.ShippingAddress.CountryCode!, context.ShippingAddress.CountyState?.RegionCode) ?? 0,
                            ProviderKey = so.ProviderKey
                        }).ToList()
                    };
                    orderGroups.Add(group);
                }
                else if (!group.SelectedShippingOptionId.HasValue)
                {
                    // Group exists but doesn't have selection marked yet - update it
                    group.SelectedShippingOptionId = groupSelectedOption;
                }
            }
            else
            {
                // PRE-SELECTION: Group by warehouse + available options (for UI to show choices)
                // allowedShippingOptionIds is already calculated above for the groupId lookup

                group = orderGroups.FirstOrDefault(g =>
                    g.WarehouseId == warehouseId &&
                    !g.SelectedShippingOptionId.HasValue &&
                    g.AvailableShippingOptions.Select(so => so.ShippingOptionId).OrderBy(id => id).SequenceEqual(allowedShippingOptionIds));

                if (group == null)
                {
                    group = new OrderGroup
                    {
                        GroupId = GenerateDeterministicGroupId(warehouseId, allowedShippingOptionIds),
                        GroupName = $"Shipment from {warehouseName}",
                        WarehouseId = warehouseId,
                        AvailableShippingOptions = allowedShippingOptions.Select(so => new ShippingOptionInfo
                        {
                            ShippingOptionId = so.Id,
                            Name = so.Name ?? string.Empty,
                            DaysFrom = so.DaysFrom,
                            DaysTo = so.DaysTo,
                            IsNextDay = so.IsNextDay,
                            Cost = shippingCostResolver.GetTotalShippingCost(so, context.ShippingAddress.CountryCode!, context.ShippingAddress.CountyState?.RegionCode) ?? 0,
                            ProviderKey = so.ProviderKey
                        }).ToList()
                    };
                    orderGroups.Add(group);
                }
            }
        }

        // Add line item to this group
        var shippingLineItem = new ShippingLineItem
        {
            LineItemId = lineItemId,
            Name = lineItemName,
            ProductRootName = productRootName,
            SelectedOptions = selectedOptions,
            Sku = lineItemSku,
            Quantity = quantity,
            Amount = amount
        };

        if (!group.LineItems.Any(li => li.LineItemId == lineItemId && li.Quantity == quantity))
        {
            group.LineItems.Add(shippingLineItem);
        }
    }

    /// <summary>
    /// Generates a deterministic GroupId based on warehouse and available shipping options.
    /// This ensures the same combination always produces the same GroupId across requests.
    /// </summary>
    private static Guid GenerateDeterministicGroupId(Guid warehouseId, List<Guid> shippingOptionIds)
    {
        var combinedString = $"{warehouseId}|{string.Join(",", shippingOptionIds)}";

        using var md5 = System.Security.Cryptography.MD5.Create();
        var hash = md5.ComputeHash(System.Text.Encoding.UTF8.GetBytes(combinedString));
        return new Guid(hash);
    }

}

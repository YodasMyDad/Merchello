using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Warehouses.Services.Interfaces;
using Microsoft.Extensions.Logging;

namespace Merchello.Core.Checkout.Strategies;

/// <summary>
/// Default order grouping strategy that groups items by warehouse.
/// Items from the same warehouse with identical shipping options are grouped together.
/// Items that need multi-warehouse fulfillment are split proportionally.
/// </summary>
public class DefaultOrderGroupingStrategy(
    IWarehouseService warehouseService,
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
            var selectionResult = await warehouseService.SelectWarehouseForProduct(
                product,
                context.ShippingAddress,
                lineItem.Quantity,
                cancellationToken);

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
        int quantity,
        decimal amount)
    {
        // Get allowed shipping options for this product based on restrictions
        var baseShippingOptions = product.ShippingOptions.Any()
            ? product.ShippingOptions
            : warehouseShippingOptions;

        var allowedShippingOptions = GetAllowedShippingOptionsForProduct(product, baseShippingOptions).ToList();
        var allowedShippingOptionIds = allowedShippingOptions.Select(so => so.Id).OrderBy(id => id).ToList();

        // Find or create a group for this warehouse + shipping options combination
        var group = orderGroups.FirstOrDefault(g =>
            g.WarehouseId == warehouseId &&
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
                    Cost = so.FixedCost ?? 0,
                    ProviderKey = so.ProviderKey
                }).ToList()
            };

            // Set selected option if provided
            var selectedOptionId = context.SelectedShippingOptions.GetValueOrDefault(group.GroupId);
            if (selectedOptionId == Guid.Empty)
            {
                selectedOptionId = context.SelectedShippingOptions.GetValueOrDefault(warehouseId);
            }

            if (selectedOptionId != Guid.Empty)
            {
                group.SelectedShippingOptionId = selectedOptionId;
            }

            orderGroups.Add(group);
        }

        // Add line item to this group
        var shippingLineItem = new ShippingLineItem
        {
            LineItemId = lineItemId,
            Name = lineItemName,
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

    /// <summary>
    /// Gets the allowed shipping options for a product based on its restriction mode.
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


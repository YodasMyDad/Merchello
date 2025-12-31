using Merchello.Core.Checkout.Strategies.Interfaces;
using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Products.Extensions;
using Merchello.Core.Products.Models;
using Merchello.Core.ExchangeRates.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Warehouses.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Merchello.Core.Checkout.Strategies;

/// <summary>
/// Default order grouping strategy that groups items by warehouse.
/// Items from the same warehouse with identical shipping options are grouped together.
/// Items that need multi-warehouse fulfillment are split proportionally.
/// </summary>
public class DefaultOrderGroupingStrategy(
    IWarehouseService warehouseService,
    IExchangeRateCache exchangeRateCache,
    ICurrencyService currencyService,
    IOptions<MerchelloSettings> settings,
    ILogger<DefaultOrderGroupingStrategy> logger) : IOrderGroupingStrategy
{
    private readonly MerchelloSettings _settings = settings.Value;

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

        var storeCurrency = _settings.StoreCurrencyCode;
        var basketCurrency = context.Basket.Currency ?? storeCurrency;
        decimal? storeToBasketRate = null;
        if (!string.Equals(storeCurrency, basketCurrency, StringComparison.OrdinalIgnoreCase))
        {
            storeToBasketRate = await exchangeRateCache.GetRateAsync(storeCurrency, basketCurrency, cancellationToken);
            if (!storeToBasketRate.HasValue || storeToBasketRate.Value <= 0m)
            {
                logger.LogWarning(
                    "No exchange rate available to convert shipping option costs from {StoreCurrency} to {BasketCurrency}",
                    storeCurrency,
                    basketCurrency);
                storeToBasketRate = null;
            }
        }

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
                    lineItem.Amount,
                    basketCurrency,
                    storeToBasketRate);
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
                        proportionalAmount,
                        basketCurrency,
                        storeToBasketRate);
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
        decimal amount,
        string basketCurrency,
        decimal? storeToBasketRate)
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
                        Cost = ConvertShippingCostToBasketCurrency(
                            ResolveShippingCostForDestination(so, context.ShippingAddress.CountryCode!, context.ShippingAddress.CountyState?.RegionCode),
                            basketCurrency,
                            storeToBasketRate),
                        ProviderKey = so.ProviderKey
                    }).ToList()
                };

                orderGroups.Add(group);
            }
        }
        else
        {
            // Check if there's a selected shipping option for this warehouse that this product supports
            var warehouseSelectedOption = context.SelectedShippingOptions.GetValueOrDefault(warehouseId);
            var productSupportsSelected = warehouseSelectedOption != Guid.Empty &&
                allowedShippingOptions.Any(so => so.Id == warehouseSelectedOption);

            if (productSupportsSelected)
            {
                // POST-SELECTION: Group by warehouse + selected shipping option
                // This consolidates items once user has made shipping choice
                group = orderGroups.FirstOrDefault(g =>
                    g.WarehouseId == warehouseId &&
                    g.SelectedShippingOptionId == warehouseSelectedOption);

                if (group == null)
                {
                    var selectedOption = allowedShippingOptions.First(so => so.Id == warehouseSelectedOption);
                    group = new OrderGroup
                    {
                        GroupId = GenerateDeterministicGroupId(warehouseId, [warehouseSelectedOption]),
                        GroupName = $"Shipment from {warehouseName}",
                        WarehouseId = warehouseId,
                        SelectedShippingOptionId = warehouseSelectedOption,
                        AvailableShippingOptions = [new ShippingOptionInfo
                        {
                            ShippingOptionId = selectedOption.Id,
                            Name = selectedOption.Name ?? string.Empty,
                            DaysFrom = selectedOption.DaysFrom,
                            DaysTo = selectedOption.DaysTo,
                            IsNextDay = selectedOption.IsNextDay,
                            Cost = ConvertShippingCostToBasketCurrency(
                                ResolveShippingCostForDestination(selectedOption, context.ShippingAddress.CountryCode!, context.ShippingAddress.CountyState?.RegionCode),
                                basketCurrency,
                                storeToBasketRate),
                            ProviderKey = selectedOption.ProviderKey
                        }]
                    };
                    orderGroups.Add(group);
                }
            }
            else
            {
                // PRE-SELECTION: Group by warehouse + available options (for UI to show choices)
                var allowedShippingOptionIds = allowedShippingOptions.Select(so => so.Id).OrderBy(id => id).ToList();

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
                            Cost = ConvertShippingCostToBasketCurrency(
                                ResolveShippingCostForDestination(so, context.ShippingAddress.CountryCode!, context.ShippingAddress.CountyState?.RegionCode),
                                basketCurrency,
                                storeToBasketRate),
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
            Sku = lineItemSku,
            Quantity = quantity,
            Amount = amount
        };

        if (!group.LineItems.Any(li => li.LineItemId == lineItemId && li.Quantity == quantity))
        {
            group.LineItems.Add(shippingLineItem);
        }
    }

    private decimal ConvertShippingCostToBasketCurrency(decimal storeCost, string basketCurrency, decimal? storeToBasketRate)
    {
        if (storeToBasketRate.HasValue)
        {
            return Math.Max(0, currencyService.Round(storeCost * storeToBasketRate.Value, basketCurrency));
        }

        return Math.Max(0, storeCost);
    }

    private static decimal ResolveShippingCostForDestination(ShippingOption shippingOption, string countryCode, string? stateOrProvinceCode)
    {
        if (shippingOption.FixedCost.HasValue)
        {
            return shippingOption.FixedCost.Value;
        }

        if (shippingOption.ShippingCosts?.Any() != true)
        {
            return 0;
        }

        var stateCost = shippingOption.ShippingCosts
            .FirstOrDefault(sc =>
                string.Equals(sc.CountryCode, countryCode, StringComparison.OrdinalIgnoreCase) &&
                !string.IsNullOrEmpty(sc.StateOrProvinceCode) &&
                string.Equals(sc.StateOrProvinceCode, stateOrProvinceCode, StringComparison.OrdinalIgnoreCase));

        if (stateCost != null)
        {
            return stateCost.Cost;
        }

        var countryCost = shippingOption.ShippingCosts
            .FirstOrDefault(sc =>
                string.Equals(sc.CountryCode, countryCode, StringComparison.OrdinalIgnoreCase) &&
                string.IsNullOrEmpty(sc.StateOrProvinceCode));

        return countryCost?.Cost ?? 0;
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

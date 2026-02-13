using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Strategies.Interfaces;
using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Products.Extensions;
using Merchello.Core.Products.Models;
using Merchello.Core.Shipping.Extensions;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shipping.Providers.Interfaces;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Shipping.Services.Parameters;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Notifications.OrderGrouping;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Parameters;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Models;
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
    IShippingOptionEligibilityService shippingOptionEligibilityService,
    IShippingCostResolver shippingCostResolver,
    IShippingQuoteService shippingQuoteService,
    IShippingProviderManager shippingProviderManager,
    IWarehouseProviderConfigService warehouseProviderConfigService,
    IMerchelloNotificationPublisher notificationPublisher,
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

        // Get enabled provider keys for filtering shipping options
        var enabledProviders = await shippingProviderManager.GetEnabledProvidersAsync(cancellationToken) ?? [];
        var enabledProviderKeys = enabledProviders
            .Select(p => p.Provider.Metadata.Key)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        List<OrderGroup> orderGroups = [];
        List<string> errors = [];

        foreach (var lineItem in context.Basket.LineItems.Where(li => li.ProductId.HasValue))
        {
            if (!context.Products.TryGetValue(lineItem.ProductId!.Value, out var product))
            {
                errors.Add($"Product {lineItem.Name} not found");
                continue;
            }

            // Digital products do not require shipping groups.
            if (product.ProductRoot?.IsDigitalProduct == true)
            {
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
                    lineItem.Amount,
                    enabledProviderKeys);
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
                        proportionalAmount,
                        enabledProviderKeys);
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

        // Recompute flat-rate option costs using grouped package weight.
        // This ensures weight tiers are applied from the final per-group package set.
        ApplyFlatRateWeightPricing(orderGroups, context);

        // Populate dynamic provider rates for each group
        await PopulateDynamicProviderRatesAsync(orderGroups, context, cancellationToken);

        var result = new OrderGroupingResult
        {
            Groups = orderGroups,
            Errors = errors,
            SubTotal = context.Basket.SubTotal,
            Tax = context.Basket.Tax,
            Total = context.Basket.Total
        };

        // Publish modifying notification (handlers can modify result or cancel)
        var modifyingNotification = new OrderGroupingModifyingNotification(context, result, Metadata.Key);
        if (await notificationPublisher.PublishCancelableAsync(modifyingNotification, cancellationToken))
        {
            return OrderGroupingResult.Fail(modifyingNotification.CancelReason ?? "Order grouping was cancelled");
        }

        // Publish completed notification (read-only observation)
        await notificationPublisher.PublishAsync(
            new OrderGroupingNotification(context, result, Metadata.Key), cancellationToken);

        return result;
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
        decimal amount,
        HashSet<string> enabledProviderKeys)
    {
        // Get allowed shipping options for this product based on restrictions
        var baseShippingOptions = product.ShippingOptions.Any()
            ? product.ShippingOptions
            : warehouseShippingOptions;

        var allowedShippingOptions = product.GetAllowedShippingOptions(baseShippingOptions).ToList();
        var resolvedAllowedShippingOptions = ResolveShippingOptions(allowedShippingOptions, context, enabledProviderKeys);
        var resolvedAllowedShippingOptionIds = resolvedAllowedShippingOptions
            .Select(so => so.ShippingOptionId)
            .OrderBy(id => id)
            .ToList();

        // Check if this line item has a specific shipping selection (from order edit flow)
        // If so, group by that specific shipping option to ensure items with different
        // selected shipping methods end up in different orders
        string? lineItemSelectionKey = null;
        Guid? lineItemShippingOptionId = null;
        if (context.LineItemShippingSelections.TryGetValue(lineItemId, out var selection) &&
            selection.WarehouseId == warehouseId)
        {
            lineItemSelectionKey = selection.SelectionKey;
            // Parse to get the ShippingOptionId if it's a flat-rate selection
            if (SelectionKeyExtensions.TryParse(lineItemSelectionKey, out var optionId, out _, out _) && optionId.HasValue)
            {
                lineItemShippingOptionId = optionId;
            }
        }

        OrderGroup? group;

        if (!string.IsNullOrEmpty(lineItemSelectionKey))
        {
            // Group by warehouse + selected shipping option (for order edit flow)
            group = orderGroups.FirstOrDefault(g =>
                g.WarehouseId == warehouseId &&
                g.SelectedShippingOptionId == lineItemSelectionKey);

            if (group == null)
            {
                // Find the selected shipping option details (only for flat-rate selections)
                var selectedOption = lineItemShippingOptionId.HasValue
                    ? resolvedAllowedShippingOptions.FirstOrDefault(so => so.ShippingOptionId == lineItemShippingOptionId.Value)
                    : null;

                var shippingOptionsForGroup = selectedOption != null
                    ? [selectedOption]
                    : resolvedAllowedShippingOptions;

                var optionIds = shippingOptionsForGroup.Select(so => so.ShippingOptionId).OrderBy(id => id).ToList();
                group = new OrderGroup
                {
                    GroupId = GenerateDeterministicGroupId(warehouseId, optionIds),
                    GroupName = $"Shipment from {warehouseName}",
                    WarehouseId = warehouseId,
                    SelectedShippingOptionId = lineItemSelectionKey,
                    AvailableShippingOptions = shippingOptionsForGroup
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
            var expectedGroupId = GenerateDeterministicGroupId(warehouseId, resolvedAllowedShippingOptionIds);
            var groupSelectionKey = context.SelectedShippingOptions.GetValueOrDefault(expectedGroupId);

            // Fallback: try looking up by WarehouseId (handles key mismatch when GroupId changes between PRE/POST selection)
            if (string.IsNullOrEmpty(groupSelectionKey))
            {
                groupSelectionKey = context.SelectedShippingOptions.GetValueOrDefault(warehouseId);
            }

            // Parse the selection key to check if product supports it
            Guid? selectedOptionId = null;
            if (!string.IsNullOrEmpty(groupSelectionKey) &&
                SelectionKeyExtensions.TryParse(groupSelectionKey, out var optionId, out _, out _))
            {
                selectedOptionId = optionId;
            }

            var productSupportsSelected = !string.IsNullOrEmpty(groupSelectionKey) &&
                (selectedOptionId.HasValue
                    ? resolvedAllowedShippingOptions.Any(so => so.ShippingOptionId == selectedOptionId.Value) // Flat-rate: check available options for destination
                    : SelectionKeyExtensions.IsDynamicProvider(groupSelectionKey)); // Dynamic: always supported if product allows external carriers

            if (productSupportsSelected)
            {
                // Selection exists: Group by warehouse + all available options (same as PRE-SELECTION)
                // but mark which option is selected. This allows users to see all options and change their selection.
                // Use consistent GroupId based on all options so the key is stable.
                group = orderGroups.FirstOrDefault(g =>
                    g.WarehouseId == warehouseId &&
                    g.AvailableShippingOptions.Select(so => so.ShippingOptionId).OrderBy(id => id).SequenceEqual(resolvedAllowedShippingOptionIds));

                if (group == null)
                {
                    group = new OrderGroup
                    {
                        GroupId = GenerateDeterministicGroupId(warehouseId, resolvedAllowedShippingOptionIds),
                        GroupName = $"Shipment from {warehouseName}",
                        WarehouseId = warehouseId,
                        SelectedShippingOptionId = groupSelectionKey,
                        AvailableShippingOptions = resolvedAllowedShippingOptions
                    };
                    orderGroups.Add(group);
                }
                else if (string.IsNullOrEmpty(group.SelectedShippingOptionId))
                {
                    // Group exists but doesn't have selection marked yet - update it
                    group.SelectedShippingOptionId = groupSelectionKey;
                }
            }
            else
            {
                // PRE-SELECTION: Group by warehouse + available options (for UI to show choices)
                // allowedShippingOptionIds is already calculated above for the groupId lookup

                group = orderGroups.FirstOrDefault(g =>
                    g.WarehouseId == warehouseId &&
                    string.IsNullOrEmpty(g.SelectedShippingOptionId) &&
                    g.AvailableShippingOptions.Select(so => so.ShippingOptionId).OrderBy(id => id).SequenceEqual(resolvedAllowedShippingOptionIds));

                if (group == null)
                {
                    group = new OrderGroup
                    {
                        GroupId = GenerateDeterministicGroupId(warehouseId, resolvedAllowedShippingOptionIds),
                        GroupName = $"Shipment from {warehouseName}",
                        WarehouseId = warehouseId,
                        AvailableShippingOptions = resolvedAllowedShippingOptions
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

    private void ApplyFlatRateWeightPricing(
        List<OrderGroup> orderGroups,
        OrderGroupingContext context)
    {
        if (orderGroups.Count == 0 || string.IsNullOrWhiteSpace(context.ShippingAddress.CountryCode))
        {
            return;
        }

        var countryCode = context.ShippingAddress.CountryCode!;
        var regionCode = context.ShippingAddress.CountyState?.RegionCode;
        var optionsById = BuildShippingOptionLookup(context);

        foreach (var group in orderGroups)
        {
            if (group.AvailableShippingOptions.Count == 0)
            {
                continue;
            }

            var totalWeightKg = BuildPackagesForGroup(group, context).Sum(p => p.WeightKg);

            foreach (var optionInfo in group.AvailableShippingOptions)
            {
                if (!string.Equals(optionInfo.ProviderKey, "flat-rate", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (optionInfo.ShippingOptionId == Guid.Empty ||
                    !optionsById.TryGetValue(optionInfo.ShippingOptionId, out var shippingOption))
                {
                    continue;
                }

                var resolved = shippingCostResolver.GetTotalShippingCost(
                    shippingOption,
                    countryCode,
                    regionCode,
                    totalWeightKg);

                if (resolved.HasValue)
                {
                    optionInfo.Cost = Math.Max(0m, resolved.Value);
                }
            }
        }
    }

    /// <summary>
    /// Populates dynamic provider rates (FedEx, UPS, etc.) for each order group.
    /// This is the key integration between ShippingQuoteService and order grouping.
    /// </summary>
    private async Task PopulateDynamicProviderRatesAsync(
        List<OrderGroup> orderGroups,
        OrderGroupingContext context,
        CancellationToken cancellationToken)
    {
        foreach (var group in orderGroups.Where(g => g.WarehouseId.HasValue))
        {
            // Check if all products in this group allow external carrier shipping
            var allAllowCarrier = group.LineItems.All(li =>
            {
                if (li.LineItemId == Guid.Empty)
                {
                    return true;
                }

                // Find the basket line item to get ProductId
                var basketItem = context.Basket.LineItems
                    .FirstOrDefault(b => b.Id == li.LineItemId);

                if (basketItem?.ProductId == null)
                {
                    return true;
                }

                if (!context.Products.TryGetValue(basketItem.ProductId.Value, out var product))
                {
                    return true; // Allow if product not found (shouldn't happen)
                }

                return product.ProductRoot?.AllowExternalCarrierShipping ?? true;
            });

            if (!allAllowCarrier)
            {
                continue; // Skip dynamic rates for this group
            }
            var warehouseId = group.WarehouseId!.Value;

            // Get warehouse from context
            if (!context.Warehouses.TryGetValue(warehouseId, out var warehouse))
            {
                logger.LogWarning(
                    "Warehouse {WarehouseId} not found in context for group {GroupId}",
                    warehouseId, group.GroupId);
                continue;
            }

            // Fetch per-warehouse provider configs for days override
            var warehouseConfigs = await warehouseProviderConfigService.GetByWarehouseAsync(warehouseId, cancellationToken);
            var configByProvider = warehouseConfigs?.ToDictionary(c => c.ProviderKey, StringComparer.OrdinalIgnoreCase)
                ?? new Dictionary<string, WarehouseProviderConfig>(StringComparer.OrdinalIgnoreCase);

            // Build packages from line items in this group
            var packages = BuildPackagesForGroup(group, context);
            if (packages.Count == 0)
            {
                continue;
            }

            try
            {
                // Fetch quotes from dynamic providers (FedEx, UPS, etc.)
                var quotes = await shippingQuoteService.GetQuotesForWarehouseAsync(
                    new GetWarehouseQuotesParameters
                    {
                        WarehouseId = warehouseId,
                        WarehouseAddress = warehouse.Address,
                        Packages = packages,
                        DestinationCountry = context.ShippingAddress.CountryCode!,
                        DestinationState = context.ShippingAddress.CountyState?.RegionCode,
                        DestinationPostal = context.ShippingAddress.PostalCode,
                        Currency = _settings.StoreCurrencyCode
                    },
                    cancellationToken);

                // Convert quotes to ShippingOptionInfo and add to group
                foreach (var quote in quotes)
                {
                    // Only process live-rate providers (skip flat-rate which is already handled)
                    if (quote.Metadata?.ConfigCapabilities?.UsesLiveRates != true)
                    {
                        continue;
                    }

                    foreach (var serviceLevel in quote.ServiceLevels)
                    {
                        // Check if this service already exists (from a ShippingOption record)
                        var existing = group.AvailableShippingOptions.FirstOrDefault(o =>
                            o.ProviderKey == quote.ProviderKey && o.ServiceCode == serviceLevel.ServiceCode);

                        if (existing != null)
                        {
                            // Update the cost from the live rate
                            existing.Cost = serviceLevel.TotalCost;
                            existing.EstimatedDeliveryDate = serviceLevel.EstimatedDeliveryDate;
                            existing.IsFallbackRate = quote.IsFallbackRate;
                            existing.FallbackReason = quote.FallbackReason;

                            // Update transit days from carrier API if not already set
                            // (enables InferServiceCategory for fulfilment routing)
                            if (existing.DaysFrom <= 0 && serviceLevel.TransitTime.HasValue)
                            {
                                var providerConfig = configByProvider.GetValueOrDefault(quote.ProviderKey);
                                existing.DaysFrom = providerConfig?.DefaultDaysFromOverride
                                    ?? (int)Math.Ceiling(serviceLevel.TransitTime.Value.TotalDays);
                                existing.DaysTo = providerConfig?.DefaultDaysToOverride
                                    ?? (int)Math.Ceiling(serviceLevel.TransitTime.Value.TotalDays) + 1;
                                existing.IsNextDay = existing.DaysFrom <= 1 && existing.DaysFrom > 0;
                            }
                        }
                        else
                        {
                            // Apply warehouse config days override if configured
                            var providerConfig = configByProvider.GetValueOrDefault(quote.ProviderKey);
                            var daysFrom = providerConfig?.DefaultDaysFromOverride
                                ?? (serviceLevel.TransitTime.HasValue
                                    ? (int)Math.Ceiling(serviceLevel.TransitTime.Value.TotalDays)
                                    : 0);
                            var daysTo = providerConfig?.DefaultDaysToOverride
                                ?? (serviceLevel.TransitTime.HasValue
                                    ? (int)Math.Ceiling(serviceLevel.TransitTime.Value.TotalDays) + 1
                                    : 0);

                            // Add as a new dynamic option
                            var dynamicOption = new ShippingOptionInfo
                            {
                                ShippingOptionId = Guid.Empty, // No ShippingOption record
                                Name = serviceLevel.ServiceName,
                                ServiceCode = serviceLevel.ServiceCode,
                                ServiceName = serviceLevel.ServiceName,
                                Cost = serviceLevel.TotalCost,
                                ProviderKey = quote.ProviderKey,
                                EstimatedDeliveryDate = serviceLevel.EstimatedDeliveryDate,
                                IsFallbackRate = quote.IsFallbackRate,
                                FallbackReason = quote.FallbackReason,
                                DaysFrom = daysFrom,
                                DaysTo = daysTo,
                                IsNextDay = daysFrom <= 1 && daysFrom > 0
                            };
                            group.AvailableShippingOptions.Add(dynamicOption);
                        }
                    }
                }

                // Log any errors from providers
                foreach (var quote in quotes.Where(q => q.Errors.Count > 0))
                {
                    logger.LogWarning(
                        "Shipping provider {ProviderKey} returned errors for warehouse {WarehouseId}: {Errors}",
                        quote.ProviderKey, warehouseId, string.Join("; ", quote.Errors));
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex,
                    "Failed to fetch dynamic provider rates for warehouse {WarehouseId} in group {GroupId}",
                    warehouseId, group.GroupId);
            }
        }
    }

    /// <summary>
    /// Builds ShipmentPackage objects from line items in a group for carrier API calls.
    /// </summary>
    private List<ShipmentPackage> BuildPackagesForGroup(OrderGroup group, OrderGroupingContext context)
    {
        var packages = new List<ShipmentPackage>();

        foreach (var lineItem in group.LineItems)
        {
            // Find the product for this line item
            var basketLineItem = context.Basket.LineItems.FirstOrDefault(li => li.Id == lineItem.LineItemId);
            if (basketLineItem?.ProductId == null)
            {
                continue;
            }

            if (!context.Products.TryGetValue(basketLineItem.ProductId.Value, out var product))
            {
                continue;
            }

            // Get package configurations (variant override or root default)
            var productPackages = GetEffectivePackages(product);

            var dependentAddons = context.Basket.LineItems
                .Where(li => li.IsAddonLinkedToParent(basketLineItem))
                .ToList();
            var addonWeightPerUnit = dependentAddons
                .Select(addon => GetDecimalFromExtendedData(addon.ExtendedData, "WeightKg"))
                .Where(weight => weight > 0m)
                .Sum();
            var quantity = Math.Max(lineItem.Quantity, 1);

            // Merge add-on weight into the first package per unit so carriers receive real package counts.
            AddPackagesForLineItem(packages, productPackages, quantity, addonWeightPerUnit);
        }

        return packages;
    }

    private static void AddPackagesForLineItem(
        List<ShipmentPackage> packages,
        List<ProductPackage> productPackages,
        int quantity,
        decimal addonWeightPerUnit)
    {
        for (var qty = 0; qty < quantity; qty++)
        {
            var unitPackages = productPackages
                .Select(pkg => new ShipmentPackage(
                    pkg.Weight,
                    pkg.LengthCm,
                    pkg.WidthCm,
                    pkg.HeightCm))
                .ToList();

            if (addonWeightPerUnit > 0m)
            {
                if (unitPackages.Count > 0)
                {
                    var firstPackage = unitPackages[0];
                    unitPackages[0] = new ShipmentPackage(
                        firstPackage.WeightKg + addonWeightPerUnit,
                        firstPackage.LengthCm,
                        firstPackage.WidthCm,
                        firstPackage.HeightCm);
                }
                else
                {
                    unitPackages.Add(new ShipmentPackage(addonWeightPerUnit));
                }
            }

            packages.AddRange(unitPackages);
        }
    }

    /// <summary>
    /// Gets the effective package configurations for a product.
    /// Returns variant's packages if defined, otherwise falls back to root's default packages.
    /// </summary>
    private static List<ProductPackage> GetEffectivePackages(Product product)
    {
        // Use variant packages if defined, otherwise inherit from root
        if (product.PackageConfigurations.Count > 0)
        {
            return product.PackageConfigurations;
        }

        return product.ProductRoot?.DefaultPackageConfigurations ?? [];
    }

    private static Dictionary<Guid, ShippingOption> BuildShippingOptionLookup(OrderGroupingContext context)
    {
        return context.Products.Values
            .SelectMany(product => product.GetAllowedShippingOptions())
            .Concat(context.Warehouses.Values.SelectMany(warehouse => warehouse.ShippingOptions))
            .Where(option => option.Id != Guid.Empty)
            .GroupBy(option => option.Id)
            .ToDictionary(group => group.Key, group => group.First());
    }

    private static decimal GetDecimalFromExtendedData(Dictionary<string, object> extendedData, string key)
    {
        if (!extendedData.TryGetValue(key, out var value))
        {
            return 0m;
        }

        try
        {
            return Convert.ToDecimal(value.UnwrapJsonElement());
        }
        catch
        {
            return 0m;
        }
    }

    /// <summary>
    /// Resolves shipping options to ShippingOptionInfo, filtering out options
    /// that have no cost configured for the destination country/region or whose provider is not enabled.
    /// </summary>
    private List<ShippingOptionInfo> ResolveShippingOptions(
        IEnumerable<ShippingOption> shippingOptions,
        OrderGroupingContext context,
        HashSet<string> enabledProviderKeys)
    {
        var countryCode = context.ShippingAddress.CountryCode!;
        var regionCode = context.ShippingAddress.CountyState?.RegionCode;

        var eligibleOptions = shippingOptionEligibilityService.GetEligibleOptions(
            shippingOptions,
            countryCode,
            regionCode,
            enabledProviderKeys);

        return eligibleOptions
            .Where(x => x.Cost.HasValue)
            .Select(x => new ShippingOptionInfo
            {
                ShippingOptionId = x.Option.Id,
                Name = x.Option.Name ?? string.Empty,
                DaysFrom = x.Option.DaysFrom,
                DaysTo = x.Option.DaysTo,
                IsNextDay = x.Option.IsNextDay,
                Cost = x.Cost!.Value,
                ProviderKey = x.Option.ProviderKey
            })
            .ToList();
    }
}

using System.Security.Cryptography;
using System.Text;
using Merchello.Core.Accounting.Extensions;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Data;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Extensions;
using Merchello.Core.Caching.Services.Interfaces;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Extensions;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shipping.Providers.Interfaces;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Shipping.Services.Parameters;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Shipping.Services;

public class ShippingQuoteService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IShippingProviderManager providerRegistry,
    IShippingCostResolver shippingCostResolver,
    IWarehouseProviderConfigService warehouseProviderConfigService,
    ICacheService cacheService,
    IOptions<MerchelloSettings> settings,
    ICurrencyService currencyService,
    ILogger<ShippingQuoteService> logger) : IShippingQuoteService
{
    private static readonly TimeSpan _quoteCacheTtl = TimeSpan.FromMinutes(10);
    private readonly MerchelloSettings _settings = settings.Value;
    private readonly ICurrencyService _currencyService = currencyService;

    public async Task<IReadOnlyCollection<ShippingRateQuote>> GetQuotesAsync(
        Basket basket,
        string countryCode,
        string? regionCode = null,
        CancellationToken cancellationToken = default)
    {
        (ShippingQuoteRequest request, List<BasketError> requestErrors) = await BuildRequestAsync(basket, countryCode, regionCode, cancellationToken);

        foreach (var error in requestErrors)
        {
            basket.Errors.Add(error);
        }

        if (!request.Items.Any())
        {
            return [];
        }

        // Build cache key from basket contents and destination
        var cacheKey = BuildCacheKey(basket, countryCode, regionCode);

        var quotes = await cacheService.GetOrCreateAsync(
            cacheKey,
            async ct => await FetchQuotesFromProvidersAsync(request, ct),
            _quoteCacheTtl,
            [Constants.CacheTags.ShippingQuotes],
            cancellationToken);

        return quotes;
    }

    /// <inheritdoc />
    public async Task<IReadOnlyCollection<ShippingRateQuote>> GetQuotesForWarehouseAsync(
        GetWarehouseQuotesParameters parameters,
        CancellationToken cancellationToken = default)
    {
        if (parameters.Packages.Count == 0)
        {
            return [];
        }

        // Build cache key specific to this warehouse and destination
        var cacheKey = BuildWarehouseCacheKey(parameters.WarehouseId, parameters.DestinationCountry, parameters.DestinationState, parameters.DestinationPostal, parameters.Currency, parameters.Packages);

        var quotes = await cacheService.GetOrCreateAsync(
            cacheKey,
            async ct => await FetchQuotesForWarehouseAsync(parameters.WarehouseId, parameters.WarehouseAddress, parameters.Packages, parameters.DestinationCountry, parameters.DestinationState, parameters.DestinationPostal, parameters.Currency, ct),
            _quoteCacheTtl,
            [Constants.CacheTags.ShippingQuotes],
            cancellationToken);

        return quotes;
    }

    private async Task<List<ShippingRateQuote>> FetchQuotesForWarehouseAsync(
        Guid warehouseId,
        Address warehouseAddress,
        IReadOnlyCollection<ShipmentPackage> packages,
        string destinationCountry,
        string? destinationState,
        string? destinationPostal,
        string currency,
        CancellationToken cancellationToken)
    {
        var providers = await providerRegistry.GetEnabledProvidersAsync(cancellationToken);
        List<ShippingRateQuote> quotes = [];

        // Build a minimal request for the providers
        var request = new ShippingQuoteRequest
        {
            OriginWarehouseId = warehouseId,
            OriginAddress = warehouseAddress,
            CountryCode = destinationCountry,
            RegionCode = destinationState,
            PostalCode = destinationPostal,
            CurrencyCode = currency,
            Packages = packages.ToList(),
            Items = [], // No product-specific items - we're fetching warehouse-level rates
            ItemsSubtotal = 0 // Will be set by caller if needed for threshold-based shipping
        };

        // Pre-load warehouse provider configs for dynamic providers
        var warehouseConfigs = await warehouseProviderConfigService.GetByWarehouseAsync(warehouseId, cancellationToken);
        var configLookup = warehouseConfigs.ToDictionary(c => c.ProviderKey, StringComparer.OrdinalIgnoreCase);

        foreach (var provider in providers)
        {
            if (!provider.Provider.IsAvailableFor(request))
            {
                continue;
            }

            try
            {
                var providerKey = provider.Metadata.Key;
                var capabilities = provider.Metadata.ConfigCapabilities;

                if (capabilities?.UsesLiveRates == true)
                {
                    // Dynamic provider: use WarehouseProviderConfig for exclusions and markup
                    if (!configLookup.TryGetValue(providerKey, out var warehouseConfig))
                    {
                        // No warehouse config = use provider with default settings (no markup, no exclusions)
                        warehouseConfig = new WarehouseProviderConfig
                        {
                            WarehouseId = warehouseId,
                            ProviderKey = providerKey,
                            IsEnabled = true,
                            DefaultMarkupPercent = 0
                        };
                    }

                    if (!warehouseConfig.IsEnabled)
                    {
                        continue;
                    }

                    var quote = await provider.Provider.GetRatesForAllServicesAsync(
                        request, warehouseConfig, cancellationToken);

                    if (quote != null)
                    {
                        quotes.Add(new ShippingRateQuote
                        {
                            ProviderKey = quote.ProviderKey,
                            ProviderName = quote.ProviderName,
                            ServiceLevels = quote.ServiceLevels,
                            Metadata = provider.Metadata,
                            IsFallbackRate = quote.IsFallbackRate,
                            FallbackReason = quote.FallbackReason,
                            Errors = quote.Errors
                        });
                    }
                }
                // Non-dynamic and flat-rate providers are handled via the basket-level
                // GetQuotesAsync flow with configured ShippingOption records
            }
            catch (Exception ex)
            {
                logger.LogError(ex,
                    "Shipping provider {ProviderKey} failed while retrieving quotes for warehouse {WarehouseId}",
                    provider.Metadata.Key, warehouseId);
            }
        }

        return quotes;
    }

    private static string BuildWarehouseCacheKey(
        Guid warehouseId,
        string destinationCountry,
        string? destinationState,
        string? destinationPostal,
        string currency,
        IReadOnlyCollection<ShipmentPackage> packages)
    {
        var destination = string.IsNullOrEmpty(destinationState)
            ? destinationCountry
            : $"{destinationCountry}-{destinationState}";

        if (!string.IsNullOrEmpty(destinationPostal))
        {
            destination = $"{destination}-{destinationPostal}";
        }

        // Hash the packages to create a deterministic key
        var packagesString = string.Join("|", packages
            .OrderBy(p => p.WeightKg)
            .ThenBy(p => p.LengthCm)
            .ThenBy(p => p.WidthCm)
            .ThenBy(p => p.HeightCm)
            .Select(p => $"{p.WeightKg}:{p.LengthCm}x{p.WidthCm}x{p.HeightCm}"));

        var packagesHash = Convert.ToHexString(
            SHA256.HashData(Encoding.UTF8.GetBytes(packagesString)))[..16];

        return $"{Constants.CacheKeys.ShippingQuotePrefix}wh:{warehouseId}:{destination}:{currency}:{packagesHash}";
    }

    private string BuildCacheKey(Basket basket, string countryCode, string? regionCode)
    {
        // Create a deterministic key based on basket contents and destination
        var productIds = string.Join("-", basket.LineItems
            .Where(li => li.LineItemType == LineItemType.Product && li.ProductId.HasValue)
            .OrderBy(li => li.ProductId)
            .Select(li => $"{li.ProductId}:{li.Quantity}"));

        // Include add-on line items in cache key (they affect weight)
        var addonIds = string.Join("-", basket.LineItems
            .Where(li => li.LineItemType == LineItemType.Addon)
            .OrderBy(li => li.Sku)
            .Select(li => $"{li.Sku}:{li.Quantity}"));

        var destination = string.IsNullOrEmpty(regionCode)
            ? countryCode
            : $"{countryCode}-{regionCode}";

        var currency = _settings.StoreCurrencyCode;

        // Hash the product and addon IDs to keep key under HybridCache's 1024 char limit
        var contentHash = Convert.ToHexString(
            SHA256.HashData(Encoding.UTF8.GetBytes($"{productIds}|{addonIds}")))[..16];

        return $"{Constants.CacheKeys.ShippingQuotePrefix}{basket.Id}:{destination}:{currency}:{contentHash}";
    }

    private async Task<List<ShippingRateQuote>> FetchQuotesFromProvidersAsync(
        ShippingQuoteRequest request,
        CancellationToken cancellationToken)
    {
        IReadOnlyCollection<RegisteredShippingProvider> providers = await providerRegistry.GetEnabledProvidersAsync(cancellationToken);
        List<ShippingRateQuote> quotes = [];

        // Collect all shipping options from all items in the request
        var allOptions = request.Items
            .Where(i => i.ProductSnapshot?.ShippingOptions != null)
            .SelectMany(i => i.ProductSnapshot!.ShippingOptions)
            .Where(o => o.CanShipToDestination)
            .ToList();

        // Group shipping options by provider key
        var optionsByProvider = allOptions
            .GroupBy(o => o.ProviderKey)
            .ToDictionary(g => g.Key, g => g.ToList());

        foreach (var provider in providers)
        {
            if (!provider.Provider.IsAvailableFor(request))
            {
                continue;
            }

            try
            {
                var providerKey = provider.Metadata.Key;

                // Check if this provider uses live rates and has service types configured
                if (provider.Metadata.ConfigCapabilities?.UsesLiveRates == true &&
                    optionsByProvider.TryGetValue(providerKey, out var providerOptions))
                {
                    // External provider (FedEx, UPS, etc.) - filter by configured service types
                    var serviceTypes = providerOptions
                        .Where(o => !string.IsNullOrEmpty(o.ServiceType))
                        .Select(o => o.ServiceType!)
                        .Distinct()
                        .ToList();

                    if (serviceTypes.Count > 0)
                    {
                        // Call GetRatesForServicesAsync with the enabled service types
                        var quote = await provider.Provider.GetRatesForServicesAsync(
                            request,
                            serviceTypes,
                            providerOptions,
                            cancellationToken);

                        if (quote != null)
                        {
                            quotes.Add(quote);
                        }
                    }
                    // If no service types configured, provider is available but nothing enabled for this warehouse
                }
                else
                {
                    // Flat rate or other provider - use existing logic
                    var quote = await provider.Provider.GetRatesAsync(request, cancellationToken);
                    if (quote != null)
                    {
                        // Apply warehouse-level markup/exclusions for flat-rate provider
                        quote = await ApplyWarehouseConfigToQuoteAsync(quote, request, providerKey, cancellationToken);
                        if (quote != null)
                        {
                            quotes.Add(quote);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Shipping provider {ProviderKey} failed while retrieving quotes.", provider.Metadata.Key);
            }
        }

        return quotes;
    }

    /// <summary>
    /// Applies per-warehouse markup and exclusions to a flat-rate quote.
    /// </summary>
    private async Task<ShippingRateQuote?> ApplyWarehouseConfigToQuoteAsync(
        ShippingRateQuote quote,
        ShippingQuoteRequest request,
        string providerKey,
        CancellationToken cancellationToken)
    {
        // Build ShippingOptionId → WarehouseId lookup from request items
        var warehouseByOptionId = request.Items
            .Where(i => i.ProductSnapshot?.ShippingOptions != null)
            .SelectMany(i => i.ProductSnapshot!.ShippingOptions)
            .Where(o => o.Id != Guid.Empty && o.WarehouseId.HasValue)
            .DistinctBy(o => o.Id)
            .ToDictionary(o => o.Id, o => o.WarehouseId!.Value);

        if (warehouseByOptionId.Count == 0)
        {
            return quote;
        }

        // Get all warehouse configs for this provider
        var configs = await warehouseProviderConfigService.GetByProviderAsync(providerKey, cancellationToken);
        if (configs is not { Count: > 0 })
        {
            return quote;
        }

        var configByWarehouse = configs.ToDictionary(c => c.WarehouseId);

        // Filter and apply markup to each service level
        List<ShippingServiceLevel> filteredLevels = [];
        foreach (var sl in quote.ServiceLevels)
        {
            // Extract ShippingOptionId from ExtendedProperties
            if (sl.ExtendedProperties?.TryGetValue("ShippingOptionId", out var optionIdStr) != true ||
                !Guid.TryParse(optionIdStr, out var optionId))
            {
                filteredLevels.Add(sl);
                continue;
            }

            if (!warehouseByOptionId.TryGetValue(optionId, out var warehouseId) ||
                !configByWarehouse.TryGetValue(warehouseId, out var config))
            {
                filteredLevels.Add(sl);
                continue;
            }

            if (!config.IsEnabled)
            {
                continue;
            }

            if (config.IsServiceExcluded(sl.ServiceCode))
            {
                continue;
            }

            var markup = config.GetMarkupForService(sl.ServiceCode);
            if (markup > 0m)
            {
                var markedUpCost = sl.TotalCost * (1 + (markup / 100m));
                var roundingCurrency = !string.IsNullOrWhiteSpace(sl.CurrencyCode)
                    ? sl.CurrencyCode
                    : request.CurrencyCode ?? _settings.StoreCurrencyCode;
                filteredLevels.Add(new ShippingServiceLevel
                {
                    ServiceCode = sl.ServiceCode,
                    ServiceName = sl.ServiceName,
                    TotalCost = _currencyService.Round(markedUpCost, roundingCurrency),
                    CurrencyCode = sl.CurrencyCode,
                    TransitTime = sl.TransitTime,
                    EstimatedDeliveryDate = sl.EstimatedDeliveryDate,
                    Description = sl.Description,
                    ServiceType = sl.ServiceType,
                    ExtendedProperties = sl.ExtendedProperties
                });
            }
            else
            {
                filteredLevels.Add(sl);
            }
        }

        if (filteredLevels.Count == 0)
        {
            return null;
        }

        return quote with { ServiceLevels = filteredLevels };
    }

    private async Task<(ShippingQuoteRequest Request, List<BasketError> Errors)> BuildRequestAsync(
        Basket basket,
        string countryCode,
        string? regionCode,
        CancellationToken cancellationToken)
    {
        List<BasketError> errors = [];

        var missingProductReferences = basket.LineItems
            .Where(item => item.LineItemType == LineItemType.Product && !item.ProductId.HasValue)
            .ToList();

        foreach (var missing in missingProductReferences)
        {
            errors.Add(new BasketError
            {
                Message = "Unable to find related product (Missing line item product id), so unable to calculate shipping.",
                RelatedLineItemId = missing.Id,
                IsShippingError = true
            });
        }

        var lineItems = basket.LineItems
            .Where(item => item.LineItemType == LineItemType.Product && item.ProductId.HasValue && !IsDigitalLineItem(item))
            .ToList();

        if (!lineItems.Any())
        {
            return (new ShippingQuoteRequest
            {
                CountryCode = countryCode,
                RegionCode = regionCode,
                CurrencyCode = _settings.StoreCurrencyCode,
                Items = Array.Empty<ShippingQuoteItem>(),
                Packages = Array.Empty<ShipmentPackage>()
            }, errors);
        }

        // Build lookup of provider capabilities (UsesLiveRates) by provider key - only enabled providers
        var providers = await providerRegistry.GetEnabledProvidersAsync(cancellationToken);
        var enabledProviderKeys = providers
            .Select(p => p.Provider.Metadata.Key)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var usesLiveRatesLookup = providers.ToDictionary(
            p => p.Provider.Metadata.Key,
            p => p.Provider.Metadata.ConfigCapabilities.UsesLiveRates,
            StringComparer.OrdinalIgnoreCase);

        var productIds = lineItems.Select(item => item.ProductId!.Value).Distinct().ToList();

        using var scope = efCoreScopeProvider.CreateScope();
        var products = await scope.ExecuteWithContextAsync(async db =>
            await db.Products
                .Include(product => product.ProductRoot)
                    .ThenInclude(pr => pr!.ProductRootWarehouses)
                        .ThenInclude(prw => prw.Warehouse)
                            .ThenInclude(w => w!.ShippingOptions)
                .Include(product => product.ShippingOptions)
                    .ThenInclude(option => option.Warehouse)
                .Include(product => product.AllowedShippingOptions)
                    .ThenInclude(option => option.Warehouse)
                .Include(product => product.ExcludedShippingOptions)
                .AsSplitQuery()
                .AsNoTracking()
                .Where(product => productIds.Contains(product.Id))
                .ToDictionaryAsync(product => product.Id, cancellationToken));
        scope.Complete();

        List<ShippingQuoteItem> items = [];
        List<ShipmentPackage> packages = [];

        foreach (var lineItem in lineItems)
        {
            if (!products.TryGetValue(lineItem.ProductId!.Value, out var product))
            {
                errors.Add(new BasketError
                {
                    Message = $"Unable to resolve product {lineItem.ProductId} for shipping calculations.",
                    RelatedLineItemId = lineItem.Id,
                    IsShippingError = true
                });
                continue;
            }

            var snapshot = BuildProductSnapshot(product, countryCode, regionCode, shippingCostResolver, usesLiveRatesLookup, enabledProviderKeys);

            // Get effective packages (variant override or root default)
            var productPackages = GetEffectivePackages(product);
            var addonWeightPerUnit = basket.LineItems
                .Where(li => li.IsAddonLinkedToParent(lineItem))
                .Select(li => GetDecimalFromExtendedData(li.ExtendedData, "WeightKg"))
                .Where(weight => weight > 0m)
                .Sum();
            var quantity = Math.Max(lineItem.Quantity, 1);
            var totalWeightForItem = (productPackages.Sum(p => p.Weight) + addonWeightPerUnit) * quantity;

            items.Add(new ShippingQuoteItem
            {
                LineItemId = lineItem.Id,
                ProductId = product.Id,
                Quantity = lineItem.Quantity,
                IsShippable = true,
                TotalWeightKg = totalWeightForItem,
                DestinationCost = product.GetShippingAmountForCountry(countryCode, regionCode, shippingCostResolver),
                ProductSnapshot = snapshot
            });

            // Add-on weight is merged into the first physical package for each unit,
            // so carrier requests don't include synthetic extra packages.
            AddPackagesForLineItem(packages, productPackages, quantity, addonWeightPerUnit);
        }

        var subtotal = lineItems.Sum(item => item.Amount * item.Quantity);

        var request = new ShippingQuoteRequest
        {
            BasketId = basket.Id,
            CountryCode = countryCode,
            RegionCode = regionCode,
            CurrencyCode = _settings.StoreCurrencyCode,
            ItemsSubtotal = subtotal,
            Items = items,
            Packages = packages
        };

        return (request, errors);
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

    private static ShippingProductSnapshot BuildProductSnapshot(
        Product product,
        string countryCode,
        string? regionCode,
        IShippingCostResolver costResolver,
        Dictionary<string, bool> usesLiveRatesLookup,
        HashSet<string> enabledProviderKeys)
    {
        // Get allowed shipping options based on product restrictions, filtering out disabled providers
        var allowedOptions = product.GetAllowedShippingOptions()
            .Where(o => string.Equals(o.ProviderKey, "flat-rate", StringComparison.OrdinalIgnoreCase) ||
                        enabledProviderKeys.Contains(o.ProviderKey));

        // Build lookup for warehouses from ProductRootWarehouses (used when option.Warehouse.ServiceRegions isn't loaded)
        var warehouseLookup = product.ProductRoot?.ProductRootWarehouses
            .Where(prw => prw.Warehouse != null)
            .ToDictionary(prw => prw.Warehouse!.Id, prw => prw.Warehouse!)
            ?? [];

        var options = allowedOptions
            .Select(option =>
            {
                var isExcludedForDestination = option.IsDestinationExcluded(countryCode, regionCode);
                var destinationCost = costResolver.ResolveBaseCost(option.ShippingCosts.ToList(), countryCode, regionCode, option.FixedCost);

                // Use warehouse with ServiceRegions loaded - option.Warehouse might not have ServiceRegions populated
                // when loaded via ProductRootWarehouses.Warehouse.ShippingOptions path (no cyclic includes allowed)
                var warehouse = option.Warehouse.ServiceRegions.Count > 0
                    ? option.Warehouse
                    : warehouseLookup.GetValueOrDefault(option.WarehouseId) ?? option.Warehouse;
                var canShip = warehouse.CanServeRegion(countryCode, regionCode);

                // Check if provider uses live rates (external API) vs configured costs
                var usesLiveRates = usesLiveRatesLookup.GetValueOrDefault(option.ProviderKey, false);

                // For live-rate providers, they're available if the warehouse can ship to the region
                // For local-rate providers, they need a destination cost configured
                var canShipToDestination = !isExcludedForDestination && (usesLiveRates
                    ? canShip  // Live-rate providers calculate costs at runtime
                    : canShip && destinationCost.HasValue);  // Local-rate providers need cost configured

                return new ShippingOptionSnapshot
                {
                    Id = option.Id,
                    Name = option.Name,
                    WarehouseId = option.WarehouseId,
                    DaysFrom = option.DaysFrom,
                    DaysTo = option.DaysTo,
                    IsNextDay = option.IsNextDay,
                    FixedCost = option.FixedCost,
                    NextDayCutOffTime = option.NextDayCutOffTime,
                    CanShipToDestination = canShipToDestination,
                    DestinationCost = isExcludedForDestination ? null : destinationCost,
                    AllowsDeliveryDateSelection = option.AllowsDeliveryDateSelection,
                    MinDeliveryDays = option.MinDeliveryDays,
                    MaxDeliveryDays = option.MaxDeliveryDays,
                    AllowedDaysOfWeek = option.AllowedDaysOfWeek,
                    IsDeliveryDateGuaranteed = option.IsDeliveryDateGuaranteed,
                    ProviderKey = option.ProviderKey,
                    ServiceType = option.ServiceType,
                    ProviderSettings = option.ProviderSettings,
                    Costs = option.ShippingCosts
                        .Select(cost => new ShippingCostSnapshot
                        {
                            CountryCode = cost.CountryCode,
                            RegionCode = cost.RegionCode,
                            Cost = cost.Cost
                        })
                        .ToList(),
                    WeightTiers = option.WeightTiers
                        .Select(tier => new ShippingWeightTierSnapshot
                        {
                            CountryCode = tier.CountryCode,
                            RegionCode = tier.RegionCode,
                            MinWeightKg = tier.MinWeightKg,
                            MaxWeightKg = tier.MaxWeightKg,
                            Surcharge = tier.Surcharge
                        })
                        .ToList(),
                    PostcodeRules = option.PostcodeRules
                        .Select(rule => new ShippingPostcodeRuleSnapshot
                        {
                            CountryCode = rule.CountryCode,
                            Pattern = rule.Pattern,
                            MatchType = rule.MatchType,
                            Action = rule.Action,
                            Surcharge = rule.Surcharge
                        })
                        .ToList()
                };
            })
            .ToList();

        return new ShippingProductSnapshot
        {
            ProductId = product.Id,
            Name = product.Name,
            WeightKg = GetEffectivePackages(product).Sum(p => p.Weight),
            ShippingOptions = options
        };
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

    /// <summary>
    /// Safely extracts a decimal value from ExtendedData, handling JSON deserialization edge cases.
    /// </summary>
    private static decimal GetDecimalFromExtendedData(Dictionary<string, object> extendedData, string key)
    {
        if (!extendedData.TryGetValue(key, out var value))
            return 0m;
        try { return Convert.ToDecimal(value.UnwrapJsonElement()); }
        catch { return 0m; }
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
}

using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Data;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.ExtensionMethods;
using Merchello.Core.Shared.Services;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shipping.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Umbraco.Cms.Persistence.EFCore.Scoping;

namespace Merchello.Core.Shipping.Services;

public class ShippingQuoteService(
    IEFCoreScopeProvider<MerchelloDbContext> efCoreScopeProvider,
    IShippingProviderManager providerRegistry,
    CacheService cacheService,
    ILogger<ShippingQuoteService> logger) : IShippingQuoteService
{
    private static readonly TimeSpan _quoteCacheTtl = TimeSpan.FromMinutes(10);
    private const string CacheTag = "shipping-quotes";

    public async Task<IReadOnlyCollection<ShippingRateQuote>> GetQuotesAsync(
        Basket basket,
        string countryCode,
        string? stateOrProvinceCode = null,
        CancellationToken cancellationToken = default)
    {
        (ShippingQuoteRequest request, List<BasketError> requestErrors) = await BuildRequestAsync(basket, countryCode, stateOrProvinceCode, cancellationToken);

        foreach (var error in requestErrors)
        {
            basket.Errors.Add(error);
        }

        if (!request.Items.Any())
        {
            return [];
        }

        // Build cache key from basket contents and destination
        var cacheKey = BuildCacheKey(basket, countryCode, stateOrProvinceCode);

        var quotes = await cacheService.GetOrCreateAsync(
            cacheKey,
            async ct => await FetchQuotesFromProvidersAsync(request, ct),
            _quoteCacheTtl,
            [CacheTag],
            cancellationToken);

        return quotes;
    }

    private static string BuildCacheKey(Basket basket, string countryCode, string? stateOrProvinceCode)
    {
        // Create a deterministic key based on basket contents and destination
        var productIds = string.Join("-", basket.LineItems
            .Where(li => li.LineItemType == LineItemType.Product && li.ProductId.HasValue)
            .OrderBy(li => li.ProductId)
            .Select(li => $"{li.ProductId}:{li.Quantity}"));

        var destination = string.IsNullOrEmpty(stateOrProvinceCode)
            ? countryCode
            : $"{countryCode}-{stateOrProvinceCode}";

        return $"shipping-quote:{basket.Id}:{destination}:{productIds}";
    }

    private async Task<List<ShippingRateQuote>> FetchQuotesFromProvidersAsync(
        ShippingQuoteRequest request,
        CancellationToken cancellationToken)
    {
        IReadOnlyCollection<RegisteredShippingProvider> providers = await providerRegistry.GetEnabledProvidersAsync(cancellationToken);
        List<ShippingRateQuote> quotes = [];

        foreach (var provider in providers)
        {
            if (!provider.Provider.IsAvailableFor(request))
            {
                continue;
            }

            try
            {
                var quote = await provider.Provider.GetRatesAsync(request, cancellationToken);
                if (quote != null)
                {
                    quotes.Add(quote);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Shipping provider {ProviderKey} failed while retrieving quotes.", provider.Metadata.Key);
            }
        }

        return quotes;
    }

    private async Task<(ShippingQuoteRequest Request, List<BasketError> Errors)> BuildRequestAsync(
        Basket basket,
        string countryCode,
        string? stateOrProvinceCode,
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
            .Where(item => item.LineItemType == LineItemType.Product && item.ProductId.HasValue)
            .ToList();

        if (!lineItems.Any())
        {
            return (new ShippingQuoteRequest
            {
                CountryCode = countryCode,
                StateOrProvinceCode = stateOrProvinceCode,
                CurrencyCode = basket.Currency,
                Items = Array.Empty<ShippingQuoteItem>(),
                Packages = Array.Empty<ShipmentPackage>()
            }, errors);
        }

        var productIds = lineItems.Select(item => item.ProductId!.Value).Distinct().ToList();

        using var scope = efCoreScopeProvider.CreateScope();
        var products = await scope.ExecuteWithContextAsync(async db =>
            await db.Products
                .Include(product => product.ProductRoot)
                    .ThenInclude(pr => pr!.ProductRootWarehouses)
                        .ThenInclude(prw => prw.Warehouse)
                            .ThenInclude(w => w!.ShippingOptions)
                                .ThenInclude(so => so.ShippingCosts)
                .Include(product => product.ProductRoot)
                    .ThenInclude(pr => pr!.ProductRootWarehouses)
                        .ThenInclude(prw => prw.Warehouse)
                            .ThenInclude(w => w!.ShippingOptions)
                                .ThenInclude(so => so.WeightTiers)
                .Include(product => product.ProductRoot)
                    .ThenInclude(pr => pr!.ProductRootWarehouses)
                        .ThenInclude(prw => prw.Warehouse)
                            .ThenInclude(w => w!.ServiceRegions)
                .Include(product => product.ShippingOptions)
                    .ThenInclude(option => option.ShippingCosts)
                .Include(product => product.ShippingOptions)
                    .ThenInclude(option => option.WeightTiers)
                .Include(product => product.ShippingOptions)
                    .ThenInclude(option => option.Warehouse)
                        .ThenInclude(warehouse => warehouse!.ServiceRegions)
                .Include(product => product.AllowedShippingOptions)
                    .ThenInclude(option => option.ShippingCosts)
                .Include(product => product.AllowedShippingOptions)
                    .ThenInclude(option => option.WeightTiers)
                .Include(product => product.AllowedShippingOptions)
                    .ThenInclude(option => option.Warehouse)
                        .ThenInclude(warehouse => warehouse!.ServiceRegions)
                .Include(product => product.ExcludedShippingOptions)
                .AsNoTracking()
                .Where(product => productIds.Contains(product.Id))
                .ToDictionaryAsync(product => product.Id, cancellationToken));
        scope.Complete();

        List<ShippingQuoteItem> items = [];
        decimal totalWeight = 0;

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

            var snapshot = BuildProductSnapshot(product, countryCode, stateOrProvinceCode);
            var weightPerItem = product.Weight ?? 0;
            totalWeight += weightPerItem * Math.Max(lineItem.Quantity, 1);

            items.Add(new ShippingQuoteItem
            {
                LineItemId = lineItem.Id,
                ProductId = product.Id,
                Quantity = lineItem.Quantity,
                IsShippable = true,
                TotalWeightKg = weightPerItem * Math.Max(lineItem.Quantity, 1),
                DestinationCost = product.GetShippingAmountForCountry(countryCode, stateOrProvinceCode),
                ProductSnapshot = snapshot
            });
        }

        var packages = totalWeight > 0
            ? new[] { new ShipmentPackage(totalWeight) }
            : Array.Empty<ShipmentPackage>();

        var subtotal = lineItems.Sum(item => item.Amount * item.Quantity);

        var request = new ShippingQuoteRequest
        {
            BasketId = basket.Id,
            CountryCode = countryCode,
            StateOrProvinceCode = stateOrProvinceCode,
            CurrencyCode = basket.Currency,
            ItemsSubtotal = subtotal,
            Items = items,
            Packages = packages
        };

        return (request, errors);
    }

    private static ShippingProductSnapshot BuildProductSnapshot(Product product, string countryCode, string? stateOrProvinceCode)
    {
        // Get allowed shipping options based on product restrictions
        var allowedOptions = GetAllowedShippingOptionsForProduct(product);

        var options = allowedOptions
            .Select(option =>
            {
                var destinationCost = ResolveShippingCost(option.ShippingCosts, countryCode, stateOrProvinceCode);
                var canShip = option.Warehouse.CanServeRegion(countryCode, stateOrProvinceCode);

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
                    CanShipToDestination = canShip && destinationCost.HasValue,
                    DestinationCost = destinationCost,
                    AllowsDeliveryDateSelection = option.AllowsDeliveryDateSelection,
                    MinDeliveryDays = option.MinDeliveryDays,
                    MaxDeliveryDays = option.MaxDeliveryDays,
                    AllowedDaysOfWeek = option.AllowedDaysOfWeek,
                    IsDeliveryDateGuaranteed = option.IsDeliveryDateGuaranteed,
                    Costs = option.ShippingCosts
                        .Select(cost => new ShippingCostSnapshot
                        {
                            CountryCode = cost.CountryCode,
                            StateOrProvinceCode = cost.StateOrProvinceCode,
                            Cost = cost.Cost
                        })
                        .ToList(),
                    WeightTiers = option.WeightTiers
                        .Select(tier => new ShippingWeightTierSnapshot
                        {
                            CountryCode = tier.CountryCode,
                            StateOrProvinceCode = tier.StateOrProvinceCode,
                            MinWeightKg = tier.MinWeightKg,
                            MaxWeightKg = tier.MaxWeightKg,
                            Surcharge = tier.Surcharge
                        })
                        .ToList()
                };
            })
            .ToList();

        return new ShippingProductSnapshot
        {
            ProductId = product.Id,
            Name = product.Name,
            WeightKg = product.Weight,
            ShippingOptions = options
        };
    }

    /// <summary>
    /// Gets the allowed shipping options for a product based on its restriction mode.
    /// Falls back to warehouse shipping options if product has no specific options configured.
    /// </summary>
    private static IEnumerable<ShippingOption> GetAllowedShippingOptionsForProduct(Product product)
    {
        // Get base shipping options - use product options or fall back to warehouse options
        var baseOptions = product.ShippingOptions.Any()
            ? product.ShippingOptions
            : product.ProductRoot?.ProductRootWarehouses
                .SelectMany(prw => prw.Warehouse?.ShippingOptions ?? [])
                .Distinct()
                .ToList() ?? [];

        // Apply restriction mode
        return product.ShippingRestrictionMode switch
        {
            ShippingRestrictionMode.AllowList => product.AllowedShippingOptions,
            ShippingRestrictionMode.ExcludeList => baseOptions
                .Where(so => !product.ExcludedShippingOptions.Any(eso => eso.Id == so.Id))
                .ToList(),
            _ => baseOptions
        };
    }

    private static decimal? ResolveShippingCost(IEnumerable<ShippingCost> costs, string countryCode, string? stateOrProvinceCode)
    {
        var normalizedCountry = countryCode.ToUpperInvariant();
        var normalizedState = stateOrProvinceCode?.ToUpperInvariant();

        var universalCost = costs.FirstOrDefault(cost =>
            cost.CountryCode == "*" && cost.StateOrProvinceCode == null)?.Cost;

        var matchingCountryCosts = costs
            .Where(cost => string.Equals(cost.CountryCode, normalizedCountry, StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (!matchingCountryCosts.Any())
        {
            return universalCost;
        }

        if (!string.IsNullOrWhiteSpace(normalizedState))
        {
            var stateMatch = matchingCountryCosts
                .FirstOrDefault(cost => string.Equals(cost.StateOrProvinceCode, normalizedState, StringComparison.OrdinalIgnoreCase));
            if (stateMatch != null)
            {
                return stateMatch.Cost;
            }
        }

        var countryLevelCost = matchingCountryCosts.FirstOrDefault(cost => cost.StateOrProvinceCode == null)?.Cost;
        return countryLevelCost ?? universalCost;
    }
}

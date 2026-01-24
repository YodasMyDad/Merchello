using Merchello.Core.ExchangeRates.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Core.Shared.Providers;
using Microsoft.Extensions.Options;

namespace Merchello.Core.Shipping.Providers.BuiltIn;

/// <summary>
/// Built-in provider that calculates shipping rates using ShippingOption/ShippingCost tables.
/// Returns each ShippingOption as a separate service level with weight-based surcharges.
/// </summary>
public class FlatRateShippingProvider(
    IOptions<MerchelloSettings> settings,
    IExchangeRateCache exchangeRateCache,
    ICurrencyService currencyService) : ShippingProviderBase
{
    private readonly MerchelloSettings _settings = settings.Value;
    private readonly IExchangeRateCache _exchangeRateCache = exchangeRateCache;
    private readonly ICurrencyService _currencyService = currencyService;
    /// <inheritdoc />
    public override ShippingProviderMetadata Metadata { get; } = new()
    {
        Key = "flat-rate",
        DisplayName = "Flat Rate Shipping",
        Icon = "icon-truck",
        Description = "Configure flat shipping rates based on destination country and region with optional weight-based surcharges.",
        SupportsRealTimeRates = false,
        SupportsTracking = false,
        SupportsLabelGeneration = false,
        SupportsDeliveryDateSelection = true,
        SupportsInternational = true,
        RequiresFullAddress = false,
        ConfigCapabilities = new ProviderConfigCapabilities
        {
            HasLocationBasedCosts = true,
            HasWeightTiers = true,
            UsesLiveRates = false,
            RequiresGlobalConfig = false
        }
    };

    /// <inheritdoc />
    public override ValueTask<IEnumerable<ProviderConfigurationField>> GetMethodConfigFieldsAsync(
        CancellationToken cancellationToken = default)
    {
        return ValueTask.FromResult<IEnumerable<ProviderConfigurationField>>(
        [
            new ProviderConfigurationField
            {
                Key = "name",
                Label = "Method Name",
                FieldType = ConfigurationFieldType.Text,
                IsRequired = true,
                Placeholder = "e.g., Standard Shipping"
            },
            new ProviderConfigurationField
            {
                Key = "fixedCost",
                Label = "Fixed Cost",
                FieldType = ConfigurationFieldType.Currency,
                IsRequired = false,
                Description = "Leave empty to use location-based costs"
            },
            new ProviderConfigurationField
            {
                Key = "daysFrom",
                Label = "Min Delivery Days",
                FieldType = ConfigurationFieldType.Number,
                DefaultValue = "3"
            },
            new ProviderConfigurationField
            {
                Key = "daysTo",
                Label = "Max Delivery Days",
                FieldType = ConfigurationFieldType.Number,
                DefaultValue = "5"
            },
            new ProviderConfigurationField
            {
                Key = "isNextDay",
                Label = "Next Day Delivery",
                FieldType = ConfigurationFieldType.Checkbox,
                Description = "Enable for next-day delivery options"
            }
        ]);
    }

    /// <inheritdoc />
    public override bool IsAvailableFor(ShippingQuoteRequest request)
    {
        return request.Items.Any(item => item.IsShippable);
    }

    /// <inheritdoc />
    public override async Task<ShippingRateQuote?> GetRatesAsync(
        ShippingQuoteRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!IsAvailableFor(request))
        {
            return null;
        }

        var shippableItems = request.Items.Where(i => i.IsShippable).ToList();
        List<string> errors = [];
        var storeCurrency = _settings.StoreCurrencyCode;
        var requestCurrency = request.CurrencyCode ?? storeCurrency;
        decimal? storeToRequestRate = null;
        if (!string.Equals(storeCurrency, requestCurrency, StringComparison.OrdinalIgnoreCase))
        {
            storeToRequestRate = await _exchangeRateCache.GetRateAsync(storeCurrency, requestCurrency, cancellationToken);
            if (!storeToRequestRate.HasValue || storeToRequestRate.Value <= 0m)
            {
                errors.Add($"No exchange rate available to convert shipping costs from {storeCurrency} to {requestCurrency}.");
                storeToRequestRate = null;
            }
        }

        if (!string.Equals(storeCurrency, requestCurrency, StringComparison.OrdinalIgnoreCase) && storeToRequestRate == null)
        {
            return new ShippingRateQuote
            {
                ProviderKey = Metadata.Key,
                ProviderName = Metadata.DisplayName,
                ServiceLevels = [],
                Errors = errors
            };
        }

        // Find shipping options that can service ALL items in this request
        var commonOptions = FindCommonShippingOptions(shippableItems);

        if (commonOptions.Count == 0)
        {
            errors.Add($"No shipping options available for all items to {request.CountryCode}.");
            return new ShippingRateQuote
            {
                ProviderKey = Metadata.Key,
                ProviderName = Metadata.DisplayName,
                ServiceLevels = [],
                Errors = errors
            };
        }

        // Calculate total weight for weight tier lookup
        var totalWeightKg = shippableItems.Sum(item => item.TotalWeightKg ?? 0);

        // Build service levels from common options
        List<ShippingServiceLevel> serviceLevels = [];

        foreach (var option in commonOptions)
        {
            var (cost, itemErrors) = CalculateOptionCost(
                option,
                totalWeightKg,
                request.CountryCode,
                request.StateOrProvinceCode);

            errors.AddRange(itemErrors);

            if (cost.HasValue)
            {
                var totalCost = Math.Max(0, cost.Value);
                if (storeToRequestRate.HasValue)
                {
                    totalCost = _currencyService.Round(totalCost * storeToRequestRate.Value, requestCurrency);
                }

                serviceLevels.Add(new ShippingServiceLevel
                {
                    ServiceCode = $"flat-{option.Id}",
                    ServiceName = option.Name ?? "Standard Shipping",
                    TotalCost = Math.Max(0, totalCost),
                    CurrencyCode = requestCurrency,
                    TransitTime = option.DaysFrom == option.DaysTo
                        ? TimeSpan.FromDays(option.DaysFrom)
                        : null,
                    EstimatedDeliveryDate = CalculateEstimatedDelivery(option),
                    Description = BuildServiceDescription(option),
                    ExtendedProperties = new Dictionary<string, string>
                    {
                        ["ShippingOptionId"] = option.Id.ToString(),
                        ["IsNextDay"] = option.IsNextDay.ToString()
                    }
                });
            }
        }

        // Sort by cost (cheapest first)
        serviceLevels = serviceLevels.OrderBy(sl => sl.TotalCost).ToList();

        var quote = new ShippingRateQuote
        {
            ProviderKey = Metadata.Key,
            ProviderName = Metadata.DisplayName,
            ServiceLevels = serviceLevels,
            Errors = errors
        };

        return quote;
    }

    /// <summary>
    /// Find shipping options that ALL items in the basket can use.
    /// </summary>
    private static List<ShippingOptionSnapshot> FindCommonShippingOptions(List<ShippingQuoteItem> items)
    {
        if (items.Count == 0)
            return [];

        // Start with first item's shipping options that can ship to destination
        var firstItem = items[0];
        var commonOptions = firstItem.ProductSnapshot?.ShippingOptions
            .Where(o => o.CanShipToDestination)
            .ToList() ?? [];

        // Intersect with each subsequent item's options
        foreach (var item in items.Skip(1))
        {
            var itemOptionIds = item.ProductSnapshot?.ShippingOptions
                .Where(o => o.CanShipToDestination)
                .Select(o => o.Id)
                .ToHashSet() ?? [];

            commonOptions = commonOptions
                .Where(o => itemOptionIds.Contains(o.Id))
                .ToList();

            if (commonOptions.Count == 0)
                break;
        }

        return commonOptions;
    }

    /// <summary>
    /// Calculate the total cost for a shipping option: base cost + weight tier surcharge.
    /// </summary>
    private static (decimal? Cost, List<string> Errors) CalculateOptionCost(
        ShippingOptionSnapshot option,
        decimal totalWeightKg,
        string countryCode,
        string? stateOrProvinceCode)
    {
        List<string> errors = [];

        // 1. Get base cost from ShippingCost table
        var baseCost = ResolveBaseCost(option.Costs, countryCode, stateOrProvinceCode);

        if (!baseCost.HasValue)
        {
            errors.Add($"No base shipping cost configured for '{option.Name}' to {countryCode}.");
            return (null, errors);
        }

        // 2. Get weight tier surcharge (0 if no matching tier)
        var weightSurcharge = ResolveWeightTierSurcharge(
            option.WeightTiers,
            totalWeightKg,
            countryCode,
            stateOrProvinceCode);

        // 3. Total = base + weight surcharge
        var totalCost = baseCost.Value + weightSurcharge;

        return (totalCost, errors);
    }

    /// <summary>
    /// Resolve the base shipping cost with priority: State > Country > Universal (*).
    /// </summary>
    private static decimal? ResolveBaseCost(
        IReadOnlyCollection<ShippingCostSnapshot> costs,
        string countryCode,
        string? stateOrProvinceCode)
    {
        var normalizedCountry = countryCode.ToUpperInvariant();
        var normalizedState = stateOrProvinceCode?.ToUpperInvariant();

        // Priority 1: Exact state match
        if (!string.IsNullOrWhiteSpace(normalizedState))
        {
            var stateMatch = costs.FirstOrDefault(c =>
                string.Equals(c.CountryCode, normalizedCountry, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(c.StateOrProvinceCode, normalizedState, StringComparison.OrdinalIgnoreCase));
            if (stateMatch != null)
                return stateMatch.Cost;
        }

        // Priority 2: Country-level cost
        var countryMatch = costs.FirstOrDefault(c =>
            string.Equals(c.CountryCode, normalizedCountry, StringComparison.OrdinalIgnoreCase) &&
            c.StateOrProvinceCode == null);
        if (countryMatch != null)
            return countryMatch.Cost;

        // Priority 3: Universal fallback
        var universalMatch = costs.FirstOrDefault(c =>
            c.CountryCode == "*" && c.StateOrProvinceCode == null);
        return universalMatch?.Cost;
    }

    /// <summary>
    /// Resolve the weight tier surcharge with priority: State > Country > Universal (*).
    /// Returns 0 if no matching tier found.
    /// </summary>
    private static decimal ResolveWeightTierSurcharge(
        IReadOnlyCollection<ShippingWeightTierSnapshot> tiers,
        decimal weightKg,
        string countryCode,
        string? stateOrProvinceCode)
    {
        if (tiers.Count == 0 || weightKg <= 0)
            return 0;

        var normalizedCountry = countryCode.ToUpperInvariant();
        var normalizedState = stateOrProvinceCode?.ToUpperInvariant();

        // Find applicable tier with priority: state > country > universal
        ShippingWeightTierSnapshot? matchingTier = null;
        var matchPriority = 0;

        foreach (var tier in tiers)
        {
            // Check weight range (min inclusive, max exclusive)
            if (weightKg < tier.MinWeightKg)
                continue;
            if (tier.MaxWeightKg.HasValue && weightKg >= tier.MaxWeightKg.Value)
                continue;

            // Determine match priority
            var priority = 0;

            if (tier.CountryCode == "*")
            {
                priority = 1; // Universal
            }
            else if (string.Equals(tier.CountryCode, normalizedCountry, StringComparison.OrdinalIgnoreCase))
            {
                if (tier.StateOrProvinceCode == null)
                {
                    priority = 2; // Country match
                }
                else if (string.Equals(tier.StateOrProvinceCode, normalizedState, StringComparison.OrdinalIgnoreCase))
                {
                    priority = 3; // State match (highest priority)
                }
            }

            if (priority > matchPriority)
            {
                matchingTier = tier;
                matchPriority = priority;
            }
        }

        return matchingTier?.Surcharge ?? 0;
    }

    private static DateTime? CalculateEstimatedDelivery(ShippingOptionSnapshot option)
    {
        if (option.IsNextDay && option.NextDayCutOffTime.HasValue)
        {
            var now = DateTime.UtcNow;
            return now.TimeOfDay < option.NextDayCutOffTime.Value
                ? now.Date.AddDays(1)
                : now.Date.AddDays(2);
        }

        return option.DaysTo > 0
            ? DateTime.UtcNow.Date.AddDays(option.DaysTo)
            : null;
    }

    private static string BuildServiceDescription(ShippingOptionSnapshot option)
    {
        if (option.IsNextDay)
            return "Next day delivery";

        if (option.DaysFrom == option.DaysTo)
            return option.DaysFrom == 1
                ? "Delivery in 1 business day"
                : $"Delivery in {option.DaysFrom} business days";

        return $"Delivery in {option.DaysFrom}-{option.DaysTo} business days";
    }
}

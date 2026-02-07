using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Extensions;
using Merchello.Core.Shipping.Services.Interfaces;

namespace Merchello.Core.Shipping.Services;

/// <summary>
/// Single source of truth for shipping option destination eligibility checks.
/// </summary>
public class ShippingOptionEligibilityService(
    IShippingCostResolver shippingCostResolver) : IShippingOptionEligibilityService
{
    public IReadOnlyList<EligibleShippingOption> GetEligibleOptions(
        IEnumerable<ShippingOption> shippingOptions,
        string countryCode,
        string? regionCode = null,
        IReadOnlySet<string>? enabledProviderKeys = null,
        IReadOnlyDictionary<string, bool>? usesLiveRatesLookup = null)
    {
        if (string.IsNullOrWhiteSpace(countryCode))
        {
            return [];
        }

        var eligible = new List<EligibleShippingOption>();

        foreach (var option in shippingOptions)
        {
            if (!option.IsEnabled)
            {
                continue;
            }

            // Optional provider enablement filter (flat-rate is always available).
            if (enabledProviderKeys != null &&
                !string.Equals(option.ProviderKey, "flat-rate", StringComparison.OrdinalIgnoreCase) &&
                !enabledProviderKeys.Contains(option.ProviderKey))
            {
                continue;
            }

            if (option.IsDestinationExcluded(countryCode, regionCode))
            {
                continue;
            }

            // Guard against options whose warehouse cannot serve this destination.
            if (option.Warehouse != null && !option.Warehouse.CanServeRegion(countryCode, regionCode))
            {
                continue;
            }

            var usesLiveRates = usesLiveRatesLookup?.GetValueOrDefault(option.ProviderKey, false) ?? false;
            var cost = shippingCostResolver.GetTotalShippingCost(option, countryCode, regionCode);

            // Local-rate options require a resolved destination cost.
            if (!usesLiveRates && !cost.HasValue)
            {
                continue;
            }

            eligible.Add(new EligibleShippingOption
            {
                Option = option,
                Cost = cost,
                UsesLiveRates = usesLiveRates
            });
        }

        return eligible;
    }
}

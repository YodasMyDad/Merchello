using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services.Interfaces;

namespace Merchello.Core.Shipping.Services;

/// <summary>
/// Centralized shipping cost resolution with consistent priority matching.
/// This is the single source of truth for shipping cost lookup logic.
/// </summary>
public class ShippingCostResolver : IShippingCostResolver
{
    /// <inheritdoc />
    public decimal? ResolveBaseCost(
        IReadOnlyCollection<ShippingCost> costs,
        string countryCode,
        string? stateOrProvinceCode,
        decimal? fixedCostFallback = null)
    {
        if (costs.Count == 0)
        {
            return fixedCostFallback;
        }

        var normalizedCountry = countryCode.ToUpperInvariant();
        var normalizedState = stateOrProvinceCode?.ToUpperInvariant();

        // Priority 1: Exact state match (country + state)
        if (!string.IsNullOrWhiteSpace(normalizedState))
        {
            var stateMatch = costs.FirstOrDefault(c =>
                string.Equals(c.CountryCode, normalizedCountry, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(c.StateOrProvinceCode, normalizedState, StringComparison.OrdinalIgnoreCase));

            if (stateMatch != null)
            {
                return stateMatch.Cost;
            }
        }

        // Priority 2: Country-level cost (country with no state)
        var countryMatch = costs.FirstOrDefault(c =>
            string.Equals(c.CountryCode, normalizedCountry, StringComparison.OrdinalIgnoreCase) &&
            string.IsNullOrEmpty(c.StateOrProvinceCode));

        if (countryMatch != null)
        {
            return countryMatch.Cost;
        }

        // Priority 3: Universal fallback (*)
        var universalMatch = costs.FirstOrDefault(c =>
            c.CountryCode == "*" &&
            string.IsNullOrEmpty(c.StateOrProvinceCode));

        if (universalMatch != null)
        {
            return universalMatch.Cost;
        }

        // Priority 4: Fixed cost fallback
        return fixedCostFallback;
    }

    /// <inheritdoc />
    public decimal ResolveWeightTierSurcharge(
        IReadOnlyCollection<ShippingWeightTier> tiers,
        decimal weightKg,
        string countryCode,
        string? stateOrProvinceCode)
    {
        if (tiers.Count == 0 || weightKg <= 0)
        {
            return 0;
        }

        var normalizedCountry = countryCode.ToUpperInvariant();
        var normalizedState = stateOrProvinceCode?.ToUpperInvariant();

        ShippingWeightTier? matchingTier = null;
        var matchPriority = 0;

        foreach (var tier in tiers)
        {
            // Check weight range (min inclusive, max exclusive)
            if (weightKg < tier.MinWeightKg)
            {
                continue;
            }

            if (tier.MaxWeightKg.HasValue && weightKg >= tier.MaxWeightKg.Value)
            {
                continue;
            }

            // Determine match priority
            var priority = GetLocationMatchPriority(
                tier.CountryCode,
                tier.StateOrProvinceCode,
                normalizedCountry,
                normalizedState);

            if (priority > matchPriority)
            {
                matchingTier = tier;
                matchPriority = priority;
            }
        }

        return matchingTier?.Surcharge ?? 0;
    }

    /// <inheritdoc />
    public decimal? GetTotalShippingCost(
        ShippingOption shippingOption,
        string countryCode,
        string? stateOrProvinceCode,
        decimal? weightKg = null)
    {
        var costs = shippingOption.ShippingCosts.ToList();
        var baseCost = ResolveBaseCost(
            costs,
            countryCode,
            stateOrProvinceCode,
            shippingOption.FixedCost);

        if (baseCost == null)
        {
            return null;
        }

        // Add weight tier surcharge if applicable
        if (weightKg.HasValue && weightKg.Value > 0)
        {
            var tiers = shippingOption.WeightTiers.ToList();
            var surcharge = ResolveWeightTierSurcharge(tiers, weightKg.Value, countryCode, stateOrProvinceCode);
            return baseCost.Value + surcharge;
        }

        return baseCost;
    }

    /// <summary>
    /// Gets the location match priority for a tier/cost.
    /// Higher value = higher priority.
    /// </summary>
    private static int GetLocationMatchPriority(
        string tierCountryCode,
        string? tierStateCode,
        string normalizedCountry,
        string? normalizedState)
    {
        // Universal match (*)
        if (tierCountryCode == "*")
        {
            return 1;
        }

        // Country must match for priorities 2 and 3
        if (!string.Equals(tierCountryCode, normalizedCountry, StringComparison.OrdinalIgnoreCase))
        {
            return 0;
        }

        // Country-only match
        if (string.IsNullOrEmpty(tierStateCode))
        {
            return 2;
        }

        // State match (highest priority)
        if (!string.IsNullOrEmpty(normalizedState) &&
            string.Equals(tierStateCode, normalizedState, StringComparison.OrdinalIgnoreCase))
        {
            return 3;
        }

        return 0;
    }
}

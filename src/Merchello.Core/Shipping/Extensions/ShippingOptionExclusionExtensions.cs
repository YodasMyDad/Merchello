using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Shipping.Extensions;

public static class ShippingOptionExclusionExtensions
{
    /// <summary>
    /// Returns true when the shipping option is explicitly excluded for the destination.
    /// Region exclusions are evaluated first, then country-level exclusions.
    /// </summary>
    public static bool IsDestinationExcluded(this ShippingOption shippingOption, string countryCode, string? regionCode = null)
    {
        ArgumentNullException.ThrowIfNull(shippingOption);
        return IsDestinationExcluded(shippingOption.ExcludedRegions, countryCode, regionCode);
    }

    /// <summary>
    /// Returns true when exclusions contain a matching destination rule.
    /// </summary>
    public static bool IsDestinationExcluded(
        this IReadOnlyCollection<ShippingOptionExcludedRegion> exclusions,
        string countryCode,
        string? regionCode = null)
    {
        if (string.IsNullOrWhiteSpace(countryCode) || exclusions.Count == 0)
        {
            return false;
        }

        var normalizedCountry = countryCode.ToUpperInvariant();
        var normalizedRegion = regionCode?.ToUpperInvariant();

        // Match country-specific and wildcard-country exclusions.
        var countryMatches = exclusions
            .Where(x =>
                string.Equals(x.CountryCode, normalizedCountry, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(x.CountryCode, "*", StringComparison.Ordinal))
            .ToList();

        if (countryMatches.Count == 0)
        {
            return false;
        }

        // Region-specific exclusion wins when a region is available.
        if (!string.IsNullOrWhiteSpace(normalizedRegion))
        {
            var hasRegionExclusion = countryMatches.Any(x =>
                !string.IsNullOrWhiteSpace(x.RegionCode) &&
                string.Equals(x.RegionCode, normalizedRegion, StringComparison.OrdinalIgnoreCase));

            if (hasRegionExclusion)
            {
                return true;
            }
        }

        // Country-level exclusion (no region) excludes all regions for that country.
        return countryMatches.Any(x => string.IsNullOrWhiteSpace(x.RegionCode));
    }
}

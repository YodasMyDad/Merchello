using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Shipping.Services.Interfaces;

/// <summary>
/// Centralized shipping cost resolution with consistent priority matching.
/// Priority: State > Country > Universal (*) > Fixed fallback.
/// </summary>
public interface IShippingCostResolver
{
    /// <summary>
    /// Resolves the base shipping cost for a destination with priority matching.
    /// Priority: State-specific > Country-level > Universal (*) > Fixed cost fallback.
    /// </summary>
    /// <param name="costs">Collection of shipping costs to search</param>
    /// <param name="countryCode">Destination country code (normalized to uppercase)</param>
    /// <param name="stateOrProvinceCode">Optional destination state/province code</param>
    /// <param name="fixedCostFallback">Fallback cost if no matching rule found</param>
    /// <returns>The resolved shipping cost, or null if no match and no fallback</returns>
    decimal? ResolveBaseCost(
        IReadOnlyCollection<ShippingCost> costs,
        string countryCode,
        string? stateOrProvinceCode,
        decimal? fixedCostFallback = null);

    /// <summary>
    /// Resolves the weight tier surcharge for a destination with priority matching.
    /// Priority: State-specific > Country-level > Universal (*).
    /// </summary>
    /// <param name="tiers">Collection of weight tiers to search</param>
    /// <param name="weightKg">Total weight in kilograms</param>
    /// <param name="countryCode">Destination country code</param>
    /// <param name="stateOrProvinceCode">Optional destination state/province code</param>
    /// <returns>The surcharge amount, or 0 if no matching tier</returns>
    decimal ResolveWeightTierSurcharge(
        IReadOnlyCollection<ShippingWeightTier> tiers,
        decimal weightKg,
        string countryCode,
        string? stateOrProvinceCode);

    /// <summary>
    /// Gets the total shipping cost including base cost and weight surcharge.
    /// </summary>
    /// <param name="shippingOption">The shipping option with costs and weight tiers</param>
    /// <param name="countryCode">Destination country code</param>
    /// <param name="stateOrProvinceCode">Optional destination state/province code</param>
    /// <param name="weightKg">Optional total weight in kilograms</param>
    /// <returns>The total shipping cost, or null if no base cost can be resolved</returns>
    decimal? GetTotalShippingCost(
        ShippingOption shippingOption,
        string countryCode,
        string? stateOrProvinceCode,
        decimal? weightKg = null);
}

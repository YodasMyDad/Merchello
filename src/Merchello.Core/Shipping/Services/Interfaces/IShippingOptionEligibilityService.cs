using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Shipping.Services.Interfaces;

/// <summary>
/// Centralized destination eligibility checks for shipping options.
/// </summary>
public interface IShippingOptionEligibilityService
{
    /// <summary>
    /// Returns shipping options that are eligible for the destination.
    /// </summary>
    /// <param name="shippingOptions">Candidate shipping options.</param>
    /// <param name="countryCode">Destination country code.</param>
    /// <param name="regionCode">Optional destination region/state code.</param>
    /// <param name="enabledProviderKeys">
    /// Optional enabled provider keys. When supplied, non-flat-rate options
    /// are filtered to enabled providers only.
    /// </param>
    /// <param name="usesLiveRatesLookup">
    /// Optional lookup of provider key to "uses live rates". If true, the
    /// option can be eligible without a resolved local cost.
    /// </param>
    /// <returns>Eligible options with resolved cost metadata.</returns>
    IReadOnlyList<EligibleShippingOption> GetEligibleOptions(
        IEnumerable<ShippingOption> shippingOptions,
        string countryCode,
        string? regionCode = null,
        IReadOnlySet<string>? enabledProviderKeys = null,
        IReadOnlyDictionary<string, bool>? usesLiveRatesLookup = null);
}


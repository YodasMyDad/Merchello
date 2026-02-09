using Merchello.Core.Shipping.Models;

namespace Merchello.Core.Shipping.Providers;

/// <summary>
/// Snapshot of a postcode rule entry for a shipping option.
/// </summary>
public class ShippingPostcodeRuleSnapshot
{
    public string CountryCode { get; init; } = null!;
    public string Pattern { get; init; } = null!;
    public PostcodeMatchType MatchType { get; init; }
    public PostcodeRuleAction Action { get; init; }
    public decimal Surcharge { get; init; }
}

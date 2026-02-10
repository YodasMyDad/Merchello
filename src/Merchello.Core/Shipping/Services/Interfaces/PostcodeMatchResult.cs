using Merchello.Core.Shipping.Providers;

namespace Merchello.Core.Shipping.Services.Interfaces;

/// <summary>
/// Result of postcode rule evaluation.
/// </summary>
/// <param name="IsBlocked">Whether delivery is blocked to this postcode</param>
/// <param name="Surcharge">Surcharge amount from the most specific matching surcharge rule (0 if none or blocked)</param>
/// <param name="MatchedRule">The rule that matched (null if no match)</param>
public record PostcodeMatchResult(
    bool IsBlocked,
    decimal Surcharge,
    ShippingPostcodeRuleSnapshot? MatchedRule);

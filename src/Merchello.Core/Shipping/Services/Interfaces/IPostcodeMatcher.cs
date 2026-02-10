using Merchello.Core.Shipping.Providers;

namespace Merchello.Core.Shipping.Services.Interfaces;

/// <summary>
/// Service for matching postcodes against postcode rules.
/// </summary>
public interface IPostcodeMatcher
{
    /// <summary>
    /// Determines if a postcode matches the given rule pattern.
    /// </summary>
    /// <param name="postalCode">The postal code to check</param>
    /// <param name="rule">The rule to match against</param>
    /// <returns>True if the postcode matches the rule pattern</returns>
    bool IsMatch(string postalCode, ShippingPostcodeRuleSnapshot rule);

    /// <summary>
    /// Evaluates all rules and returns the result based on "most specific rule wins" logic.
    /// </summary>
    /// <param name="postalCode">The postal code to check (null/empty skips all rules)</param>
    /// <param name="countryCode">The country code to filter rules</param>
    /// <param name="rules">Collection of postcode rules to evaluate</param>
    /// <returns>Result containing block status and surcharge from the most specific matching rule</returns>
    PostcodeMatchResult EvaluateRules(
        string? postalCode,
        string countryCode,
        IReadOnlyCollection<ShippingPostcodeRuleSnapshot> rules);
}

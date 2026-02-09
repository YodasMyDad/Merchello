namespace Merchello.Core.Shipping.Models;

/// <summary>
/// Defines how a postcode pattern should be matched.
/// </summary>
public enum PostcodeMatchType
{
    /// <summary>
    /// Matches postcodes starting with the pattern (e.g., "IM" matches "IM1", "IM1 1AA").
    /// </summary>
    Prefix = 0,

    /// <summary>
    /// UK outcode range matching (e.g., "IV21-IV28" matches IV21, IV22...IV28).
    /// Pattern format: {letters}{start}-{letters}{end}
    /// </summary>
    OutcodeRange = 10,

    /// <summary>
    /// Numeric range matching for zip codes (e.g., "20010-21000").
    /// </summary>
    NumericRange = 20,

    /// <summary>
    /// Exact postcode match (normalized, spaces/case insensitive).
    /// </summary>
    Exact = 30
}

using Merchello.Core.Shared.Extensions;

namespace Merchello.Core.Shipping.Models;

/// <summary>
/// Postcode-based shipping rule that can block delivery or add surcharges based on postal code patterns.
/// </summary>
public class ShippingPostcodeRule
{
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// Parent shipping option ID (for JSON storage association).
    /// </summary>
    public Guid ShippingOptionId { get; set; }

    /// <summary>
    /// Country code this rule applies to (ISO 3166-1 alpha-2).
    /// Required - postcode formats vary by country.
    /// </summary>
    public string CountryCode { get; set; } = null!;

    /// <summary>
    /// The postcode pattern. Interpretation depends on MatchType:
    /// - Prefix: "IM", "HS", "ZE" (matches any postcode starting with this)
    /// - OutcodeRange: "IV21-IV28" (matches UK outcodes in range)
    /// - NumericRange: "20010-21000" (matches numeric zip codes in range)
    /// - Exact: "IM1 1AA" (matches this exact postcode, normalized)
    /// </summary>
    public string Pattern { get; set; } = null!;

    /// <summary>
    /// How to interpret the Pattern field.
    /// </summary>
    public PostcodeMatchType MatchType { get; set; } = PostcodeMatchType.Prefix;

    /// <summary>
    /// The action to take when a postcode matches.
    /// </summary>
    public PostcodeRuleAction Action { get; set; } = PostcodeRuleAction.Block;

    /// <summary>
    /// Surcharge amount when Action is Surcharge (in store currency).
    /// </summary>
    public decimal Surcharge { get; set; }

    /// <summary>
    /// Optional human-readable description for admin UI.
    /// </summary>
    public string? Description { get; set; }

    public DateTime CreateDate { get; set; } = DateTime.UtcNow;
    public DateTime UpdateDate { get; set; } = DateTime.UtcNow;
}

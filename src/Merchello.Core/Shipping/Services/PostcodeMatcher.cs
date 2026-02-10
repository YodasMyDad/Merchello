using System.Text.RegularExpressions;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shipping.Services.Interfaces;

namespace Merchello.Core.Shipping.Services;

/// <summary>
/// Service for matching postcodes against postcode rules.
/// Uses "most specific rule wins" logic for determining which rule applies.
/// </summary>
public partial class PostcodeMatcher : IPostcodeMatcher
{
    /// <summary>
    /// Normalizes a postcode for comparison (uppercase, no spaces/hyphens).
    /// </summary>
    private static string Normalize(string postcode) =>
        postcode.ToUpperInvariant().Replace(" ", "").Replace("-", "");

    /// <inheritdoc />
    public bool IsMatch(string postalCode, ShippingPostcodeRuleSnapshot rule)
    {
        if (string.IsNullOrWhiteSpace(postalCode))
            return false;

        var normalized = Normalize(postalCode);
        var pattern = rule.Pattern.Trim();

        return rule.MatchType switch
        {
            PostcodeMatchType.Prefix => MatchPrefix(normalized, pattern),
            PostcodeMatchType.OutcodeRange => MatchOutcodeRange(normalized, pattern),
            // For numeric range, use uppercase-only (preserve hyphens for ZIP+4)
            PostcodeMatchType.NumericRange => MatchNumericRange(postalCode.ToUpperInvariant(), pattern),
            PostcodeMatchType.Exact => MatchExact(normalized, pattern),
            _ => false
        };
    }

    /// <inheritdoc />
    public PostcodeMatchResult EvaluateRules(
        string? postalCode,
        string countryCode,
        IReadOnlyCollection<ShippingPostcodeRuleSnapshot> rules)
    {
        // No postcode or no rules = no match (skip rule evaluation)
        if (string.IsNullOrWhiteSpace(postalCode) || rules.Count == 0)
            return new PostcodeMatchResult(false, 0m, null);

        // Filter to rules for this country and find matching rules
        var matchingRules = rules
            .Where(r => string.Equals(r.CountryCode, countryCode, StringComparison.OrdinalIgnoreCase))
            .Where(r => IsMatch(postalCode, r))
            .Select(r => (Rule: r, Specificity: GetSpecificity(r)))
            .OrderByDescending(x => x.Specificity)
            .ThenBy(x => x.Rule.Action) // Block (0) before Surcharge (10) at same specificity
            .ToList();

        if (matchingRules.Count == 0)
            return new PostcodeMatchResult(false, 0m, null);

        // Most specific rule wins
        var winner = matchingRules[0].Rule;

        return winner.Action switch
        {
            PostcodeRuleAction.Block => new PostcodeMatchResult(true, 0m, winner),
            PostcodeRuleAction.Surcharge => new PostcodeMatchResult(false, winner.Surcharge, winner),
            _ => new PostcodeMatchResult(false, 0m, null)
        };
    }

    /// <summary>
    /// Gets the specificity score for a rule. Higher = more specific.
    /// </summary>
    private static int GetSpecificity(ShippingPostcodeRuleSnapshot rule)
    {
        return rule.MatchType switch
        {
            // Exact match is most specific
            PostcodeMatchType.Exact => 100,

            // Range matches are moderately specific
            PostcodeMatchType.OutcodeRange => 50,
            PostcodeMatchType.NumericRange => 50,

            // Prefix: longer prefixes are more specific
            PostcodeMatchType.Prefix => 10 + rule.Pattern.Length,

            _ => 0
        };
    }

    /// <summary>
    /// Matches postcodes starting with the pattern.
    /// </summary>
    private static bool MatchPrefix(string normalized, string pattern)
    {
        var normalizedPattern = Normalize(pattern);
        return normalized.StartsWith(normalizedPattern, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Matches UK postcodes within an outcode range (e.g., "IV21-IV28").
    /// </summary>
    private static bool MatchOutcodeRange(string normalized, string pattern)
    {
        try
        {
            // Pattern format: "IV21-IV28" or "PA20-PA80"
            var parts = pattern.Split('-', 2);
            if (parts.Length != 2)
                return false;

            var startOutcode = Normalize(parts[0]);
            var endOutcode = Normalize(parts[1]);

            // Extract the outcode from the postcode (UK format: outcode + incode)
            var outcode = ExtractUkOutcode(normalized);
            if (string.IsNullOrEmpty(outcode))
                return false;

            // Parse prefix letters and numeric parts
            var (startPrefix, startNum) = ParseUkOutcode(startOutcode);
            var (endPrefix, endNum) = ParseUkOutcode(endOutcode);

            // Must have same letter prefix in range
            if (!string.Equals(startPrefix, endPrefix, StringComparison.OrdinalIgnoreCase))
                return false;

            var (outcodePrefix, outcodeNum) = ParseUkOutcode(outcode);

            // Must match the prefix and be within numeric range
            if (!string.Equals(outcodePrefix, startPrefix, StringComparison.OrdinalIgnoreCase))
                return false;

            return outcodeNum >= startNum && outcodeNum <= endNum;
        }
        catch
        {
            // Invalid pattern format - treat as no match
            return false;
        }
    }

    /// <summary>
    /// Matches numeric zip codes within a range (e.g., "20010-21000").
    /// </summary>
    private static bool MatchNumericRange(string normalized, string pattern)
    {
        try
        {
            var parts = pattern.Split('-', 2);
            if (parts.Length != 2)
                return false;

            // Extract only numeric portion from postcode (handles formats like "90210-1234")
            var numericPostcode = ExtractLeadingDigits(normalized);
            if (string.IsNullOrEmpty(numericPostcode))
                return false;

            if (!long.TryParse(numericPostcode, out var postcodeNum))
                return false;
            if (!long.TryParse(parts[0].Trim(), out var startNum))
                return false;
            if (!long.TryParse(parts[1].Trim(), out var endNum))
                return false;

            return postcodeNum >= startNum && postcodeNum <= endNum;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Matches exact postcode (normalized, case/space insensitive).
    /// </summary>
    private static bool MatchExact(string normalized, string pattern)
    {
        return string.Equals(normalized, Normalize(pattern), StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Extracts the outcode from a UK postcode.
    /// UK postcodes: outcode (2-4 chars) + incode (3 chars)
    /// e.g., "IV21 1AB" -> "IV21", "SW1A 1AA" -> "SW1A"
    /// </summary>
    private static string ExtractUkOutcode(string normalized)
    {
        // If postcode is too short, return as-is (might just be the outcode)
        if (normalized.Length <= 4)
            return normalized;

        // The incode is always 3 characters at the end (letter + digit + digit or digit + letter + letter)
        // So outcode is everything before the last 3 characters
        return normalized[..^3];
    }

    /// <summary>
    /// Parses UK outcode into prefix letters and numeric part.
    /// e.g., "IV21" -> ("IV", 21), "SW1A" -> ("SW", 1), "EC1" -> ("EC", 1)
    /// </summary>
    private static (string Prefix, int Number) ParseUkOutcode(string outcode)
    {
        // Find where letters end and numbers begin
        var prefixEnd = 0;
        for (var i = 0; i < outcode.Length; i++)
        {
            if (char.IsLetter(outcode[i]))
                prefixEnd = i + 1;
            else
                break;
        }

        var prefix = outcode[..prefixEnd];
        var remainder = outcode[prefixEnd..];

        // Extract just the numeric portion (handles outcodes like "SW1A" where A is after the number)
        var numericPart = ExtractLeadingDigits(remainder);
        int.TryParse(numericPart, out var number);

        return (prefix, number);
    }

    /// <summary>
    /// Extracts leading digits from a string.
    /// </summary>
    private static string ExtractLeadingDigits(string input)
    {
        var digits = new System.Text.StringBuilder();
        foreach (var c in input)
        {
            if (char.IsDigit(c))
                digits.Append(c);
            else
                break;
        }
        return digits.ToString();
    }
}

using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shipping.Services;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Shipping.Services;

public class PostcodeMatcherTests
{
    private readonly PostcodeMatcher _matcher = new();

    #region Helper Methods

    private static ShippingPostcodeRuleSnapshot CreateRule(
        string countryCode,
        string pattern,
        PostcodeMatchType matchType,
        PostcodeRuleAction action = PostcodeRuleAction.Surcharge,
        decimal surcharge = 0m)
    {
        return new ShippingPostcodeRuleSnapshot
        {
            CountryCode = countryCode,
            Pattern = pattern,
            MatchType = matchType,
            Action = action,
            Surcharge = surcharge
        };
    }

    #endregion

    #region Prefix Matching Tests

    [Fact]
    public void IsMatch_PrefixMatch_ReturnsTrue()
    {
        // Arrange
        var rule = CreateRule("GB", "IM", PostcodeMatchType.Prefix);

        // Act
        var result = _matcher.IsMatch("IM1 1AA", rule);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public void IsMatch_PrefixNoMatch_ReturnsFalse()
    {
        // Arrange
        var rule = CreateRule("GB", "IM", PostcodeMatchType.Prefix);

        // Act
        var result = _matcher.IsMatch("IV21 1AB", rule);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public void IsMatch_PrefixCaseInsensitive_ReturnsTrue()
    {
        // Arrange
        var rule = CreateRule("GB", "IM", PostcodeMatchType.Prefix);

        // Act
        var result = _matcher.IsMatch("im1 1aa", rule);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public void IsMatch_PrefixWithSpaces_ReturnsTrue()
    {
        // Arrange - pattern with spaces should still match
        var rule = CreateRule("GB", "BT", PostcodeMatchType.Prefix);

        // Act
        var result = _matcher.IsMatch("BT1 1AA", rule);

        // Assert
        result.ShouldBeTrue();
    }

    [Theory]
    [InlineData("HS", "HS1 1AA", true)]  // Outer Hebrides
    [InlineData("ZE", "ZE1 0AA", true)]  // Shetland
    [InlineData("BT", "BT1 1AA", true)]  // Northern Ireland
    [InlineData("KA27", "KA27 8AA", true)] // Isle of Arran
    [InlineData("KW", "KW17 2AA", true)] // Orkney
    [InlineData("IV", "IV99 1ZZ", true)] // Highlands
    [InlineData("PA", "PA20 0AA", true)] // Scottish Islands
    [InlineData("IM", "SW1A 1AA", false)] // Wrong prefix
    public void IsMatch_PrefixTheory(string pattern, string postcode, bool expected)
    {
        // Arrange
        var rule = CreateRule("GB", pattern, PostcodeMatchType.Prefix);

        // Act
        var result = _matcher.IsMatch(postcode, rule);

        // Assert
        result.ShouldBe(expected);
    }

    #endregion

    #region UK Outcode Range Tests

    [Fact]
    public void IsMatch_UkRangeStart_ReturnsTrue()
    {
        // Arrange
        var rule = CreateRule("GB", "IV21-IV28", PostcodeMatchType.OutcodeRange);

        // Act
        var result = _matcher.IsMatch("IV21 1AB", rule);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public void IsMatch_UkRangeMiddle_ReturnsTrue()
    {
        // Arrange
        var rule = CreateRule("GB", "IV21-IV28", PostcodeMatchType.OutcodeRange);

        // Act
        var result = _matcher.IsMatch("IV25 2CD", rule);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public void IsMatch_UkRangeEnd_ReturnsTrue()
    {
        // Arrange
        var rule = CreateRule("GB", "IV21-IV28", PostcodeMatchType.OutcodeRange);

        // Act
        var result = _matcher.IsMatch("IV28 9ZZ", rule);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public void IsMatch_UkRangeBelow_ReturnsFalse()
    {
        // Arrange
        var rule = CreateRule("GB", "IV21-IV28", PostcodeMatchType.OutcodeRange);

        // Act
        var result = _matcher.IsMatch("IV20 1AB", rule);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public void IsMatch_UkRangeAbove_ReturnsFalse()
    {
        // Arrange
        var rule = CreateRule("GB", "IV21-IV28", PostcodeMatchType.OutcodeRange);

        // Act
        var result = _matcher.IsMatch("IV29 1AB", rule);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public void IsMatch_UkRangeDifferentPrefix_ReturnsFalse()
    {
        // Arrange
        var rule = CreateRule("GB", "IV21-IV28", PostcodeMatchType.OutcodeRange);

        // Act - PA25 is in numeric range but wrong prefix
        var result = _matcher.IsMatch("PA25 1AB", rule);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public void IsMatch_UkRangeCaseInsensitive_ReturnsTrue()
    {
        // Arrange
        var rule = CreateRule("GB", "IV21-IV28", PostcodeMatchType.OutcodeRange);

        // Act
        var result = _matcher.IsMatch("iv25 2cd", rule);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public void IsMatch_UkRangePA20_PA80_ReturnsTrue()
    {
        // Arrange - PA20-PA80 is a common Scottish islands range
        var rule = CreateRule("GB", "PA20-PA80", PostcodeMatchType.OutcodeRange);

        // Act
        var result = _matcher.IsMatch("PA34 4AA", rule);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public void IsMatch_UkRangeInvalidPattern_ReturnsFalse()
    {
        // Arrange - Invalid pattern format
        var rule = CreateRule("GB", "IV21IV28", PostcodeMatchType.OutcodeRange); // Missing hyphen

        // Act
        var result = _matcher.IsMatch("IV25 1AB", rule);

        // Assert
        result.ShouldBeFalse();
    }

    #endregion

    #region Numeric Range Tests

    [Fact]
    public void IsMatch_NumericRangeWithin_ReturnsTrue()
    {
        // Arrange - US zip code range
        var rule = CreateRule("US", "20010-21000", PostcodeMatchType.NumericRange);

        // Act
        var result = _matcher.IsMatch("20500", rule);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public void IsMatch_NumericRangeBelow_ReturnsFalse()
    {
        // Arrange
        var rule = CreateRule("US", "20010-21000", PostcodeMatchType.NumericRange);

        // Act
        var result = _matcher.IsMatch("20009", rule);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public void IsMatch_NumericRangeAbove_ReturnsFalse()
    {
        // Arrange
        var rule = CreateRule("US", "20010-21000", PostcodeMatchType.NumericRange);

        // Act
        var result = _matcher.IsMatch("21001", rule);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public void IsMatch_NumericRangeAtStart_ReturnsTrue()
    {
        // Arrange
        var rule = CreateRule("US", "20010-21000", PostcodeMatchType.NumericRange);

        // Act
        var result = _matcher.IsMatch("20010", rule);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public void IsMatch_NumericRangeAtEnd_ReturnsTrue()
    {
        // Arrange
        var rule = CreateRule("US", "20010-21000", PostcodeMatchType.NumericRange);

        // Act
        var result = _matcher.IsMatch("21000", rule);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public void IsMatch_NumericRangeWithZipPlus4_ReturnsTrue()
    {
        // Arrange - US ZIP+4 format: 90210-1234
        var rule = CreateRule("US", "90000-91000", PostcodeMatchType.NumericRange);

        // Act - Should extract leading digits (90210)
        var result = _matcher.IsMatch("90210-1234", rule);

        // Assert
        result.ShouldBeTrue();
    }

    #endregion

    #region Exact Match Tests

    [Fact]
    public void IsMatch_ExactMatch_ReturnsTrue()
    {
        // Arrange
        var rule = CreateRule("GB", "IM1 1AA", PostcodeMatchType.Exact);

        // Act
        var result = _matcher.IsMatch("IM1 1AA", rule);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public void IsMatch_ExactMatchNormalized_ReturnsTrue()
    {
        // Arrange - Pattern with space
        var rule = CreateRule("GB", "IM1 1AA", PostcodeMatchType.Exact);

        // Act - Postcode without space
        var result = _matcher.IsMatch("IM11AA", rule);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public void IsMatch_ExactMatchCaseInsensitive_ReturnsTrue()
    {
        // Arrange
        var rule = CreateRule("GB", "IM1 1AA", PostcodeMatchType.Exact);

        // Act
        var result = _matcher.IsMatch("im1 1aa", rule);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public void IsMatch_ExactMatchDifferentPostcode_ReturnsFalse()
    {
        // Arrange
        var rule = CreateRule("GB", "IM1 1AA", PostcodeMatchType.Exact);

        // Act
        var result = _matcher.IsMatch("IM1 1AB", rule);

        // Assert
        result.ShouldBeFalse();
    }

    #endregion

    #region Edge Cases

    [Fact]
    public void IsMatch_NullPostcode_ReturnsFalse()
    {
        // Arrange
        var rule = CreateRule("GB", "IM", PostcodeMatchType.Prefix);

        // Act
        var result = _matcher.IsMatch(null!, rule);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public void IsMatch_EmptyPostcode_ReturnsFalse()
    {
        // Arrange
        var rule = CreateRule("GB", "IM", PostcodeMatchType.Prefix);

        // Act
        var result = _matcher.IsMatch("", rule);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public void IsMatch_WhitespacePostcode_ReturnsFalse()
    {
        // Arrange
        var rule = CreateRule("GB", "IM", PostcodeMatchType.Prefix);

        // Act
        var result = _matcher.IsMatch("   ", rule);

        // Assert
        result.ShouldBeFalse();
    }

    #endregion

    #region EvaluateRules Tests

    [Fact]
    public void EvaluateRules_NoPostcode_ReturnsNoMatch()
    {
        // Arrange
        var rules = new[]
        {
            CreateRule("GB", "IM", PostcodeMatchType.Prefix, PostcodeRuleAction.Block)
        };

        // Act
        var result = _matcher.EvaluateRules(null, "GB", rules);

        // Assert
        result.IsBlocked.ShouldBeFalse();
        result.Surcharge.ShouldBe(0m);
        result.MatchedRule.ShouldBeNull();
    }

    [Fact]
    public void EvaluateRules_EmptyRules_ReturnsNoMatch()
    {
        // Arrange
        var rules = Array.Empty<ShippingPostcodeRuleSnapshot>();

        // Act
        var result = _matcher.EvaluateRules("IM1 1AA", "GB", rules);

        // Assert
        result.IsBlocked.ShouldBeFalse();
        result.Surcharge.ShouldBe(0m);
        result.MatchedRule.ShouldBeNull();
    }

    [Fact]
    public void EvaluateRules_WrongCountry_ReturnsNoMatch()
    {
        // Arrange - GB rule but US postcode
        var rules = new[]
        {
            CreateRule("GB", "IM", PostcodeMatchType.Prefix, PostcodeRuleAction.Block)
        };

        // Act
        var result = _matcher.EvaluateRules("IM1 1AA", "US", rules);

        // Assert
        result.IsBlocked.ShouldBeFalse();
        result.Surcharge.ShouldBe(0m);
        result.MatchedRule.ShouldBeNull();
    }

    [Fact]
    public void EvaluateRules_BlockRule_ReturnsBlocked()
    {
        // Arrange
        var rules = new[]
        {
            CreateRule("GB", "IM", PostcodeMatchType.Prefix, PostcodeRuleAction.Block)
        };

        // Act
        var result = _matcher.EvaluateRules("IM1 1AA", "GB", rules);

        // Assert
        result.IsBlocked.ShouldBeTrue();
        result.Surcharge.ShouldBe(0m);
        result.MatchedRule.ShouldNotBeNull();
        result.MatchedRule!.Action.ShouldBe(PostcodeRuleAction.Block);
    }

    [Fact]
    public void EvaluateRules_SurchargeRule_ReturnsSurcharge()
    {
        // Arrange
        var rules = new[]
        {
            CreateRule("GB", "IM", PostcodeMatchType.Prefix, PostcodeRuleAction.Surcharge, 15.00m)
        };

        // Act
        var result = _matcher.EvaluateRules("IM1 1AA", "GB", rules);

        // Assert
        result.IsBlocked.ShouldBeFalse();
        result.Surcharge.ShouldBe(15.00m);
        result.MatchedRule.ShouldNotBeNull();
        result.MatchedRule!.Action.ShouldBe(PostcodeRuleAction.Surcharge);
    }

    [Fact]
    public void EvaluateRules_ExactBeatsPrefixSpecificity()
    {
        // Arrange - Two rules: prefix with £5, exact with £10
        var rules = new[]
        {
            CreateRule("GB", "IM", PostcodeMatchType.Prefix, PostcodeRuleAction.Surcharge, 5.00m),
            CreateRule("GB", "IM1 1AA", PostcodeMatchType.Exact, PostcodeRuleAction.Surcharge, 10.00m)
        };

        // Act
        var result = _matcher.EvaluateRules("IM1 1AA", "GB", rules);

        // Assert - Exact match wins
        result.Surcharge.ShouldBe(10.00m);
        result.MatchedRule!.MatchType.ShouldBe(PostcodeMatchType.Exact);
    }

    [Fact]
    public void EvaluateRules_LongerPrefixWins()
    {
        // Arrange - Two prefix rules: "IM" with £5, "IM1" with £8
        var rules = new[]
        {
            CreateRule("GB", "IM", PostcodeMatchType.Prefix, PostcodeRuleAction.Surcharge, 5.00m),
            CreateRule("GB", "IM1", PostcodeMatchType.Prefix, PostcodeRuleAction.Surcharge, 8.00m)
        };

        // Act
        var result = _matcher.EvaluateRules("IM1 1AA", "GB", rules);

        // Assert - Longer prefix wins
        result.Surcharge.ShouldBe(8.00m);
        result.MatchedRule!.Pattern.ShouldBe("IM1");
    }

    [Fact]
    public void EvaluateRules_RangeBeatsPrefix()
    {
        // Arrange
        var rules = new[]
        {
            CreateRule("GB", "IV", PostcodeMatchType.Prefix, PostcodeRuleAction.Surcharge, 5.00m),
            CreateRule("GB", "IV21-IV28", PostcodeMatchType.OutcodeRange, PostcodeRuleAction.Surcharge, 12.00m)
        };

        // Act
        var result = _matcher.EvaluateRules("IV25 1AB", "GB", rules);

        // Assert - Range is more specific (50) than prefix (10 + 2 = 12)
        result.Surcharge.ShouldBe(12.00m);
        result.MatchedRule!.MatchType.ShouldBe(PostcodeMatchType.OutcodeRange);
    }

    [Fact]
    public void EvaluateRules_BlockAtSameSpecificity_WinsOverSurcharge()
    {
        // Arrange - Same specificity level, but Block should win
        var rules = new[]
        {
            CreateRule("GB", "IM1", PostcodeMatchType.Prefix, PostcodeRuleAction.Surcharge, 5.00m),
            CreateRule("GB", "IM2", PostcodeMatchType.Prefix, PostcodeRuleAction.Block)
        };

        // Act - For IM1, only surcharge rule matches
        var result1 = _matcher.EvaluateRules("IM1 1AA", "GB", rules);
        result1.IsBlocked.ShouldBeFalse();
        result1.Surcharge.ShouldBe(5.00m);

        // Act - For IM2, block rule matches
        var result2 = _matcher.EvaluateRules("IM2 1AA", "GB", rules);
        result2.IsBlocked.ShouldBeTrue();
    }

    [Fact]
    public void EvaluateRules_MultipleMatchingRules_MostSpecificWins()
    {
        // Arrange - Complex scenario with multiple overlapping rules
        var rules = new[]
        {
            // General Scottish Highlands surcharge
            CreateRule("GB", "IV", PostcodeMatchType.Prefix, PostcodeRuleAction.Surcharge, 10.00m),
            // Specific range for remote areas - higher surcharge
            CreateRule("GB", "IV21-IV28", PostcodeMatchType.OutcodeRange, PostcodeRuleAction.Surcharge, 20.00m),
            // Very specific location - blocked entirely
            CreateRule("GB", "IV27 4AA", PostcodeMatchType.Exact, PostcodeRuleAction.Block)
        };

        // IV10 - only prefix matches
        var result1 = _matcher.EvaluateRules("IV10 1AA", "GB", rules);
        result1.Surcharge.ShouldBe(10.00m);

        // IV25 - range matches (more specific than prefix)
        var result2 = _matcher.EvaluateRules("IV25 1AB", "GB", rules);
        result2.Surcharge.ShouldBe(20.00m);

        // IV27 4AA - exact match blocks
        var result3 = _matcher.EvaluateRules("IV27 4AA", "GB", rules);
        result3.IsBlocked.ShouldBeTrue();
    }

    [Fact]
    public void EvaluateRules_CaseInsensitiveCountryCode()
    {
        // Arrange
        var rules = new[]
        {
            CreateRule("GB", "IM", PostcodeMatchType.Prefix, PostcodeRuleAction.Surcharge, 5.00m)
        };

        // Act - lowercase country code
        var result = _matcher.EvaluateRules("IM1 1AA", "gb", rules);

        // Assert
        result.Surcharge.ShouldBe(5.00m);
    }

    [Fact]
    public void EvaluateRules_NoMatchingRules_ReturnsNoMatch()
    {
        // Arrange
        var rules = new[]
        {
            CreateRule("GB", "IM", PostcodeMatchType.Prefix, PostcodeRuleAction.Block),
            CreateRule("GB", "HS", PostcodeMatchType.Prefix, PostcodeRuleAction.Block)
        };

        // Act - Postcode doesn't match any rule
        var result = _matcher.EvaluateRules("SW1A 1AA", "GB", rules);

        // Assert
        result.IsBlocked.ShouldBeFalse();
        result.Surcharge.ShouldBe(0m);
        result.MatchedRule.ShouldBeNull();
    }

    #endregion

    #region Real-World Scenario Tests

    [Fact]
    public void Scenario_ScottishIslandsBlocked()
    {
        // Arrange - Block delivery to remote Scottish islands
        var rules = new[]
        {
            CreateRule("GB", "HS", PostcodeMatchType.Prefix, PostcodeRuleAction.Block),   // Outer Hebrides
            CreateRule("GB", "ZE", PostcodeMatchType.Prefix, PostcodeRuleAction.Block),   // Shetland
            CreateRule("GB", "KW", PostcodeMatchType.Prefix, PostcodeRuleAction.Block),   // Orkney/Far North
            CreateRule("GB", "PA20-PA80", PostcodeMatchType.OutcodeRange, PostcodeRuleAction.Block), // Scottish islands
        };

        // Assert - All blocked
        _matcher.EvaluateRules("HS1 1AA", "GB", rules).IsBlocked.ShouldBeTrue();
        _matcher.EvaluateRules("ZE1 0AA", "GB", rules).IsBlocked.ShouldBeTrue();
        _matcher.EvaluateRules("KW1 4AA", "GB", rules).IsBlocked.ShouldBeTrue();
        _matcher.EvaluateRules("PA34 4AA", "GB", rules).IsBlocked.ShouldBeTrue();

        // Assert - Mainland not blocked
        _matcher.EvaluateRules("EH1 1AA", "GB", rules).IsBlocked.ShouldBeFalse();  // Edinburgh
        _matcher.EvaluateRules("G1 1AA", "GB", rules).IsBlocked.ShouldBeFalse();   // Glasgow
        _matcher.EvaluateRules("PA1 1AA", "GB", rules).IsBlocked.ShouldBeFalse();  // Paisley (PA1-PA19)
    }

    [Fact]
    public void Scenario_NorthernIrelandSurcharge()
    {
        // Arrange - Northern Ireland surcharge
        var rules = new[]
        {
            CreateRule("GB", "BT", PostcodeMatchType.Prefix, PostcodeRuleAction.Surcharge, 12.50m)
        };

        // Act
        var result = _matcher.EvaluateRules("BT1 5AA", "GB", rules);

        // Assert
        result.IsBlocked.ShouldBeFalse();
        result.Surcharge.ShouldBe(12.50m);
    }

    [Fact]
    public void Scenario_IsleOfManSurcharge()
    {
        // Arrange - Isle of Man surcharge
        var rules = new[]
        {
            CreateRule("GB", "IM", PostcodeMatchType.Prefix, PostcodeRuleAction.Surcharge, 15.00m)
        };

        // Act
        var result = _matcher.EvaluateRules("IM1 3LY", "GB", rules);

        // Assert
        result.Surcharge.ShouldBe(15.00m);
    }

    [Fact]
    public void Scenario_USRemoteAlaskaSurcharge()
    {
        // Arrange - Alaska (996xx-997xx) surcharge
        var rules = new[]
        {
            CreateRule("US", "99600-99799", PostcodeMatchType.NumericRange, PostcodeRuleAction.Surcharge, 25.00m)
        };

        // Act - Alaska zip
        var result = _matcher.EvaluateRules("99701", "US", rules);

        // Assert
        result.Surcharge.ShouldBe(25.00m);

        // Act - Regular US zip
        var result2 = _matcher.EvaluateRules("90210", "US", rules);

        // Assert - No surcharge
        result2.Surcharge.ShouldBe(0m);
    }

    [Fact]
    public void Scenario_HighlandsWithExemption()
    {
        // Arrange - Highlands surcharge but Inverness exempt
        var rules = new[]
        {
            CreateRule("GB", "IV", PostcodeMatchType.Prefix, PostcodeRuleAction.Surcharge, 8.00m),      // All Highlands
            CreateRule("GB", "IV1-IV3", PostcodeMatchType.OutcodeRange, PostcodeRuleAction.Surcharge, 0m) // Inverness area - no surcharge
        };

        // Act - Remote Highlands
        var result1 = _matcher.EvaluateRules("IV21 1AB", "GB", rules);
        result1.Surcharge.ShouldBe(8.00m);

        // Act - Inverness (exempt)
        var result2 = _matcher.EvaluateRules("IV2 4AA", "GB", rules);
        result2.Surcharge.ShouldBe(0m);
    }

    #endregion

    #region International Postcode Tests

    [Theory]
    [InlineData("IT", "00", "00185", true)]      // Italy - Rome (CAP starts with 00)
    [InlineData("IT", "20", "20121", true)]      // Italy - Milan
    [InlineData("IT", "00", "20121", false)]     // Italy - Milan doesn't match Rome prefix
    [InlineData("DE", "10", "10115", true)]      // Germany - Berlin (PLZ)
    [InlineData("DE", "80", "80331", true)]      // Germany - Munich
    [InlineData("IN", "110", "110001", true)]    // India - Delhi (PIN)
    [InlineData("IN", "400", "400001", true)]    // India - Mumbai
    [InlineData("DK", "1", "1000", true)]        // Denmark - Copenhagen
    [InlineData("DK", "8", "8000", true)]        // Denmark - Aarhus
    [InlineData("AU", "2", "2000", true)]        // Australia - Sydney (NSW)
    [InlineData("AU", "3", "3000", true)]        // Australia - Melbourne (VIC)
    [InlineData("AU", "2", "3000", false)]       // Australia - Melbourne doesn't match NSW prefix
    public void IsMatch_InternationalPrefix_MatchesCorrectly(string country, string pattern, string postcode, bool expected)
    {
        // Arrange
        var rule = CreateRule(country, pattern, PostcodeMatchType.Prefix);

        // Act
        var result = _matcher.IsMatch(postcode, rule);

        // Assert
        result.ShouldBe(expected);
    }

    [Theory]
    [InlineData("IT", "00100-00199", "00185", true)]       // Italy - Central Rome
    [InlineData("IT", "00100-00199", "00200", false)]      // Italy - Outside range
    [InlineData("DE", "10000-10999", "10115", true)]       // Germany - Berlin
    [InlineData("DE", "80000-80999", "80331", true)]       // Germany - Munich
    [InlineData("IN", "110000-110099", "110001", true)]    // India - Delhi central
    [InlineData("IN", "400000-400099", "400001", true)]    // India - Mumbai central
    [InlineData("DK", "1000-1499", "1000", true)]          // Denmark - Copenhagen K
    [InlineData("DK", "1000-1499", "1500", false)]         // Denmark - Outside range
    [InlineData("AU", "2000-2999", "2000", true)]          // Australia - Sydney metro
    [InlineData("AU", "2000-2999", "3000", false)]         // Australia - Melbourne (outside)
    public void IsMatch_InternationalNumericRange_MatchesCorrectly(string country, string pattern, string postcode, bool expected)
    {
        // Arrange
        var rule = CreateRule(country, pattern, PostcodeMatchType.NumericRange);

        // Act
        var result = _matcher.IsMatch(postcode, rule);

        // Assert
        result.ShouldBe(expected);
    }

    [Fact]
    public void Scenario_ItalyRemoteIslandsSurcharge()
    {
        // Arrange - Surcharge for Sardinia and Sicily
        var rules = new[]
        {
            CreateRule("IT", "07", PostcodeMatchType.Prefix, PostcodeRuleAction.Surcharge, 15.00m),  // Sardinia (07xxx)
            CreateRule("IT", "09", PostcodeMatchType.Prefix, PostcodeRuleAction.Surcharge, 15.00m),  // Sardinia (09xxx)
            CreateRule("IT", "90", PostcodeMatchType.Prefix, PostcodeRuleAction.Surcharge, 12.00m),  // Sicily (90xxx-98xxx)
            CreateRule("IT", "91", PostcodeMatchType.Prefix, PostcodeRuleAction.Surcharge, 12.00m),
            CreateRule("IT", "92", PostcodeMatchType.Prefix, PostcodeRuleAction.Surcharge, 12.00m),
            CreateRule("IT", "93", PostcodeMatchType.Prefix, PostcodeRuleAction.Surcharge, 12.00m),
            CreateRule("IT", "94", PostcodeMatchType.Prefix, PostcodeRuleAction.Surcharge, 12.00m),
            CreateRule("IT", "95", PostcodeMatchType.Prefix, PostcodeRuleAction.Surcharge, 12.00m),
            CreateRule("IT", "96", PostcodeMatchType.Prefix, PostcodeRuleAction.Surcharge, 12.00m),
            CreateRule("IT", "97", PostcodeMatchType.Prefix, PostcodeRuleAction.Surcharge, 12.00m),
            CreateRule("IT", "98", PostcodeMatchType.Prefix, PostcodeRuleAction.Surcharge, 12.00m),
        };

        // Sardinia
        var result1 = _matcher.EvaluateRules("07100", "IT", rules);
        result1.Surcharge.ShouldBe(15.00m);

        // Sicily
        var result2 = _matcher.EvaluateRules("90100", "IT", rules);
        result2.Surcharge.ShouldBe(12.00m);

        // Mainland Italy - no surcharge
        var result3 = _matcher.EvaluateRules("00185", "IT", rules);
        result3.Surcharge.ShouldBe(0m);
    }

    [Fact]
    public void Scenario_GermanyRemoteAreasBlocked()
    {
        // Arrange - Block delivery to Helgoland (island)
        var rules = new[]
        {
            CreateRule("DE", "27498", PostcodeMatchType.Exact, PostcodeRuleAction.Block),  // Helgoland
        };

        // Helgoland blocked
        var result1 = _matcher.EvaluateRules("27498", "DE", rules);
        result1.IsBlocked.ShouldBeTrue();

        // Nearby mainland OK
        var result2 = _matcher.EvaluateRules("27472", "DE", rules);
        result2.IsBlocked.ShouldBeFalse();
    }

    [Fact]
    public void Scenario_AustraliaRemoteOutbackSurcharge()
    {
        // Arrange - Surcharge for remote NT postcodes
        var rules = new[]
        {
            CreateRule("AU", "0800-0899", PostcodeMatchType.NumericRange, PostcodeRuleAction.Surcharge, 35.00m),  // NT remote
        };

        // Darwin area (remote)
        var result1 = _matcher.EvaluateRules("0800", "AU", rules);
        result1.Surcharge.ShouldBe(35.00m);

        // Sydney (not remote)
        var result2 = _matcher.EvaluateRules("2000", "AU", rules);
        result2.Surcharge.ShouldBe(0m);
    }

    [Fact]
    public void Scenario_IndiaMetroCitiesFreeShipping()
    {
        // Arrange - Use surcharge of 0 to indicate "included" metros, higher for remote
        var rules = new[]
        {
            // Remote areas get surcharge
            CreateRule("IN", "7", PostcodeMatchType.Prefix, PostcodeRuleAction.Surcharge, 50.00m),  // Northeast states
            CreateRule("IN", "79", PostcodeMatchType.Prefix, PostcodeRuleAction.Surcharge, 75.00m), // More remote northeast
        };

        // Northeast India (surcharge)
        var result1 = _matcher.EvaluateRules("700001", "IN", rules);
        result1.Surcharge.ShouldBe(50.00m);

        // More remote northeast (higher surcharge due to longer prefix = more specific)
        var result2 = _matcher.EvaluateRules("790001", "IN", rules);
        result2.Surcharge.ShouldBe(75.00m);

        // Mumbai (no rules match, no surcharge)
        var result3 = _matcher.EvaluateRules("400001", "IN", rules);
        result3.Surcharge.ShouldBe(0m);
    }

    #endregion
}

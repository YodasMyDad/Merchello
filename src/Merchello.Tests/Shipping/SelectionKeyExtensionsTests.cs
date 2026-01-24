using Merchello.Core.Shipping.Extensions;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Shipping;

/// <summary>
/// Unit tests for SelectionKeyExtensions parsing logic.
/// Tests the unified selection key format for flat-rate and dynamic providers.
/// </summary>
public class SelectionKeyExtensionsTests
{
    #region TryParse Tests - Flat Rate Format (so:guid)

    [Fact]
    public void TryParse_ShippingOptionFormat_ParsesCorrectly()
    {
        // Arrange
        var expectedId = Guid.NewGuid();
        var key = $"so:{expectedId}";

        // Act
        var result = SelectionKeyExtensions.TryParse(key, out var shippingOptionId, out var providerKey, out var serviceCode);

        // Assert
        result.ShouldBeTrue();
        shippingOptionId.ShouldBe(expectedId);
        providerKey.ShouldBeNull();
        serviceCode.ShouldBeNull();
    }

    [Fact]
    public void TryParse_ShippingOptionFormat_InvalidGuid_ReturnsFalse()
    {
        // Arrange
        var key = "so:not-a-guid";

        // Act
        var result = SelectionKeyExtensions.TryParse(key, out var shippingOptionId, out var providerKey, out var serviceCode);

        // Assert
        result.ShouldBeFalse();
        shippingOptionId.ShouldBeNull();
        providerKey.ShouldBeNull();
        serviceCode.ShouldBeNull();
    }

    [Fact]
    public void TryParse_ShippingOptionFormat_EmptyGuid_ParsesCorrectly()
    {
        // Arrange
        var key = $"so:{Guid.Empty}";

        // Act
        var result = SelectionKeyExtensions.TryParse(key, out var shippingOptionId, out var providerKey, out var serviceCode);

        // Assert
        result.ShouldBeTrue();
        shippingOptionId.ShouldBe(Guid.Empty);
    }

    #endregion

    #region TryParse Tests - Dynamic Provider Format (dyn:provider:serviceCode)

    [Fact]
    public void TryParse_DynamicFormat_FedEx_ParsesCorrectly()
    {
        // Arrange
        var key = "dyn:fedex:FEDEX_GROUND";

        // Act
        var result = SelectionKeyExtensions.TryParse(key, out var shippingOptionId, out var providerKey, out var serviceCode);

        // Assert
        result.ShouldBeTrue();
        shippingOptionId.ShouldBeNull();
        providerKey.ShouldBe("fedex");
        serviceCode.ShouldBe("FEDEX_GROUND");
    }

    [Fact]
    public void TryParse_DynamicFormat_UPS_ParsesCorrectly()
    {
        // Arrange
        var key = "dyn:ups:03";

        // Act
        var result = SelectionKeyExtensions.TryParse(key, out var shippingOptionId, out var providerKey, out var serviceCode);

        // Assert
        result.ShouldBeTrue();
        shippingOptionId.ShouldBeNull();
        providerKey.ShouldBe("ups");
        serviceCode.ShouldBe("03");
    }

    [Fact]
    public void TryParse_DynamicFormat_ServiceCodeWithColons_ParsesCorrectly()
    {
        // Arrange - Service codes might contain colons in some systems
        var key = "dyn:carrier:SERVICE:TYPE:VARIANT";

        // Act
        var result = SelectionKeyExtensions.TryParse(key, out var shippingOptionId, out var providerKey, out var serviceCode);

        // Assert
        result.ShouldBeTrue();
        providerKey.ShouldBe("carrier");
        serviceCode.ShouldBe("SERVICE:TYPE:VARIANT"); // Everything after first colon
    }

    [Fact]
    public void TryParse_DynamicFormat_MissingServiceCode_ReturnsFalse()
    {
        // Arrange
        var key = "dyn:fedex:";

        // Act
        var result = SelectionKeyExtensions.TryParse(key, out var shippingOptionId, out var providerKey, out var serviceCode);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public void TryParse_DynamicFormat_MissingProvider_ReturnsFalse()
    {
        // Arrange
        var key = "dyn::FEDEX_GROUND";

        // Act
        var result = SelectionKeyExtensions.TryParse(key, out var shippingOptionId, out var providerKey, out var serviceCode);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public void TryParse_DynamicFormat_NoColon_ReturnsFalse()
    {
        // Arrange
        var key = "dyn:fedexonly";

        // Act
        var result = SelectionKeyExtensions.TryParse(key, out var shippingOptionId, out var providerKey, out var serviceCode);

        // Assert
        result.ShouldBeFalse();
    }

    #endregion

    #region TryParse Tests - Legacy Format (plain Guid)

    [Fact]
    public void TryParse_LegacyGuidFormat_ParsesCorrectly()
    {
        // Arrange
        var expectedId = Guid.NewGuid();
        var key = expectedId.ToString();

        // Act
        var result = SelectionKeyExtensions.TryParse(key, out var shippingOptionId, out var providerKey, out var serviceCode);

        // Assert
        result.ShouldBeTrue();
        shippingOptionId.ShouldBe(expectedId);
        providerKey.ShouldBeNull();
        serviceCode.ShouldBeNull();
    }

    [Fact]
    public void TryParse_LegacyGuidFormat_DifferentCasing_ParsesCorrectly()
    {
        // Arrange
        var expectedId = Guid.Parse("A1B2C3D4-E5F6-7890-ABCD-EF1234567890");
        var key = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"; // lowercase

        // Act
        var result = SelectionKeyExtensions.TryParse(key, out var shippingOptionId, out var providerKey, out var serviceCode);

        // Assert
        result.ShouldBeTrue();
        shippingOptionId.ShouldBe(expectedId);
    }

    #endregion

    #region TryParse Tests - Invalid Inputs

    [Fact]
    public void TryParse_NullKey_ReturnsFalse()
    {
        // Act
        var result = SelectionKeyExtensions.TryParse(null, out var shippingOptionId, out var providerKey, out var serviceCode);

        // Assert
        result.ShouldBeFalse();
        shippingOptionId.ShouldBeNull();
        providerKey.ShouldBeNull();
        serviceCode.ShouldBeNull();
    }

    [Fact]
    public void TryParse_EmptyKey_ReturnsFalse()
    {
        // Act
        var result = SelectionKeyExtensions.TryParse("", out var shippingOptionId, out var providerKey, out var serviceCode);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public void TryParse_WhitespaceKey_ReturnsFalse()
    {
        // Act
        var result = SelectionKeyExtensions.TryParse("   ", out var shippingOptionId, out var providerKey, out var serviceCode);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public void TryParse_RandomString_ReturnsFalse()
    {
        // Act
        var result = SelectionKeyExtensions.TryParse("random-string", out var shippingOptionId, out var providerKey, out var serviceCode);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public void TryParse_UnknownPrefix_ReturnsFalse()
    {
        // Arrange
        var key = "unknown:some-value";

        // Act
        var result = SelectionKeyExtensions.TryParse(key, out var shippingOptionId, out var providerKey, out var serviceCode);

        // Assert
        result.ShouldBeFalse();
    }

    #endregion

    #region IsDynamicProvider Tests

    [Fact]
    public void IsDynamicProvider_DynamicKey_ReturnsTrue()
    {
        // Arrange
        var key = "dyn:fedex:FEDEX_GROUND";

        // Act
        var result = SelectionKeyExtensions.IsDynamicProvider(key);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public void IsDynamicProvider_ShippingOptionKey_ReturnsFalse()
    {
        // Arrange
        var key = $"so:{Guid.NewGuid()}";

        // Act
        var result = SelectionKeyExtensions.IsDynamicProvider(key);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public void IsDynamicProvider_LegacyGuidKey_ReturnsFalse()
    {
        // Arrange
        var key = Guid.NewGuid().ToString();

        // Act
        var result = SelectionKeyExtensions.IsDynamicProvider(key);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public void IsDynamicProvider_NullKey_ReturnsFalse()
    {
        // Act
        var result = SelectionKeyExtensions.IsDynamicProvider(null);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public void IsDynamicProvider_CaseSensitive_ReturnsCorrectResult()
    {
        // The prefix is case-sensitive per StringComparison.Ordinal
        SelectionKeyExtensions.IsDynamicProvider("dyn:fedex:GROUND").ShouldBeTrue();
        SelectionKeyExtensions.IsDynamicProvider("DYN:fedex:GROUND").ShouldBeFalse();
        SelectionKeyExtensions.IsDynamicProvider("Dyn:fedex:GROUND").ShouldBeFalse();
    }

    #endregion

    #region IsShippingOption Tests

    [Fact]
    public void IsShippingOption_ShippingOptionKey_ReturnsTrue()
    {
        // Arrange
        var key = $"so:{Guid.NewGuid()}";

        // Act
        var result = SelectionKeyExtensions.IsShippingOption(key);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public void IsShippingOption_LegacyGuidKey_ReturnsTrue()
    {
        // Arrange - Legacy format should be treated as ShippingOption
        var key = Guid.NewGuid().ToString();

        // Act
        var result = SelectionKeyExtensions.IsShippingOption(key);

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public void IsShippingOption_DynamicKey_ReturnsFalse()
    {
        // Arrange
        var key = "dyn:fedex:FEDEX_GROUND";

        // Act
        var result = SelectionKeyExtensions.IsShippingOption(key);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public void IsShippingOption_NullKey_ReturnsFalse()
    {
        // Act
        var result = SelectionKeyExtensions.IsShippingOption(null);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public void IsShippingOption_InvalidString_ReturnsFalse()
    {
        // Arrange - Not a valid Guid and not a valid prefix
        var key = "not-a-guid";

        // Act
        var result = SelectionKeyExtensions.IsShippingOption(key);

        // Assert
        result.ShouldBeFalse();
    }

    #endregion

    #region ForShippingOption Tests

    [Fact]
    public void ForShippingOption_CreatesCorrectFormat()
    {
        // Arrange
        var id = Guid.NewGuid();

        // Act
        var key = SelectionKeyExtensions.ForShippingOption(id);

        // Assert
        key.ShouldBe($"so:{id}");
    }

    [Fact]
    public void ForShippingOption_RoundTrip_ParsesBackCorrectly()
    {
        // Arrange
        var originalId = Guid.NewGuid();

        // Act
        var key = SelectionKeyExtensions.ForShippingOption(originalId);
        var parsed = SelectionKeyExtensions.TryParse(key, out var parsedId, out var provider, out var service);

        // Assert
        parsed.ShouldBeTrue();
        parsedId.ShouldBe(originalId);
        provider.ShouldBeNull();
        service.ShouldBeNull();
    }

    #endregion

    #region ForDynamicProvider Tests

    [Fact]
    public void ForDynamicProvider_CreatesCorrectFormat()
    {
        // Arrange
        var providerKey = "fedex";
        var serviceCode = "FEDEX_GROUND";

        // Act
        var key = SelectionKeyExtensions.ForDynamicProvider(providerKey, serviceCode);

        // Assert
        key.ShouldBe("dyn:fedex:FEDEX_GROUND");
    }

    [Fact]
    public void ForDynamicProvider_RoundTrip_ParsesBackCorrectly()
    {
        // Arrange
        var originalProvider = "ups";
        var originalService = "03";

        // Act
        var key = SelectionKeyExtensions.ForDynamicProvider(originalProvider, originalService);
        var parsed = SelectionKeyExtensions.TryParse(key, out var id, out var provider, out var service);

        // Assert
        parsed.ShouldBeTrue();
        id.ShouldBeNull();
        provider.ShouldBe(originalProvider);
        service.ShouldBe(originalService);
    }

    [Fact]
    public void ForDynamicProvider_WithColonsInServiceCode_RoundTrips()
    {
        // Arrange
        var providerKey = "custom";
        var serviceCode = "SERVICE:WITH:COLONS";

        // Act
        var key = SelectionKeyExtensions.ForDynamicProvider(providerKey, serviceCode);
        var parsed = SelectionKeyExtensions.TryParse(key, out var id, out var provider, out var service);

        // Assert
        parsed.ShouldBeTrue();
        provider.ShouldBe(providerKey);
        service.ShouldBe(serviceCode);
    }

    #endregion

    #region Edge Cases and Real-World Scenarios

    [Fact]
    public void TryParse_FedExServiceCodes_AllParseCorrectly()
    {
        // Real FedEx service codes
        var fedexServices = new[]
        {
            "FEDEX_GROUND",
            "FEDEX_HOME_DELIVERY",
            "FEDEX_2_DAY",
            "FEDEX_EXPRESS_SAVER",
            "PRIORITY_OVERNIGHT",
            "STANDARD_OVERNIGHT",
            "FIRST_OVERNIGHT",
            "INTERNATIONAL_ECONOMY",
            "INTERNATIONAL_PRIORITY"
        };

        foreach (var service in fedexServices)
        {
            var key = $"dyn:fedex:{service}";
            var result = SelectionKeyExtensions.TryParse(key, out _, out var provider, out var serviceCode);

            result.ShouldBeTrue($"Failed to parse FedEx service: {service}");
            provider.ShouldBe("fedex");
            serviceCode.ShouldBe(service);
        }
    }

    [Fact]
    public void TryParse_UPSServiceCodes_AllParseCorrectly()
    {
        // Real UPS service codes
        var upsServices = new[]
        {
            "01", // UPS Next Day Air
            "02", // UPS 2nd Day Air
            "03", // UPS Ground
            "12", // UPS 3 Day Select
            "13", // UPS Next Day Air Saver
            "14", // UPS Next Day Air Early
            "59", // UPS 2nd Day Air A.M.
            "65", // UPS Worldwide Saver
        };

        foreach (var service in upsServices)
        {
            var key = $"dyn:ups:{service}";
            var result = SelectionKeyExtensions.TryParse(key, out _, out var provider, out var serviceCode);

            result.ShouldBeTrue($"Failed to parse UPS service: {service}");
            provider.ShouldBe("ups");
            serviceCode.ShouldBe(service);
        }
    }

    [Fact]
    public void TryParse_MixedKeyTypes_CorrectlyIdentifies()
    {
        // A list of different key types
        var testCases = new (string key, bool expectedIsDynamic, bool expectedIsShippingOption)[]
        {
            ("dyn:fedex:GROUND", true, false),
            ("dyn:ups:03", true, false),
            ($"so:{Guid.NewGuid()}", false, true),
            (Guid.NewGuid().ToString(), false, true),
        };

        foreach (var (key, expectedIsDynamic, expectedIsShippingOption) in testCases)
        {
            SelectionKeyExtensions.IsDynamicProvider(key).ShouldBe(expectedIsDynamic, $"IsDynamicProvider failed for: {key}");
            SelectionKeyExtensions.IsShippingOption(key).ShouldBe(expectedIsShippingOption, $"IsShippingOption failed for: {key}");
        }
    }

    #endregion
}

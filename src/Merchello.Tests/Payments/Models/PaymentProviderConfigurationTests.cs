using Merchello.Core.Payments.Providers;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Payments.Models;

public class PaymentProviderConfigurationTests
{
    [Fact]
    public void GetValue_ExistingKey_ReturnsValue_CaseInsensitive()
    {
        // Arrange
        var json = """{"apiKey": "secret123", "MODE": "live"}""";
        var config = new PaymentProviderConfiguration(json);

        // Act & Assert - should be case insensitive
        config.GetValue("apiKey").ShouldBe("secret123");
        config.GetValue("APIKEY").ShouldBe("secret123");
        config.GetValue("ApiKey").ShouldBe("secret123");
        config.GetValue("mode").ShouldBe("live");
        config.GetValue("Mode").ShouldBe("live");
    }

    [Fact]
    public void Constructor_InvalidJson_ReturnsEmptyDictionary()
    {
        // Arrange - invalid JSON
        var invalidJson = "{ not valid json }}}";

        // Act
        var config = new PaymentProviderConfiguration(invalidJson);

        // Assert - should not throw and should return null for any key
        config.GetValue("anyKey").ShouldBeNull();
        config.HasKey("anyKey").ShouldBeFalse();
        config.GetAll().Count.ShouldBe(0);
    }

    [Fact]
    public void GetBool_ParsesCorrectly()
    {
        // Arrange
        var json = """{"enabled": "true", "disabled": "false", "invalid": "notabool"}""";
        var config = new PaymentProviderConfiguration(json);

        // Act & Assert
        config.GetBool("enabled").ShouldBeTrue();
        config.GetBool("disabled").ShouldBeFalse();
        config.GetBool("invalid", defaultValue: true).ShouldBeTrue(); // returns default for invalid
        config.GetBool("missing", defaultValue: false).ShouldBeFalse(); // returns default for missing
    }
}

using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Providers;
using Merchello.Core.Fulfilment.Providers.ShipBob;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shared.Providers;
using Microsoft.Extensions.Logging.Abstractions;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Fulfilment.Providers.ShipBob;

public class ShipBobFulfilmentProviderTests
{
    private readonly ShipBobFulfilmentProvider _provider;

    public ShipBobFulfilmentProviderTests()
    {
        _provider = new ShipBobFulfilmentProvider(NullLogger<ShipBobFulfilmentProvider>.Instance);
    }

    #region Metadata Tests

    [Fact]
    public void Metadata_HasCorrectKey()
    {
        _provider.Metadata.Key.ShouldBe("shipbob");
    }

    [Fact]
    public void Metadata_HasCorrectDisplayName()
    {
        _provider.Metadata.DisplayName.ShouldBe("ShipBob");
    }

    [Fact]
    public void Metadata_SupportsAllCapabilities()
    {
        var metadata = _provider.Metadata;

        metadata.SupportsOrderSubmission.ShouldBeTrue();
        metadata.SupportsOrderCancellation.ShouldBeTrue();
        metadata.SupportsWebhooks.ShouldBeTrue();
        metadata.SupportsPolling.ShouldBeTrue();
        metadata.SupportsProductSync.ShouldBeTrue();
        metadata.SupportsInventorySync.ShouldBeTrue();
    }

    [Fact]
    public void Metadata_HasRestApiStyle()
    {
        _provider.Metadata.ApiStyle.ShouldBe(FulfilmentApiStyle.Rest);
    }

    [Fact]
    public void Metadata_HasIconSvg()
    {
        _provider.Metadata.IconSvg.ShouldNotBeNullOrWhiteSpace();
        _provider.Metadata.IconSvg.ShouldContain("<svg");
    }

    [Fact]
    public void Metadata_HasDescription()
    {
        _provider.Metadata.Description.ShouldNotBeNullOrWhiteSpace();
    }

    [Fact]
    public void Metadata_HasSetupInstructions()
    {
        _provider.Metadata.SetupInstructions.ShouldNotBeNullOrWhiteSpace();
        _provider.Metadata.SetupInstructions.ShouldContain("ShipBob");
    }

    #endregion

    #region Configuration Field Tests

    [Fact]
    public async Task GetConfigurationFieldsAsync_ReturnsRequiredFields()
    {
        // Act
        var fields = (await _provider.GetConfigurationFieldsAsync()).ToList();

        // Assert
        fields.Count.ShouldBeGreaterThan(0);

        // Check for required fields
        var patField = fields.FirstOrDefault(f => f.Key == "PersonalAccessToken");
        patField.ShouldNotBeNull();
        patField.IsRequired.ShouldBeTrue();
        patField.IsSensitive.ShouldBeTrue();
        patField.FieldType.ShouldBe(ConfigurationFieldType.Password);

        var channelIdField = fields.FirstOrDefault(f => f.Key == "ChannelId");
        channelIdField.ShouldNotBeNull();
        channelIdField.IsRequired.ShouldBeTrue();
        channelIdField.FieldType.ShouldBe(ConfigurationFieldType.Number);
    }

    [Fact]
    public async Task GetConfigurationFieldsAsync_ReturnsOptionalFields()
    {
        // Act
        var fields = (await _provider.GetConfigurationFieldsAsync()).ToList();

        // Assert
        var webhookSecretField = fields.FirstOrDefault(f => f.Key == "WebhookSecret");
        webhookSecretField.ShouldNotBeNull();
        webhookSecretField.IsRequired.ShouldBeFalse();
        webhookSecretField.IsSensitive.ShouldBeTrue();

        var apiVersionField = fields.FirstOrDefault(f => f.Key == "ApiVersion");
        apiVersionField.ShouldNotBeNull();
        apiVersionField.IsRequired.ShouldBeFalse();
        apiVersionField.DefaultValue.ShouldBe("2025-07");

        var debugField = fields.FirstOrDefault(f => f.Key == "EnableDebugLogging");
        debugField.ShouldNotBeNull();
        debugField.FieldType.ShouldBe(ConfigurationFieldType.Checkbox);
    }

    #endregion

    #region Configuration Tests

    [Fact]
    public async Task ConfigureAsync_WithNullConfiguration_DoesNotThrow()
    {
        // Act & Assert
        await Should.NotThrowAsync(async () =>
            await _provider.ConfigureAsync(null));
    }

    [Fact]
    public async Task ConfigureAsync_WithEmptySettingsJson_DoesNotThrow()
    {
        // Arrange
        var config = new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "shipbob",
            SettingsJson = null
        };

        // Act & Assert
        await Should.NotThrowAsync(async () =>
            await _provider.ConfigureAsync(config));
    }

    [Fact]
    public async Task ConfigureAsync_WithValidSettings_ConfiguresSuccessfully()
    {
        // Arrange
        var settings = new ShipBobSettings
        {
            PersonalAccessToken = "pat_test_token",
            ChannelId = 12345
        };

        var config = new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "shipbob",
            SettingsJson = settings.ToJson()
        };

        // Act & Assert
        await Should.NotThrowAsync(async () =>
            await _provider.ConfigureAsync(config));
    }

    #endregion

    #region Unconfigured Provider Tests

    [Fact]
    public async Task TestConnectionAsync_WhenNotConfigured_ReturnsFailure()
    {
        // Act
        var result = await _provider.TestConnectionAsync();

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage!.ShouldContain("not configured");
    }

    [Fact]
    public async Task SubmitOrderAsync_WhenNotConfigured_ReturnsFailure()
    {
        // Arrange
        var request = CreateTestOrderRequest();

        // Act
        var result = await _provider.SubmitOrderAsync(request);

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage!.ShouldContain("not configured");
    }

    [Fact]
    public async Task CancelOrderAsync_WhenNotConfigured_ReturnsFailure()
    {
        // Act
        var result = await _provider.CancelOrderAsync("12345");

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage!.ShouldContain("not configured");
    }

    [Fact]
    public async Task PollOrderStatusAsync_WhenNotConfigured_ReturnsEmptyList()
    {
        // Act
        var result = await _provider.PollOrderStatusAsync(["12345"]);

        // Assert
        result.ShouldBeEmpty();
    }

    [Fact]
    public async Task SyncProductsAsync_WhenNotConfigured_ReturnsFailure()
    {
        // Arrange
        var products = new List<FulfilmentProduct>
        {
            new() { ProductId = Guid.NewGuid(), Sku = "TEST-SKU", Name = "Test Product" }
        };

        // Act
        var result = await _provider.SyncProductsAsync(products);

        // Assert
        result.Success.ShouldBeFalse();
        result.Errors.ShouldContain(e => e.Contains("not configured"));
    }

    [Fact]
    public async Task GetInventoryLevelsAsync_WhenNotConfigured_ReturnsEmptyList()
    {
        // Act
        var result = await _provider.GetInventoryLevelsAsync();

        // Assert
        result.ShouldBeEmpty();
    }

    #endregion

    #region Validation Tests

    [Fact]
    public async Task CancelOrderAsync_WithInvalidProviderReference_ReturnsFailure()
    {
        // Arrange - Configure with valid settings first
        var settings = new ShipBobSettings
        {
            PersonalAccessToken = "pat_test_token",
            ChannelId = 12345
        };

        await _provider.ConfigureAsync(new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "shipbob",
            SettingsJson = settings.ToJson()
        });

        // Act
        var result = await _provider.CancelOrderAsync("not_a_number");

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage!.ShouldContain("Invalid provider reference");
    }

    #endregion

    #region Settings Tests

    [Fact]
    public void ShipBobSettings_IsValid_RequiresTokenAndChannelId()
    {
        // Missing both
        new ShipBobSettings().IsValid.ShouldBeFalse();

        // Missing channel ID
        new ShipBobSettings { PersonalAccessToken = "pat_test" }.IsValid.ShouldBeFalse();

        // Missing token
        new ShipBobSettings { ChannelId = 123 }.IsValid.ShouldBeFalse();

        // Has both
        new ShipBobSettings { PersonalAccessToken = "pat_test", ChannelId = 123 }.IsValid.ShouldBeTrue();
    }

    [Fact]
    public void ShipBobSettings_HasCorrectDefaults()
    {
        var settings = new ShipBobSettings();

        settings.ApiBaseUrl.ShouldBe("https://api.shipbob.com");
        settings.ApiVersion.ShouldBe("2025-07");
        settings.TimeoutSeconds.ShouldBe(30);
        settings.EnableDebugLogging.ShouldBeFalse();
    }

    [Fact]
    public void ShipBobSettings_GetVersionedBaseUrl_ReturnsCorrectUrl()
    {
        var settings = new ShipBobSettings
        {
            ApiBaseUrl = "https://api.shipbob.com",
            ApiVersion = "2025-07"
        };

        settings.GetVersionedBaseUrl().ShouldBe("https://api.shipbob.com/2025-07");
    }

    [Fact]
    public void ShipBobSettings_GetVersionedBaseUrl_HandlesTrailingSlash()
    {
        var settings = new ShipBobSettings
        {
            ApiBaseUrl = "https://api.shipbob.com/",
            ApiVersion = "2025-07"
        };

        settings.GetVersionedBaseUrl().ShouldBe("https://api.shipbob.com/2025-07");
    }

    [Fact]
    public void ShipBobSettings_FromJson_ParsesCorrectly()
    {
        // Arrange
        var json = """
            {
                "personalAccessToken": "pat_test_123",
                "channelId": 12345,
                "webhookSecret": "whsec_test",
                "apiVersion": "2025-07",
                "enableDebugLogging": true
            }
            """;

        // Act
        var settings = ShipBobSettings.FromJson(json);

        // Assert
        settings.ShouldNotBeNull();
        settings.PersonalAccessToken.ShouldBe("pat_test_123");
        settings.ChannelId.ShouldBe(12345);
        settings.WebhookSecret.ShouldBe("whsec_test");
        settings.ApiVersion.ShouldBe("2025-07");
        settings.EnableDebugLogging.ShouldBeTrue();
    }

    [Fact]
    public void ShipBobSettings_FromJson_WithInvalidJson_ReturnsNull()
    {
        var settings = ShipBobSettings.FromJson("not valid json");
        settings.ShouldBeNull();
    }

    [Fact]
    public void ShipBobSettings_FromJson_WithNullOrEmpty_ReturnsNull()
    {
        ShipBobSettings.FromJson(null).ShouldBeNull();
        ShipBobSettings.FromJson("").ShouldBeNull();
        ShipBobSettings.FromJson("   ").ShouldBeNull();
    }

    [Fact]
    public void ShipBobSettings_ToJson_RoundTrips()
    {
        // Arrange
        var original = new ShipBobSettings
        {
            PersonalAccessToken = "pat_test",
            ChannelId = 999,
            WebhookSecret = "secret",
            DefaultFulfillmentCenterId = 1,
            EnableDebugLogging = true
        };

        // Act
        var json = original.ToJson();
        var parsed = ShipBobSettings.FromJson(json);

        // Assert
        parsed.ShouldNotBeNull();
        parsed.PersonalAccessToken.ShouldBe(original.PersonalAccessToken);
        parsed.ChannelId.ShouldBe(original.ChannelId);
        parsed.WebhookSecret.ShouldBe(original.WebhookSecret);
        parsed.DefaultFulfillmentCenterId.ShouldBe(original.DefaultFulfillmentCenterId);
        parsed.EnableDebugLogging.ShouldBe(original.EnableDebugLogging);
    }

    #endregion

    #region Dispose Tests

    [Fact]
    public void Dispose_CanBeCalledMultipleTimes()
    {
        // Act & Assert - Should not throw
        _provider.Dispose();
        _provider.Dispose();
    }

    #endregion

    #region Helper Methods

    private static FulfilmentOrderRequest CreateTestOrderRequest()
    {
        return new FulfilmentOrderRequest
        {
            OrderId = Guid.NewGuid(),
            OrderNumber = "TEST-001",
            CustomerEmail = "test@example.com",
            ShippingAddress = new FulfilmentAddress
            {
                Name = "Test Customer",
                Address1 = "123 Test Street",
                City = "Test City",
                StateOrProvince = "CA",
                PostalCode = "90210",
                CountryCode = "US"
            },
            LineItems =
            [
                new FulfilmentLineItem
                {
                    LineItemId = Guid.NewGuid(),
                    Sku = "TEST-SKU-001",
                    Name = "Test Product",
                    Quantity = 2,
                    UnitPrice = 29.99m
                }
            ]
        };
    }

    #endregion
}

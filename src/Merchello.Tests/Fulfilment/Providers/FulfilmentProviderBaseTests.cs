using Merchello.Core.Accounting.Models;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Providers;
using Microsoft.AspNetCore.Http;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Fulfilment.Providers;

/// <summary>
/// Unit tests for FulfilmentProviderBase default implementations.
/// Tests that the base class provides sensible defaults for optional methods.
/// </summary>
public class FulfilmentProviderBaseTests
{
    private readonly TestProviderWithMinimalOverrides _provider = new();

    #region Default Implementation Tests

    [Fact]
    public async Task GetConfigurationFieldsAsync_DefaultReturnsEmpty()
    {
        // Act
        var fields = await _provider.GetConfigurationFieldsAsync();

        // Assert
        fields.ShouldBeEmpty();
    }

    [Fact]
    public async Task ConfigureAsync_DefaultStoresConfiguration()
    {
        // Arrange
        var config = new FulfilmentProviderConfiguration
        {
            Id = Guid.NewGuid(),
            ProviderKey = "test",
            DisplayName = "Test",
            SettingsJson = """{"key":"value"}"""
        };

        // Act
        await _provider.ConfigureAsync(config);

        // Assert
        _provider.ExposedConfiguration.ShouldBe(config);
    }

    [Fact]
    public async Task ConfigureAsync_AllowsNullConfiguration()
    {
        // Arrange & Act
        await _provider.ConfigureAsync(null);

        // Assert
        _provider.ExposedConfiguration.ShouldBeNull();
    }

    [Fact]
    public async Task TestConnectionAsync_DefaultReturnsNotSupported()
    {
        // Act
        var result = await _provider.TestConnectionAsync();

        // Assert
        result.ShouldNotBeNull();
        result.Success.ShouldBeFalse();
        result.ErrorMessage!.ShouldContain("does not support");
    }

    [Fact]
    public async Task SubmitOrderAsync_WhenNotSupported_ReturnsFailed()
    {
        // Arrange
        var providerNotSupportingSubmission = new TestProviderNoSubmission();
        var request = CreateTestOrderRequest();

        // Act
        var result = await providerNotSupportingSubmission.SubmitOrderAsync(request);

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage!.ShouldContain("does not support order submission");
    }

    [Fact]
    public async Task SubmitOrderAsync_WhenSupportedButNotImplemented_ReturnsFailed()
    {
        // Arrange
        var request = CreateTestOrderRequest();

        // Act
        var result = await _provider.SubmitOrderAsync(request);

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage!.ShouldContain("has not implemented SubmitOrderAsync");
    }

    [Fact]
    public async Task CancelOrderAsync_DefaultReturnsNotSupported()
    {
        // Act
        var result = await _provider.CancelOrderAsync("TEST-REF-123");

        // Assert
        result.ShouldNotBeNull();
        result.Success.ShouldBeFalse();
        result.ErrorMessage!.ShouldContain("does not support");
    }

    [Fact]
    public async Task ValidateWebhookAsync_WhenWebhooksNotSupported_ReturnsFalse()
    {
        // Arrange
        var providerWithoutWebhooks = new TestProviderNoWebhooks();
        var request = CreateMockHttpRequest();

        // Act
        var result = await providerWithoutWebhooks.ValidateWebhookAsync(request);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public async Task ValidateWebhookAsync_WhenWebhooksSupported_ReturnsTrue()
    {
        // Arrange - TestProviderWithMinimalOverrides supports webhooks
        var request = CreateMockHttpRequest();

        // Act
        var result = await _provider.ValidateWebhookAsync(request);

        // Assert - Default implementation returns true when webhooks are supported
        result.ShouldBeTrue();
    }

    [Fact]
    public async Task ProcessWebhookAsync_DefaultReturnsNotSupported()
    {
        // Arrange
        var request = CreateMockHttpRequest();

        // Act
        var result = await _provider.ProcessWebhookAsync(request);

        // Assert
        result.ShouldNotBeNull();
        result.Success.ShouldBeFalse();
        result.ErrorMessage!.ShouldContain("does not support");
    }

    [Fact]
    public async Task PollOrderStatusAsync_DefaultReturnsEmptyList()
    {
        // Arrange
        var references = new[] { "REF1", "REF2" };

        // Act
        var result = await _provider.PollOrderStatusAsync(references);

        // Assert
        result.ShouldNotBeNull();
        result.ShouldBeEmpty();
    }

    [Fact]
    public async Task SyncProductsAsync_DefaultReturnsNotSupported()
    {
        // Arrange
        var products = new[]
        {
            new FulfilmentProduct { ProductId = Guid.NewGuid(), Sku = "SKU-001", Name = "Test Product" }
        };

        // Act
        var result = await _provider.SyncProductsAsync(products);

        // Assert
        result.ShouldNotBeNull();
        result.Success.ShouldBeFalse();
        result.Errors.ShouldContain(e => e.Contains("does not support"));
    }

    [Fact]
    public async Task GetInventoryLevelsAsync_DefaultReturnsEmptyList()
    {
        // Act
        var result = await _provider.GetInventoryLevelsAsync();

        // Assert
        result.ShouldNotBeNull();
        result.ShouldBeEmpty();
    }

    #endregion

    #region Metadata Tests

    [Fact]
    public void Metadata_MustBeImplemented()
    {
        // Act
        var metadata = _provider.Metadata;

        // Assert
        metadata.ShouldNotBeNull();
        metadata.Key.ShouldNotBeNullOrEmpty();
        metadata.DisplayName.ShouldNotBeNullOrEmpty();
    }

    #endregion

    #region Helper Methods

    private static FulfilmentOrderRequest CreateTestOrderRequest()
    {
        return new FulfilmentOrderRequest
        {
            OrderId = Guid.NewGuid(),
            OrderNumber = "TEST-001",
            LineItems =
            [
                new FulfilmentLineItem
                {
                    LineItemId = Guid.NewGuid(),
                    Sku = "SKU-001",
                    Name = "Test Product",
                    Quantity = 1,
                    UnitPrice = 10.00m
                }
            ],
            ShippingAddress = new FulfilmentAddress
            {
                Name = "Test Customer",
                Address1 = "123 Test Street",
                City = "London",
                PostalCode = "SW1A 1AA",
                CountryCode = "GB"
            }
        };
    }

    private static HttpRequest CreateMockHttpRequest()
    {
        var context = new DefaultHttpContext();
        return context.Request;
    }

    #endregion

    #region Test Provider Classes

    /// <summary>
    /// Test provider with minimal overrides that supports most features but doesn't implement them.
    /// Used to test default base class behavior.
    /// </summary>
    private class TestProviderWithMinimalOverrides : FulfilmentProviderBase
    {
        public override FulfilmentProviderMetadata Metadata => new()
        {
            Key = "test-minimal",
            DisplayName = "Test Minimal Provider",
            Description = "Minimal test provider",
            SupportsOrderSubmission = true,
            SupportsWebhooks = true,
            SupportsPolling = true,
            ApiStyle = FulfilmentApiStyle.Rest
        };

        public FulfilmentProviderConfiguration? ExposedConfiguration => Configuration;
    }

    /// <summary>
    /// Test provider that does not support order submission.
    /// </summary>
    private class TestProviderNoSubmission : FulfilmentProviderBase
    {
        public override FulfilmentProviderMetadata Metadata => new()
        {
            Key = "test-no-submission",
            DisplayName = "No Submission Provider",
            Description = "Provider without order submission support",
            SupportsOrderSubmission = false
        };
    }

    /// <summary>
    /// Test provider that does not support webhooks.
    /// </summary>
    private class TestProviderNoWebhooks : FulfilmentProviderBase
    {
        public override FulfilmentProviderMetadata Metadata => new()
        {
            Key = "test-no-webhooks",
            DisplayName = "No Webhooks Provider",
            Description = "Provider without webhook support",
            SupportsWebhooks = false
        };
    }

    #endregion
}

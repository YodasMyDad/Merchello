using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers.Stripe;
using Merchello.Core.Shared.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Payments.Providers;

/// <summary>
/// Unit tests for Stripe vaulted payments functionality.
/// </summary>
public class StripeVaultTests
{
    private readonly StripePaymentProvider _provider;

    public StripeVaultTests()
    {
        var currencyServiceMock = new Mock<ICurrencyService>();
        currencyServiceMock.Setup(s => s.GetDecimalPlaces(It.IsAny<string>()))
            .Returns(2);

        var loggerMock = new Mock<ILogger<StripePaymentProvider>>();
        _provider = new StripePaymentProvider(currencyServiceMock.Object, loggerMock.Object);
    }

    #region Metadata Tests

    [Fact]
    public void Metadata_SupportsVaultedPayments_IsTrue()
    {
        // Assert
        _provider.Metadata.SupportsVaultedPayments.ShouldBeTrue();
    }

    [Fact]
    public void Metadata_RequiresProviderCustomerId_IsTrue()
    {
        // Assert - Stripe requires Customer object for vaulting
        _provider.Metadata.RequiresProviderCustomerId.ShouldBeTrue();
    }

    [Fact]
    public void Metadata_HasCorrectAlias()
    {
        // Assert
        _provider.Metadata.Alias.ShouldBe("stripe");
    }

    #endregion

    #region CreateVaultSetupSessionAsync Tests

    [Fact]
    public async Task CreateVaultSetupSessionAsync_ReturnsError_WhenNotConfigured()
    {
        // Arrange
        var request = new VaultSetupRequest
        {
            CustomerId = Guid.NewGuid(),
            CustomerEmail = "test@example.com",
            CustomerName = "Test User"
        };

        // Act
        var result = await _provider.CreateVaultSetupSessionAsync(request);

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldNotBeNullOrEmpty();
        result.ErrorMessage.ShouldContain("configured");
    }

    [Fact]
    public async Task CreateVaultSetupSessionAsync_RequiresCustomerId()
    {
        // Arrange
        var request = new VaultSetupRequest
        {
            CustomerId = Guid.Empty,
            CustomerEmail = "test@example.com"
        };

        // Act
        var result = await _provider.CreateVaultSetupSessionAsync(request);

        // Assert
        result.Success.ShouldBeFalse();
    }

    #endregion

    #region ConfirmVaultSetupAsync Tests

    [Fact]
    public async Task ConfirmVaultSetupAsync_ReturnsError_WhenNotConfigured()
    {
        // Arrange
        var request = new VaultConfirmRequest
        {
            CustomerId = Guid.NewGuid(),
            SetupSessionId = "seti_test123"
        };

        // Act
        var result = await _provider.ConfirmVaultSetupAsync(request);

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldNotBeNullOrEmpty();
    }

    [Fact]
    public async Task ConfirmVaultSetupAsync_RequiresSetupSessionId()
    {
        // Arrange
        var request = new VaultConfirmRequest
        {
            CustomerId = Guid.NewGuid(),
            SetupSessionId = string.Empty
        };

        // Act
        var result = await _provider.ConfirmVaultSetupAsync(request);

        // Assert
        result.Success.ShouldBeFalse();
    }

    #endregion

    #region ChargeVaultedMethodAsync Tests

    [Fact]
    public async Task ChargeVaultedMethodAsync_ReturnsError_WhenNotConfigured()
    {
        // Arrange
        var request = new ChargeVaultedMethodRequest
        {
            InvoiceId = Guid.NewGuid(),
            CustomerId = Guid.NewGuid(),
            ProviderMethodId = "pm_test123",
            ProviderCustomerId = "cus_test456",
            Amount = 100m,
            CurrencyCode = "USD"
        };

        // Act
        var result = await _provider.ChargeVaultedMethodAsync(request);

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldNotBeNullOrEmpty();
    }

    [Fact]
    public async Task ChargeVaultedMethodAsync_RequiresProviderMethodId()
    {
        // Arrange
        var request = new ChargeVaultedMethodRequest
        {
            InvoiceId = Guid.NewGuid(),
            CustomerId = Guid.NewGuid(),
            ProviderMethodId = string.Empty,
            Amount = 100m,
            CurrencyCode = "USD"
        };

        // Act
        var result = await _provider.ChargeVaultedMethodAsync(request);

        // Assert
        result.Success.ShouldBeFalse();
    }

    #endregion

    #region DeleteVaultedMethodAsync Tests

    [Fact]
    public async Task DeleteVaultedMethodAsync_ReturnsFalse_WhenNotConfigured()
    {
        // Act
        var result = await _provider.DeleteVaultedMethodAsync("pm_test123", "cus_test456");

        // Assert
        result.ShouldBeFalse();
    }

    #endregion
}

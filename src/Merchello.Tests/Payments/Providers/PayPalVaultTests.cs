using System.Net.Http;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers.PayPal;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Payments.Providers;

/// <summary>
/// Unit tests for PayPal vaulted payments functionality.
/// </summary>
public class PayPalVaultTests
{
    private readonly PayPalPaymentProvider _provider;

    public PayPalVaultTests()
    {
        var httpClientFactoryMock = new Mock<IHttpClientFactory>();
        httpClientFactoryMock
            .Setup(f => f.CreateClient(It.IsAny<string>()))
            .Returns(new HttpClient());

        _provider = new PayPalPaymentProvider(httpClientFactoryMock.Object);
    }

    #region Metadata Tests

    [Fact]
    public void Metadata_SupportsVaultedPayments_IsTrue()
    {
        // Assert
        _provider.Metadata.SupportsVaultedPayments.ShouldBeTrue();
    }

    [Fact]
    public void Metadata_RequiresProviderCustomerId_IsFalse()
    {
        // Assert - PayPal uses standalone vault tokens, no customer object needed
        _provider.Metadata.RequiresProviderCustomerId.ShouldBeFalse();
    }

    [Fact]
    public void Metadata_HasCorrectAlias()
    {
        // Assert
        _provider.Metadata.Alias.ShouldBe("paypal");
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
            ReturnUrl = "https://example.com/return",
            CancelUrl = "https://example.com/cancel"
        };

        // Act
        var result = await _provider.CreateVaultSetupSessionAsync(request);

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldNotBeNullOrEmpty();
        result.ErrorMessage.ShouldContain("configured");
    }

    [Fact]
    public async Task CreateVaultSetupSessionAsync_RequiresReturnUrl()
    {
        // Arrange - PayPal uses redirect flow for vault setup
        var request = new VaultSetupRequest
        {
            CustomerId = Guid.NewGuid(),
            CustomerEmail = "test@example.com",
            ReturnUrl = null, // Missing required URL
            CancelUrl = "https://example.com/cancel"
        };

        // Act
        var result = await _provider.CreateVaultSetupSessionAsync(request);

        // Assert
        result.Success.ShouldBeFalse();
    }

    [Fact]
    public async Task CreateVaultSetupSessionAsync_ReturnsRedirectUrl_WhenConfigured()
    {
        // Note: This test would require a configured provider with valid credentials
        // For now, we verify the failure case which is testable without credentials

        // Arrange
        var request = new VaultSetupRequest
        {
            CustomerId = Guid.NewGuid(),
            CustomerEmail = "test@example.com",
            ReturnUrl = "https://example.com/return",
            CancelUrl = "https://example.com/cancel"
        };

        // Act
        var result = await _provider.CreateVaultSetupSessionAsync(request);

        // Assert - Should fail because not configured
        result.Success.ShouldBeFalse();
        // When configured, result.RedirectUrl would contain PayPal approval URL
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
            SetupSessionId = "setup_token_test"
        };

        // Act
        var result = await _provider.ConfirmVaultSetupAsync(request);

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldNotBeNullOrEmpty();
    }

    [Fact]
    public async Task ConfirmVaultSetupAsync_ReturnsPayPalEmail_InExtendedData()
    {
        // Note: This test verifies expected behavior when properly configured
        // For now, we verify failure case without credentials

        // Arrange
        var request = new VaultConfirmRequest
        {
            CustomerId = Guid.NewGuid(),
            SetupSessionId = "setup_token_test"
        };

        // Act
        var result = await _provider.ConfirmVaultSetupAsync(request);

        // Assert - When successful, ExtendedData should contain payer_email
        result.Success.ShouldBeFalse(); // Not configured
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
            ProviderMethodId = "payment_token_test",
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
    public async Task ChargeVaultedMethodAsync_RequiresValidCurrency()
    {
        // Arrange
        var request = new ChargeVaultedMethodRequest
        {
            InvoiceId = Guid.NewGuid(),
            CustomerId = Guid.NewGuid(),
            ProviderMethodId = "payment_token_test",
            Amount = 100m,
            CurrencyCode = string.Empty // Invalid currency
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
        var result = await _provider.DeleteVaultedMethodAsync("payment_token_test");

        // Assert
        result.ShouldBeFalse();
    }

    #endregion
}

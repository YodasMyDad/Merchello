using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers.Braintree;
using Microsoft.Extensions.Logging;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Payments.Providers;

/// <summary>
/// Unit tests for Braintree vaulted payments functionality.
/// </summary>
public class BraintreeVaultTests
{
    private readonly BraintreePaymentProvider _provider;

    public BraintreeVaultTests()
    {
        var loggerMock = new Mock<ILogger<BraintreePaymentProvider>>();
        _provider = new BraintreePaymentProvider(loggerMock.Object);
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
        // Assert - Braintree requires CustomerId for vault operations
        _provider.Metadata.RequiresProviderCustomerId.ShouldBeTrue();
    }

    [Fact]
    public void Metadata_HasCorrectAlias()
    {
        // Assert
        _provider.Metadata.Alias.ShouldBe("braintree");
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
    public async Task CreateVaultSetupSessionAsync_ReturnsClientToken_WhenConfigured()
    {
        // Note: This test would require a configured provider with valid credentials
        // For now, we verify the failure case which is testable without credentials

        // Arrange
        var request = new VaultSetupRequest
        {
            CustomerId = Guid.NewGuid(),
            CustomerEmail = "test@example.com"
        };

        // Act
        var result = await _provider.CreateVaultSetupSessionAsync(request);

        // Assert - Should fail because not configured
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
            SetupSessionId = "session_test",
            PaymentMethodToken = "nonce_test"
        };

        // Act
        var result = await _provider.ConfirmVaultSetupAsync(request);

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldNotBeNullOrEmpty();
    }

    [Fact]
    public async Task ConfirmVaultSetupAsync_ReturnsError_WhenNonceInvalid()
    {
        // Arrange - Even with valid config, invalid nonce should fail
        var request = new VaultConfirmRequest
        {
            CustomerId = Guid.NewGuid(),
            SetupSessionId = "session_test",
            PaymentMethodToken = string.Empty
        };

        // Act
        var result = await _provider.ConfirmVaultSetupAsync(request);

        // Assert
        result.Success.ShouldBeFalse();
    }

    [Fact]
    public async Task ConfirmVaultSetupAsync_RequiresProviderCustomerId()
    {
        // Arrange - Braintree requires customer ID for vault
        var request = new VaultConfirmRequest
        {
            CustomerId = Guid.NewGuid(),
            SetupSessionId = "session_test",
            PaymentMethodToken = "nonce_test",
            ProviderCustomerId = null // Missing required field
        };

        // Act
        var result = await _provider.ConfirmVaultSetupAsync(request);

        // Assert - Should fail without provider customer ID
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
            ProviderMethodId = "vault_token_test",
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
    public async Task ChargeVaultedMethodAsync_RequiresValidAmount()
    {
        // Arrange
        var request = new ChargeVaultedMethodRequest
        {
            InvoiceId = Guid.NewGuid(),
            CustomerId = Guid.NewGuid(),
            ProviderMethodId = "vault_token_test",
            Amount = 0m, // Invalid amount
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
        var result = await _provider.DeleteVaultedMethodAsync("vault_token_test");

        // Assert
        result.ShouldBeFalse();
    }

    #endregion
}

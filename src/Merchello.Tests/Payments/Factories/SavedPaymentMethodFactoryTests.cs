using Merchello.Core.Payments.Factories;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services.Parameters;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Payments.Factories;

/// <summary>
/// Unit tests for SavedPaymentMethodFactory.
/// </summary>
public class SavedPaymentMethodFactoryTests
{
    private readonly SavedPaymentMethodFactory _factory;

    public SavedPaymentMethodFactoryTests()
    {
        _factory = new SavedPaymentMethodFactory();
    }

    #region CreateFromVaultConfirmation Tests

    [Fact]
    public void CreateFromVaultConfirmation_Card_SetsAllProperties()
    {
        // Arrange
        var customerId = Guid.NewGuid();
        var providerAlias = "stripe";
        var ipAddress = "192.168.1.1";
        var result = new VaultConfirmResult
        {
            Success = true,
            ProviderMethodId = "pm_test123",
            ProviderCustomerId = "cus_test456",
            MethodType = SavedPaymentMethodType.Card,
            CardBrand = "visa",
            Last4 = "4242",
            ExpiryMonth = 12,
            ExpiryYear = 2026
        };

        // Act
        var method = _factory.CreateFromVaultConfirmation(
            customerId,
            providerAlias,
            result,
            ipAddress,
            setAsDefault: true);

        // Assert
        method.ShouldNotBeNull();
        method.Id.ShouldNotBe(Guid.Empty);
        method.CustomerId.ShouldBe(customerId);
        method.ProviderAlias.ShouldBe(providerAlias);
        method.ProviderMethodId.ShouldBe("pm_test123");
        method.ProviderCustomerId.ShouldBe("cus_test456");
        method.MethodType.ShouldBe(SavedPaymentMethodType.Card);
        method.CardBrand.ShouldBe("visa");
        method.Last4.ShouldBe("4242");
        method.ExpiryMonth.ShouldBe(12);
        method.ExpiryYear.ShouldBe(2026);
        method.IsDefault.ShouldBeTrue();
        method.IsVerified.ShouldBeTrue();
        method.ConsentIpAddress.ShouldBe(ipAddress);
        method.ConsentDateUtc.ShouldNotBeNull();
        method.DisplayLabel.ShouldBe("Visa ending in 4242");
    }

    [Fact]
    public void CreateFromVaultConfirmation_PayPal_GeneratesCorrectDisplayLabel()
    {
        // Arrange
        var result = new VaultConfirmResult
        {
            Success = true,
            ProviderMethodId = "vault_test123",
            MethodType = SavedPaymentMethodType.PayPal,
            Last4 = null
        };

        // Act
        var method = _factory.CreateFromVaultConfirmation(
            Guid.NewGuid(),
            "paypal",
            result);

        // Assert
        method.DisplayLabel.ShouldBe("PayPal - account");
    }

    [Fact]
    public void CreateFromVaultConfirmation_WithCustomDisplayLabel_UsesProvided()
    {
        // Arrange
        var result = new VaultConfirmResult
        {
            Success = true,
            ProviderMethodId = "pm_test123",
            MethodType = SavedPaymentMethodType.Card,
            CardBrand = "visa",
            Last4 = "4242",
            DisplayLabel = "My Primary Card"
        };

        // Act
        var method = _factory.CreateFromVaultConfirmation(
            Guid.NewGuid(),
            "stripe",
            result);

        // Assert
        method.DisplayLabel.ShouldBe("My Primary Card");
    }

    [Fact]
    public void CreateFromVaultConfirmation_BankAccount_GeneratesCorrectDisplayLabel()
    {
        // Arrange
        var result = new VaultConfirmResult
        {
            Success = true,
            ProviderMethodId = "ba_test123",
            MethodType = SavedPaymentMethodType.BankAccount,
            Last4 = "6789"
        };

        // Act
        var method = _factory.CreateFromVaultConfirmation(
            Guid.NewGuid(),
            "stripe",
            result);

        // Assert
        method.DisplayLabel.ShouldBe("Bank account ending in 6789");
    }

    [Fact]
    public void CreateFromVaultConfirmation_WithExtendedData_CopiesData()
    {
        // Arrange
        var extendedData = new Dictionary<string, object>
        {
            ["fingerprint"] = "abc123",
            ["funding"] = "credit"
        };

        var result = new VaultConfirmResult
        {
            Success = true,
            ProviderMethodId = "pm_test123",
            MethodType = SavedPaymentMethodType.Card,
            ExtendedData = extendedData
        };

        // Act
        var method = _factory.CreateFromVaultConfirmation(
            Guid.NewGuid(),
            "stripe",
            result);

        // Assert
        method.ExtendedData.ShouldNotBeNull();
        method.ExtendedData.ShouldContainKey("fingerprint");
        method.ExtendedData["fingerprint"].ShouldBe("abc123");
    }

    #endregion

    #region CreateFromCheckout Tests

    [Fact]
    public void CreateFromCheckout_Card_SetsAllProperties()
    {
        // Arrange
        var customerId = Guid.NewGuid();
        var parameters = new SavePaymentMethodFromCheckoutParameters
        {
            CustomerId = customerId,
            ProviderAlias = "braintree",
            ProviderMethodId = "nonce_test123",
            ProviderCustomerId = "bt_cust_456",
            MethodType = SavedPaymentMethodType.Card,
            CardBrand = "mastercard",
            Last4 = "5555",
            ExpiryMonth = 6,
            ExpiryYear = 2025,
            BillingName = "John Doe",
            BillingEmail = "john@example.com",
            SetAsDefault = true,
            IpAddress = "10.0.0.1"
        };

        // Act
        var method = _factory.CreateFromCheckout(parameters);

        // Assert
        method.ShouldNotBeNull();
        method.Id.ShouldNotBe(Guid.Empty);
        method.CustomerId.ShouldBe(customerId);
        method.ProviderAlias.ShouldBe("braintree");
        method.ProviderMethodId.ShouldBe("nonce_test123");
        method.ProviderCustomerId.ShouldBe("bt_cust_456");
        method.MethodType.ShouldBe(SavedPaymentMethodType.Card);
        method.CardBrand.ShouldBe("mastercard");
        method.Last4.ShouldBe("5555");
        method.ExpiryMonth.ShouldBe(6);
        method.ExpiryYear.ShouldBe(2025);
        method.BillingName.ShouldBe("John Doe");
        method.BillingEmail.ShouldBe("john@example.com");
        method.IsDefault.ShouldBeTrue();
        method.IsVerified.ShouldBeTrue();
        method.ConsentIpAddress.ShouldBe("10.0.0.1");
        method.DisplayLabel.ShouldBe("Mastercard ending in 5555");
    }

    [Fact]
    public void CreateFromCheckout_PayPal_IncludesEmail()
    {
        // Arrange
        var parameters = new SavePaymentMethodFromCheckoutParameters
        {
            CustomerId = Guid.NewGuid(),
            ProviderAlias = "paypal",
            ProviderMethodId = "vault_test",
            MethodType = SavedPaymentMethodType.PayPal,
            BillingEmail = "payer@paypal.com"
        };

        // Act
        var method = _factory.CreateFromCheckout(parameters);

        // Assert
        method.DisplayLabel.ShouldBe("PayPal - payer@paypal.com");
    }

    [Fact]
    public void CreateFromCheckout_DefaultFalse_SetsIsDefaultFalse()
    {
        // Arrange
        var parameters = new SavePaymentMethodFromCheckoutParameters
        {
            CustomerId = Guid.NewGuid(),
            ProviderAlias = "stripe",
            ProviderMethodId = "pm_test",
            MethodType = SavedPaymentMethodType.Card,
            SetAsDefault = false
        };

        // Act
        var method = _factory.CreateFromCheckout(parameters);

        // Assert
        method.IsDefault.ShouldBeFalse();
    }

    #endregion

    #region Card Brand Formatting Tests

    [Theory]
    [InlineData("visa", "Visa")]
    [InlineData("VISA", "Visa")]
    [InlineData("mastercard", "Mastercard")]
    [InlineData("amex", "American Express")]
    [InlineData("american_express", "American Express")]
    [InlineData("discover", "Discover")]
    [InlineData("diners", "Diners Club")]
    [InlineData("diners_club", "Diners Club")]
    [InlineData("jcb", "JCB")]
    [InlineData("unionpay", "UnionPay")]
    [InlineData("unknown_brand", "unknown_brand")]
    [InlineData(null, "Card")]
    public void CreateFromVaultConfirmation_FormatsCardBrandCorrectly(string? brand, string expected)
    {
        // Arrange
        var result = new VaultConfirmResult
        {
            Success = true,
            ProviderMethodId = "pm_test",
            MethodType = SavedPaymentMethodType.Card,
            CardBrand = brand,
            Last4 = "1234"
        };

        // Act
        var method = _factory.CreateFromVaultConfirmation(
            Guid.NewGuid(),
            "stripe",
            result);

        // Assert
        method.DisplayLabel.ShouldBe($"{expected} ending in 1234");
    }

    #endregion

    #region Timestamp Tests

    [Fact]
    public void CreateFromVaultConfirmation_SetsTimestamps()
    {
        // Arrange
        var beforeTime = DateTime.UtcNow;
        var result = new VaultConfirmResult
        {
            Success = true,
            ProviderMethodId = "pm_test",
            MethodType = SavedPaymentMethodType.Card
        };

        // Act
        var method = _factory.CreateFromVaultConfirmation(
            Guid.NewGuid(),
            "stripe",
            result);

        // Assert
        var afterTime = DateTime.UtcNow;
        method.DateCreated.ShouldBeGreaterThanOrEqualTo(beforeTime);
        method.DateCreated.ShouldBeLessThanOrEqualTo(afterTime);
        method.DateUpdated.ShouldBe(method.DateCreated);
        method.ConsentDateUtc.ShouldBe(method.DateCreated);
    }

    [Fact]
    public void CreateFromCheckout_SetsTimestamps()
    {
        // Arrange
        var beforeTime = DateTime.UtcNow;
        var parameters = new SavePaymentMethodFromCheckoutParameters
        {
            CustomerId = Guid.NewGuid(),
            ProviderAlias = "stripe",
            ProviderMethodId = "pm_test",
            MethodType = SavedPaymentMethodType.Card
        };

        // Act
        var method = _factory.CreateFromCheckout(parameters);

        // Assert
        var afterTime = DateTime.UtcNow;
        method.DateCreated.ShouldBeGreaterThanOrEqualTo(beforeTime);
        method.DateCreated.ShouldBeLessThanOrEqualTo(afterTime);
        method.DateUpdated.ShouldBe(method.DateCreated);
        method.ConsentDateUtc.ShouldBe(method.DateCreated);
    }

    #endregion
}

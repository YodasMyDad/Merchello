using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers.Braintree;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Payments.Providers;

public class BraintreePaymentProviderTests
{
    [Fact]
    public void GetAvailablePaymentMethods_ReturnsAllFourMethods()
    {
        // Arrange
        var provider = new BraintreePaymentProvider();

        // Act
        var methods = provider.GetAvailablePaymentMethods().ToList();

        // Assert
        methods.Count.ShouldBe(4);

        // Verify Cards method
        var cards = methods.FirstOrDefault(m => m.Alias == "cards");
        cards.ShouldNotBeNull();
        cards!.DisplayName.ShouldBe("Credit/Debit Card");
        cards.ShowInCheckoutByDefault.ShouldBeTrue();

        // Verify PayPal method
        var paypal = methods.FirstOrDefault(m => m.Alias == "paypal");
        paypal.ShouldNotBeNull();
        paypal!.DisplayName.ShouldBe("PayPal");

        // Verify Apple Pay method
        var applePay = methods.FirstOrDefault(m => m.Alias == "applepay");
        applePay.ShouldNotBeNull();
        applePay!.DisplayName.ShouldBe("Apple Pay");
        applePay.IsExpressCheckout.ShouldBeTrue();

        // Verify Google Pay method
        var googlePay = methods.FirstOrDefault(m => m.Alias == "googlepay");
        googlePay.ShouldNotBeNull();
        googlePay!.DisplayName.ShouldBe("Google Pay");
        googlePay.IsExpressCheckout.ShouldBeTrue();
    }

    [Fact]
    public async Task GetConfigurationFieldsAsync_ReturnsExpectedFields()
    {
        // Arrange
        var provider = new BraintreePaymentProvider();

        // Act
        var fields = (await provider.GetConfigurationFieldsAsync()).ToList();

        // Assert
        fields.Count.ShouldBe(4);

        // Verify required configuration fields
        var merchantId = fields.FirstOrDefault(f => f.Key == "merchantId");
        merchantId.ShouldNotBeNull();
        merchantId!.IsRequired.ShouldBeTrue();

        var publicKey = fields.FirstOrDefault(f => f.Key == "publicKey");
        publicKey.ShouldNotBeNull();
        publicKey!.IsRequired.ShouldBeTrue();

        var privateKey = fields.FirstOrDefault(f => f.Key == "privateKey");
        privateKey.ShouldNotBeNull();
        privateKey!.IsRequired.ShouldBeTrue();
        privateKey.IsSensitive.ShouldBeTrue();

        var merchantAccountId = fields.FirstOrDefault(f => f.Key == "merchantAccountId");
        merchantAccountId.ShouldNotBeNull();
        merchantAccountId!.IsRequired.ShouldBeFalse(); // Optional field
    }

    [Fact]
    public async Task CreatePaymentSessionAsync_WhenNotConfigured_ReturnsFailure()
    {
        // Arrange
        var provider = new BraintreePaymentProvider();
        var request = new PaymentRequest
        {
            InvoiceId = Guid.NewGuid(),
            Amount = 100m,
            Currency = "USD",
            ReturnUrl = "https://example.com/return",
            CancelUrl = "https://example.com/cancel"
        };

        // Act
        var result = await provider.CreatePaymentSessionAsync(request);

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldNotBeNullOrEmpty();
        result.ErrorMessage.ShouldContain("configured");
    }

    [Fact]
    public async Task ProcessPaymentAsync_WhenNotConfigured_ReturnsFailure()
    {
        // Arrange
        var provider = new BraintreePaymentProvider();
        var request = new ProcessPaymentRequest
        {
            InvoiceId = Guid.NewGuid(),
            ProviderAlias = "braintree",
            Amount = 100m,
            PaymentMethodToken = "test_nonce"
        };

        // Act
        var result = await provider.ProcessPaymentAsync(request);

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldNotBeNullOrEmpty();
    }

    [Fact]
    public async Task RefundPaymentAsync_WhenNotConfigured_ReturnsFailure()
    {
        // Arrange
        var provider = new BraintreePaymentProvider();
        var request = new RefundRequest
        {
            PaymentId = Guid.NewGuid(),
            TransactionId = "test_transaction_id",
            Amount = 50m,
            Reason = "Customer requested"
        };

        // Act
        var result = await provider.RefundPaymentAsync(request);

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldNotBeNullOrEmpty();
    }

    [Fact]
    public async Task ValidateWebhookAsync_WithMissingSignature_ReturnsFalse()
    {
        // Arrange
        var provider = new BraintreePaymentProvider();
        var payload = "test_payload";
        var headers = new Dictionary<string, string>();

        // Act
        var result = await provider.ValidateWebhookAsync(payload, headers);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public async Task ProcessWebhookAsync_WhenNotConfigured_ReturnsFailure()
    {
        // Arrange
        var provider = new BraintreePaymentProvider();
        var payload = "test_payload";
        var headers = new Dictionary<string, string>();

        // Act
        var result = await provider.ProcessWebhookAsync(payload, headers);

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldNotBeNullOrEmpty();
        result.ErrorMessage!.ShouldContain("configured");
    }

    [Fact]
    public async Task ProcessExpressCheckoutAsync_WhenNotConfigured_ReturnsFailure()
    {
        // Arrange
        var provider = new BraintreePaymentProvider();
        var request = new ExpressCheckoutRequest
        {
            BasketId = Guid.NewGuid(),
            MethodAlias = "applepay",
            PaymentToken = "test_token",
            Amount = 100m,
            Currency = "USD",
            CustomerData = new ExpressCheckoutCustomerData
            {
                Email = "test@example.com",
                FullName = "Test User",
                ShippingAddress = new ExpressCheckoutAddress
                {
                    Line1 = "123 Test St",
                    City = "Test City",
                    Region = "TS",
                    PostalCode = "12345",
                    CountryCode = "US"
                }
            }
        };

        // Act
        var result = await provider.ProcessExpressCheckoutAsync(request);

        // Assert
        result.Success.ShouldBeFalse();
    }

    [Fact]
    public void Metadata_HasCorrectValues()
    {
        // Arrange
        var provider = new BraintreePaymentProvider();

        // Assert
        provider.Metadata.Alias.ShouldBe("braintree");
        provider.Metadata.DisplayName.ShouldBe("Braintree");
        provider.Metadata.SupportsRefunds.ShouldBeTrue();
        provider.Metadata.SupportsPartialRefunds.ShouldBeTrue();
    }
}

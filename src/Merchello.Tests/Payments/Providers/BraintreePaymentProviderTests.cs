using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers.Braintree;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Shared.Providers;
using Microsoft.Extensions.Logging;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Payments.Providers;

public class BraintreePaymentProviderTests
{
    private readonly BraintreePaymentProvider _provider;

    public BraintreePaymentProviderTests()
    {
        var loggerMock = new Mock<ILogger<BraintreePaymentProvider>>();
        _provider = new BraintreePaymentProvider(loggerMock.Object);
    }

    [Fact]
    public void GetAvailablePaymentMethods_ReturnsAllMethods()
    {
        // Arrange - using _provider from constructor

        // Act
        var methods = _provider.GetAvailablePaymentMethods().ToList();

        // Assert - 10 methods: cards, paypal, applepay, googlepay, venmo, ideal, bancontact, sepa, eps, p24
        methods.Count.ShouldBe(10);

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

        // Verify Venmo method
        var venmo = methods.FirstOrDefault(m => m.Alias == "venmo");
        venmo.ShouldNotBeNull();
        venmo.DisplayName.ShouldBe("Venmo");
        venmo.IsExpressCheckout.ShouldBeTrue();

        // Verify Local Payment Methods exist
        methods.ShouldContain(m => m.Alias == "ideal");
        methods.ShouldContain(m => m.Alias == "bancontact");
        methods.ShouldContain(m => m.Alias == "sepa");
        methods.ShouldContain(m => m.Alias == "eps");
        methods.ShouldContain(m => m.Alias == "p24");
    }

    [Fact]
    public async Task GetConfigurationFieldsAsync_ReturnsExpectedFields()
    {
        // Act
        var fields = (await _provider.GetConfigurationFieldsAsync()).ToList();

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
        var request = new PaymentRequest
        {
            InvoiceId = Guid.NewGuid(),
            Amount = 100m,
            Currency = "USD",
            ReturnUrl = "https://example.com/return",
            CancelUrl = "https://example.com/cancel"
        };

        // Act
        var result = await _provider.CreatePaymentSessionAsync(request);

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldNotBeNullOrEmpty();
        result.ErrorMessage.ShouldContain("configured");
    }

    [Fact]
    public async Task ProcessPaymentAsync_WhenNotConfigured_ReturnsFailure()
    {
        // Arrange
        var request = new ProcessPaymentRequest
        {
            InvoiceId = Guid.NewGuid(),
            ProviderAlias = "braintree",
            Amount = 100m,
            PaymentMethodToken = "test_nonce"
        };

        // Act
        var result = await _provider.ProcessPaymentAsync(request);

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldNotBeNullOrEmpty();
    }

    [Fact]
    public async Task RefundPaymentAsync_WhenNotConfigured_ReturnsFailure()
    {
        // Arrange
        var request = new RefundRequest
        {
            PaymentId = Guid.NewGuid(),
            TransactionId = "test_transaction_id",
            Amount = 50m,
            Reason = "Customer requested"
        };

        // Act
        var result = await _provider.RefundPaymentAsync(request);

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldNotBeNullOrEmpty();
    }

    [Fact]
    public async Task ValidateWebhookAsync_WithMissingSignature_ReturnsFalse()
    {
        // Arrange
        var payload = "test_payload";
        var headers = new Dictionary<string, string>();

        // Act
        var result = await _provider.ValidateWebhookAsync(payload, headers);

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public async Task ProcessWebhookAsync_WhenNotConfigured_ReturnsFailure()
    {
        // Arrange
        var payload = "test_payload";
        var headers = new Dictionary<string, string>();

        // Act
        var result = await _provider.ProcessWebhookAsync(payload, headers);

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldNotBeNullOrEmpty();
        result.ErrorMessage!.ShouldContain("configured");
    }

    [Fact]
    public async Task ProcessExpressCheckoutAsync_WhenNotConfigured_ReturnsFailure()
    {
        // Arrange
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
                    AddressOne = "123 Test St",
                    TownCity = "Test City",
                    CountyState = "TS",
                    PostalCode = "12345",
                    CountryCode = "US"
                }
            }
        };

        // Act
        var result = await _provider.ProcessExpressCheckoutAsync(request);

        // Assert
        result.Success.ShouldBeFalse();
    }

    [Fact]
    public void Metadata_HasCorrectValues()
    {
        // Assert
        _provider.Metadata.Alias.ShouldBe("braintree");
        _provider.Metadata.DisplayName.ShouldBe("Braintree");
        _provider.Metadata.IconHtml.ShouldBe(ProviderBrandLogoCatalog.Braintree);
        _provider.Metadata.SupportsRefunds.ShouldBeTrue();
        _provider.Metadata.SupportsPartialRefunds.ShouldBeTrue();
    }

    [Fact]
    public void GetAvailablePaymentMethods_UsesCatalogIcons()
    {
        var methods = _provider.GetAvailablePaymentMethods().ToList();

        methods.First(m => m.Alias == "paypal").IconHtml.ShouldBe(ProviderBrandLogoCatalog.PayPal);
        methods.First(m => m.Alias == "applepay").IconHtml.ShouldBe(ProviderBrandLogoCatalog.ApplePay);
        methods.First(m => m.Alias == "googlepay").IconHtml.ShouldBe(ProviderBrandLogoCatalog.GooglePay);
        methods.First(m => m.Alias == "venmo").IconHtml.ShouldBe(ProviderBrandLogoCatalog.Venmo);
        methods.First(m => m.Alias == "ideal").IconHtml.ShouldBe(ProviderBrandLogoCatalog.Ideal);
        methods.First(m => m.Alias == "bancontact").IconHtml.ShouldBe(ProviderBrandLogoCatalog.Bancontact);
        methods.First(m => m.Alias == "sepa").IconHtml.ShouldBe(ProviderBrandLogoCatalog.Sepa);
        methods.First(m => m.Alias == "eps").IconHtml.ShouldBe(ProviderBrandLogoCatalog.Eps);
        methods.First(m => m.Alias == "p24").IconHtml.ShouldBe(ProviderBrandLogoCatalog.P24);
    }

    [Fact]
    public void GetAvailablePaymentMethods_CardsMethod_UsesHostedFieldsIntegrationType()
    {
        // Act
        var methods = _provider.GetAvailablePaymentMethods().ToList();
        var cardsMethod = methods.FirstOrDefault(m => m.Alias == "cards");

        // Assert - Verify cards uses HostedFields (not Drop-in)
        cardsMethod.ShouldNotBeNull();
        cardsMethod!.IntegrationType.ShouldBe(PaymentIntegrationType.HostedFields);
        cardsMethod.IsExpressCheckout.ShouldBeFalse();
        cardsMethod.MethodType.ShouldBe(PaymentMethodTypes.Cards);
    }

    [Fact]
    public void GetAvailablePaymentMethods_ExpressMethods_UseWidgetIntegrationType()
    {
        // Act
        var methods = _provider.GetAvailablePaymentMethods().ToList();

        // Assert - PayPal uses Widget and is express checkout
        var paypal = methods.FirstOrDefault(m => m.Alias == "paypal");
        paypal.ShouldNotBeNull();
        paypal!.IntegrationType.ShouldBe(PaymentIntegrationType.Widget);
        paypal.IsExpressCheckout.ShouldBeTrue();
        paypal.MethodType.ShouldBe(PaymentMethodTypes.PayPal);

        // Assert - Apple Pay uses Widget and is express checkout
        var applePay = methods.FirstOrDefault(m => m.Alias == "applepay");
        applePay.ShouldNotBeNull();
        applePay!.IntegrationType.ShouldBe(PaymentIntegrationType.Widget);
        applePay.IsExpressCheckout.ShouldBeTrue();
        applePay.MethodType.ShouldBe(PaymentMethodTypes.ApplePay);

        // Assert - Google Pay uses Widget and is express checkout
        var googlePay = methods.FirstOrDefault(m => m.Alias == "googlepay");
        googlePay.ShouldNotBeNull();
        googlePay!.IntegrationType.ShouldBe(PaymentIntegrationType.Widget);
        googlePay.IsExpressCheckout.ShouldBeTrue();
        googlePay.MethodType.ShouldBe(PaymentMethodTypes.GooglePay);
    }

    [Theory]
    [InlineData("paypal")]
    [InlineData("applepay")]
    [InlineData("googlepay")]
    public async Task GetExpressCheckoutClientConfigAsync_WhenNotConfigured_ReturnsNull(string methodAlias)
    {
        // Act - Without credentials, should return null
        var result = await _provider.GetExpressCheckoutClientConfigAsync(
            methodAlias,
            amount: 100m,
            currency: "USD");

        // Assert
        result.ShouldBeNull();
    }

    [Theory]
    [InlineData("cards")] // Not an express method
    [InlineData("unknown")]
    [InlineData("")]
    public async Task GetExpressCheckoutClientConfigAsync_ForNonExpressMethods_ReturnsNull(string methodAlias)
    {
        // Act
        var result = await _provider.GetExpressCheckoutClientConfigAsync(
            methodAlias,
            amount: 100m,
            currency: "USD");

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public async Task GetWebhookEventTemplatesAsync_ReturnsExpectedEvents()
    {
        // Act
        var templates = await _provider.GetWebhookEventTemplatesAsync();

        // Assert
        templates.ShouldNotBeNull();
        templates.Count.ShouldBe(11);

        // Verify transaction events
        templates.ShouldContain(t => t.EventType == "transaction_settled" &&
                                     t.MerchelloEventType == WebhookEventType.PaymentCompleted);
        templates.ShouldContain(t => t.EventType == "transaction_settlement_declined" &&
                                     t.MerchelloEventType == WebhookEventType.PaymentFailed);

        // Verify dispute events
        templates.ShouldContain(t => t.EventType == "dispute_opened" &&
                                     t.MerchelloEventType == WebhookEventType.DisputeOpened);
        templates.ShouldContain(t => t.EventType == "dispute_won" &&
                                     t.MerchelloEventType == WebhookEventType.DisputeResolved);
        templates.ShouldContain(t => t.EventType == "dispute_lost" &&
                                     t.MerchelloEventType == WebhookEventType.DisputeResolved);

        // Verify local payment events
        templates.ShouldContain(t => t.EventType == "local_payment_funded" &&
                                     t.MerchelloEventType == WebhookEventType.PaymentCompleted);
        templates.ShouldContain(t => t.EventType == "local_payment_completed" &&
                                     t.MerchelloEventType == WebhookEventType.PaymentCompleted);
        templates.ShouldContain(t => t.EventType == "local_payment_reversed" &&
                                     t.MerchelloEventType == WebhookEventType.RefundCompleted);
        templates.ShouldContain(t => t.EventType == "local_payment_expired" &&
                                     t.MerchelloEventType == WebhookEventType.PaymentFailed);

        // Verify additional events
        templates.ShouldContain(t => t.EventType == "dispute_under_review");
        templates.ShouldContain(t => t.EventType == "transaction_disbursed");
    }

    [Theory]
    [InlineData("transaction_settled")]
    [InlineData("transaction_settlement_declined")]
    [InlineData("dispute_opened")]
    [InlineData("local_payment_funded")]
    public async Task GenerateTestWebhookPayloadAsync_GeneratesValidPayload(string eventType)
    {
        // Arrange
        var parameters = new TestWebhookParameters
        {
            EventType = eventType,
            TransactionId = "test_txn_123",
            InvoiceId = Guid.NewGuid(),
            Amount = 99.99m
        };

        // Act
        var (payload, headers) = await _provider.GenerateTestWebhookPayloadAsync(parameters);

        // Assert
        payload.ShouldNotBeNullOrEmpty();
        headers.ShouldContainKey("bt_signature");
        headers.ShouldContainKey("Content-Type");
        headers["Content-Type"].ShouldBe("application/x-www-form-urlencoded");

        // Payload should be base64 encoded XML
        var decodedPayload = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(payload));
        decodedPayload.ShouldContain("<?xml");
        decodedPayload.ShouldContain($"<kind>{eventType}</kind>");
    }

    [Fact]
    public async Task ProcessWebhookAsync_WithSkipValidation_MapsLocalPaymentFundedToPaymentCompleted()
    {
        // Arrange
        var parameters = new TestWebhookParameters
        {
            EventType = "local_payment_funded",
            TransactionId = "test_txn_funded_123",
            InvoiceId = Guid.NewGuid(),
            Amount = 54.32m
        };

        var (payload, headers) = await _provider.GenerateTestWebhookPayloadAsync(parameters);
        headers["X-Merchello-Skip-Validation"] = "true";

        // Act
        var result = await _provider.ProcessWebhookAsync(payload, headers);

        // Assert
        result.Success.ShouldBeTrue();
        result.EventType.ShouldBe(WebhookEventType.PaymentCompleted);
        result.TransactionId.ShouldBe("test_txn_funded_123");
        result.Amount.ShouldBe(54.32m);
    }
}

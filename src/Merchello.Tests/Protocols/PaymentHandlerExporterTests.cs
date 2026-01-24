using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers;
using Merchello.Core.Payments.Providers.Interfaces;
using Merchello.Core.Protocols;
using Merchello.Core.Protocols.Payments;
using Microsoft.Extensions.Logging;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Protocols;

/// <summary>
/// Tests for payment provider to UCP handler export functionality.
/// </summary>
public class PaymentHandlerExporterTests
{
    private readonly Mock<IPaymentProviderManager> _providerManagerMock;
    private readonly Mock<ILogger<PaymentHandlerExporter>> _loggerMock;
    private readonly PaymentHandlerExporter _exporter;

    public PaymentHandlerExporterTests()
    {
        _providerManagerMock = new Mock<IPaymentProviderManager>();
        _loggerMock = new Mock<ILogger<PaymentHandlerExporter>>();
        _exporter = new PaymentHandlerExporter(_providerManagerMock.Object, _loggerMock.Object);
    }

    [Fact]
    public async Task ExportHandlersAsync_WithNoProviders_ReturnsEmpty()
    {
        // Arrange
        _providerManagerMock
            .Setup(x => x.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert
        handlers.ShouldBeEmpty();
    }

    [Fact]
    public async Task ExportHandlersAsync_WithEnabledProvider_ReturnsHandlers()
    {
        // Arrange
        var mockProvider = CreateMockProvider("braintree", "Braintree", [
            CreatePaymentMethod("cards", "Credit/Debit Card", PaymentIntegrationType.HostedFields)
        ]);

        _providerManagerMock
            .Setup(x => x.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([mockProvider]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert
        handlers.Count.ShouldBe(1);
        handlers[0].HandlerId.ShouldBe("braintree:cards");
        handlers[0].Name.ShouldBe("Credit/Debit Card");
    }

    [Fact]
    public async Task ExportHandlersAsync_WithMultipleMethods_ReturnsAllHandlers()
    {
        // Arrange
        var mockProvider = CreateMockProvider("stripe", "Stripe", [
            CreatePaymentMethod("cards", "Credit/Debit Card", PaymentIntegrationType.HostedFields),
            CreatePaymentMethod("applepay", "Apple Pay", PaymentIntegrationType.Widget, isExpressCheckout: true),
            CreatePaymentMethod("googlepay", "Google Pay", PaymentIntegrationType.Widget, isExpressCheckout: true)
        ]);

        _providerManagerMock
            .Setup(x => x.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([mockProvider]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert
        handlers.Count.ShouldBe(3);
        handlers.ShouldContain(h => h.HandlerId == "stripe:cards");
        handlers.ShouldContain(h => h.HandlerId == "stripe:applepay");
        handlers.ShouldContain(h => h.HandlerId == "stripe:googlepay");
    }

    [Fact]
    public async Task ExportHandlersAsync_MapsIntegrationTypes_Redirect()
    {
        // Arrange
        var mockProvider = CreateMockProvider("paypal", "PayPal", [
            CreatePaymentMethod("redirect", "PayPal", PaymentIntegrationType.Redirect)
        ]);

        _providerManagerMock
            .Setup(x => x.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([mockProvider]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert
        handlers[0].Type.ShouldBe(ProtocolConstants.PaymentHandlerTypes.Redirect);
    }

    [Fact]
    public async Task ExportHandlersAsync_MapsIntegrationTypes_HostedFields()
    {
        // Arrange
        var mockProvider = CreateMockProvider("braintree", "Braintree", [
            CreatePaymentMethod("cards", "Cards", PaymentIntegrationType.HostedFields)
        ]);

        _providerManagerMock
            .Setup(x => x.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([mockProvider]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert
        handlers[0].Type.ShouldBe(ProtocolConstants.PaymentHandlerTypes.Tokenized);
    }

    [Fact]
    public async Task ExportHandlersAsync_MapsIntegrationTypes_Widget()
    {
        // Arrange
        var mockProvider = CreateMockProvider("stripe", "Stripe", [
            CreatePaymentMethod("applepay", "Apple Pay", PaymentIntegrationType.Widget, isExpressCheckout: true)
        ]);

        _providerManagerMock
            .Setup(x => x.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([mockProvider]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert
        handlers[0].Type.ShouldBe(ProtocolConstants.PaymentHandlerTypes.Wallet);
    }

    [Fact]
    public async Task ExportHandlersAsync_MapsIntegrationTypes_DirectForm()
    {
        // Arrange
        var mockProvider = CreateMockProvider("manual", "Manual Payment", [
            CreatePaymentMethod("manual", "Manual Payment", PaymentIntegrationType.DirectForm)
        ]);

        _providerManagerMock
            .Setup(x => x.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([mockProvider]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert
        handlers[0].Type.ShouldBe(ProtocolConstants.PaymentHandlerTypes.Form);
    }

    [Fact]
    public async Task ExportHandlersAsync_MapsInstrumentSchemas_Cards()
    {
        // Arrange
        var mockProvider = CreateMockProvider("stripe", "Stripe", [
            CreatePaymentMethod("cards", "Cards", PaymentIntegrationType.HostedFields, methodType: "cards")
        ]);

        _providerManagerMock
            .Setup(x => x.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([mockProvider]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert
        handlers[0].InstrumentSchemas!.ShouldContain("card_payment_instrument");
    }

    [Fact]
    public async Task ExportHandlersAsync_MapsInstrumentSchemas_ApplePay()
    {
        // Arrange
        var mockProvider = CreateMockProvider("stripe", "Stripe", [
            CreatePaymentMethod("applepay", "Apple Pay", PaymentIntegrationType.Widget, methodType: "apple-pay", isExpressCheckout: true)
        ]);

        _providerManagerMock
            .Setup(x => x.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([mockProvider]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert
        handlers[0].InstrumentSchemas!.ShouldContain("wallet_instrument");
    }

    [Fact]
    public async Task ExportHandlersAsync_MapsInstrumentSchemas_GooglePay()
    {
        // Arrange
        var mockProvider = CreateMockProvider("braintree", "Braintree", [
            CreatePaymentMethod("googlepay", "Google Pay", PaymentIntegrationType.Widget, methodType: "google-pay", isExpressCheckout: true)
        ]);

        _providerManagerMock
            .Setup(x => x.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([mockProvider]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert
        handlers[0].InstrumentSchemas!.ShouldContain("wallet_instrument");
    }

    [Fact]
    public async Task ExportHandlersAsync_MapsInstrumentSchemas_PayPal()
    {
        // Arrange
        var mockProvider = CreateMockProvider("paypal", "PayPal", [
            CreatePaymentMethod("paypal", "PayPal", PaymentIntegrationType.Widget, methodType: "paypal", isExpressCheckout: true)
        ]);

        _providerManagerMock
            .Setup(x => x.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([mockProvider]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert
        handlers[0].InstrumentSchemas!.ShouldContain("wallet_instrument");
    }

    [Fact]
    public async Task ExportHandlersAsync_MapsInstrumentSchemas_BankTransfer()
    {
        // Arrange
        var mockProvider = CreateMockProvider("manual", "Manual", [
            CreatePaymentMethod("bank", "Bank Transfer", PaymentIntegrationType.DirectForm, methodType: "bank-transfer")
        ]);

        _providerManagerMock
            .Setup(x => x.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([mockProvider]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert
        handlers[0].InstrumentSchemas!.ShouldContain("bank_transfer_instrument");
    }

    [Fact]
    public async Task ExportHandlersAsync_MapsInstrumentSchemas_iDEAL()
    {
        // Arrange
        var mockProvider = CreateMockProvider("stripe", "Stripe", [
            CreatePaymentMethod("ideal", "iDEAL", PaymentIntegrationType.Redirect, methodType: "ideal")
        ]);

        _providerManagerMock
            .Setup(x => x.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([mockProvider]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert
        handlers[0].InstrumentSchemas!.ShouldContain("bank_transfer_instrument");
    }

    [Fact]
    public async Task ExportHandlersAsync_MapsInstrumentSchemas_Klarna()
    {
        // Arrange
        var mockProvider = CreateMockProvider("klarna", "Klarna", [
            CreatePaymentMethod("klarna", "Klarna", PaymentIntegrationType.Widget, methodType: "klarna")
        ]);

        _providerManagerMock
            .Setup(x => x.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([mockProvider]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert
        handlers[0].InstrumentSchemas!.ShouldContain("buy_now_pay_later_instrument");
    }

    [Fact]
    public async Task ExportHandlersAsync_SetsExpressCheckoutFlag()
    {
        // Arrange
        var mockProvider = CreateMockProvider("stripe", "Stripe", [
            CreatePaymentMethod("cards", "Cards", PaymentIntegrationType.HostedFields, isExpressCheckout: false),
            CreatePaymentMethod("applepay", "Apple Pay", PaymentIntegrationType.Widget, isExpressCheckout: true)
        ]);

        _providerManagerMock
            .Setup(x => x.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([mockProvider]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert
        handlers.First(h => h.HandlerId == "stripe:cards").SupportsExpressCheckout.ShouldBeFalse();
        handlers.First(h => h.HandlerId == "stripe:applepay").SupportsExpressCheckout.ShouldBeTrue();
    }

    [Fact]
    public async Task ExportHandlersAsync_WithMultipleProviders_ExportsAll()
    {
        // Arrange
        var stripeProvider = CreateMockProvider("stripe", "Stripe", [
            CreatePaymentMethod("cards", "Credit Card", PaymentIntegrationType.HostedFields)
        ]);
        var braintreeProvider = CreateMockProvider("braintree", "Braintree", [
            CreatePaymentMethod("cards", "Credit Card", PaymentIntegrationType.HostedFields),
            CreatePaymentMethod("paypal", "PayPal", PaymentIntegrationType.Widget, isExpressCheckout: true)
        ]);

        _providerManagerMock
            .Setup(x => x.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([stripeProvider, braintreeProvider]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert
        handlers.Count.ShouldBe(3);
        handlers.ShouldContain(h => h.HandlerId == "stripe:cards");
        handlers.ShouldContain(h => h.HandlerId == "braintree:cards");
        handlers.ShouldContain(h => h.HandlerId == "braintree:paypal");
    }

    [Fact]
    public async Task ExportHandlersAsync_UnknownMethodType_ReturnsNullInstrumentSchemas()
    {
        // Arrange
        var mockProvider = CreateMockProvider("custom", "Custom", [
            CreatePaymentMethod("custom", "Custom Method", PaymentIntegrationType.DirectForm, methodType: "unknown-type")
        ]);

        _providerManagerMock
            .Setup(x => x.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([mockProvider]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert
        handlers[0].InstrumentSchemas.ShouldBeNull();
    }

    [Fact]
    public async Task ExportHandlersAsync_ProviderThrowsException_ContinuesWithOthers()
    {
        // Arrange
        var goodProvider = CreateMockProvider("good", "Good Provider", [
            CreatePaymentMethod("method1", "Method 1", PaymentIntegrationType.Redirect)
        ]);

        var badProvider = CreateMockProviderThatThrows("bad", "Bad Provider");

        _providerManagerMock
            .Setup(x => x.GetEnabledProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([badProvider, goodProvider]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert - should have the handler from the good provider, not fail entirely
        handlers.Count.ShouldBe(1);
        handlers[0].HandlerId.ShouldBe("good:method1");
    }

    // Helper methods

    private static RegisteredPaymentProvider CreateMockProvider(
        string alias,
        string displayName,
        IReadOnlyList<PaymentMethodDefinition> methods)
    {
        var providerMock = new Mock<IPaymentProvider>();
        providerMock.Setup(p => p.Metadata).Returns(new PaymentProviderMetadata
        {
            Alias = alias,
            DisplayName = displayName
        });
        providerMock.Setup(p => p.GetAvailablePaymentMethods()).Returns(methods);

        var setting = new PaymentProviderSetting
        {
            ProviderAlias = alias,
            DisplayName = displayName,
            IsEnabled = true
        };

        return new RegisteredPaymentProvider(providerMock.Object, setting);
    }

    private static RegisteredPaymentProvider CreateMockProviderThatThrows(string alias, string displayName)
    {
        var providerMock = new Mock<IPaymentProvider>();
        providerMock.Setup(p => p.Metadata).Returns(new PaymentProviderMetadata
        {
            Alias = alias,
            DisplayName = displayName
        });
        providerMock.Setup(p => p.GetAvailablePaymentMethods()).Throws(new Exception("Provider error"));

        var setting = new PaymentProviderSetting
        {
            ProviderAlias = alias,
            DisplayName = displayName,
            IsEnabled = true
        };

        return new RegisteredPaymentProvider(providerMock.Object, setting);
    }

    private static PaymentMethodDefinition CreatePaymentMethod(
        string alias,
        string displayName,
        PaymentIntegrationType integrationType,
        string? methodType = null,
        bool isExpressCheckout = false)
    {
        return new PaymentMethodDefinition
        {
            Alias = alias,
            DisplayName = displayName,
            IntegrationType = integrationType,
            MethodType = methodType,
            IsExpressCheckout = isExpressCheckout
        };
    }
}

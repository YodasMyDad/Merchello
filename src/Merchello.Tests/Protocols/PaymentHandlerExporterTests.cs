using Merchello.Core.Payments.Dtos;
using Merchello.Core.Payments.Models;
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

        _providerManagerMock
            .Setup(x => x.GetCheckoutPaymentMethodsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _providerManagerMock
            .Setup(x => x.GetExpressCheckoutMethodsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
    }

    [Fact]
    public async Task ExportHandlersAsync_WithNoProviders_ReturnsEmpty()
    {
        // Arrange
        _providerManagerMock
            .Setup(x => x.GetCheckoutPaymentMethodsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _providerManagerMock
            .Setup(x => x.GetExpressCheckoutMethodsAsync(It.IsAny<CancellationToken>()))
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
        var method = CreatePaymentMethod("braintree", "cards", "Credit/Debit Card", PaymentIntegrationType.HostedFields);
        SetupMethods([method]);

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
        var cards = CreatePaymentMethod("stripe", "cards", "Credit/Debit Card", PaymentIntegrationType.HostedFields);
        var applePay = CreatePaymentMethod("stripe", "applepay", "Apple Pay", PaymentIntegrationType.Widget, methodType: PaymentMethodTypes.ApplePay, isExpressCheckout: true);
        var googlePay = CreatePaymentMethod("stripe", "googlepay", "Google Pay", PaymentIntegrationType.Widget, methodType: PaymentMethodTypes.GooglePay, isExpressCheckout: true);
        SetupMethods([cards], [applePay, googlePay]);

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
        var method = CreatePaymentMethod("paypal", "redirect", "PayPal", PaymentIntegrationType.Redirect);
        SetupMethods([method]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert
        handlers[0].Type.ShouldBe(ProtocolConstants.PaymentHandlerTypes.Redirect);
    }

    [Fact]
    public async Task ExportHandlersAsync_MapsIntegrationTypes_HostedFields()
    {
        // Arrange
        var method = CreatePaymentMethod("braintree", "cards", "Cards", PaymentIntegrationType.HostedFields);
        SetupMethods([method]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert
        handlers[0].Type.ShouldBe(ProtocolConstants.PaymentHandlerTypes.Tokenized);
    }

    [Fact]
    public async Task ExportHandlersAsync_MapsIntegrationTypes_Widget()
    {
        // Arrange
        var method = CreatePaymentMethod(
            "stripe",
            "applepay",
            "Apple Pay",
            PaymentIntegrationType.Widget,
            methodType: PaymentMethodTypes.ApplePay,
            isExpressCheckout: true);
        SetupMethods([method]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert
        handlers[0].Type.ShouldBe(ProtocolConstants.PaymentHandlerTypes.Wallet);
    }

    [Fact]
    public async Task ExportHandlersAsync_MapsIntegrationTypes_DirectForm()
    {
        // Arrange
        var method = CreatePaymentMethod("manual", "manual", "Manual Payment", PaymentIntegrationType.DirectForm);
        SetupMethods([method]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert
        handlers[0].Type.ShouldBe(ProtocolConstants.PaymentHandlerTypes.Form);
    }

    [Fact]
    public async Task ExportHandlersAsync_MapsInstrumentSchemas_Cards()
    {
        // Arrange
        var method = CreatePaymentMethod(
            "stripe",
            "cards",
            "Cards",
            PaymentIntegrationType.HostedFields,
            methodType: PaymentMethodTypes.Cards);
        SetupMethods([method]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert
        handlers[0].InstrumentSchemas!.ShouldContain("card_payment_instrument");
    }

    [Fact]
    public async Task ExportHandlersAsync_MapsInstrumentSchemas_ApplePay()
    {
        // Arrange
        var method = CreatePaymentMethod(
            "stripe",
            "applepay",
            "Apple Pay",
            PaymentIntegrationType.Widget,
            methodType: PaymentMethodTypes.ApplePay,
            isExpressCheckout: true);
        SetupMethods([method]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert
        handlers[0].InstrumentSchemas!.ShouldContain("wallet_instrument");
    }

    [Fact]
    public async Task ExportHandlersAsync_MapsInstrumentSchemas_GooglePay()
    {
        // Arrange
        var method = CreatePaymentMethod(
            "braintree",
            "googlepay",
            "Google Pay",
            PaymentIntegrationType.Widget,
            methodType: PaymentMethodTypes.GooglePay,
            isExpressCheckout: true);
        SetupMethods([method]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert
        handlers[0].InstrumentSchemas!.ShouldContain("wallet_instrument");
    }

    [Fact]
    public async Task ExportHandlersAsync_MapsInstrumentSchemas_PayPal()
    {
        // Arrange
        var method = CreatePaymentMethod(
            "paypal",
            "paypal",
            "PayPal",
            PaymentIntegrationType.Widget,
            methodType: PaymentMethodTypes.PayPal,
            isExpressCheckout: true);
        SetupMethods([method]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert
        handlers[0].InstrumentSchemas!.ShouldContain("wallet_instrument");
    }

    [Fact]
    public async Task ExportHandlersAsync_MapsInstrumentSchemas_BankTransfer()
    {
        // Arrange
        var method = CreatePaymentMethod(
            "manual",
            "bank",
            "Bank Transfer",
            PaymentIntegrationType.DirectForm,
            methodType: PaymentMethodTypes.BankTransfer);
        SetupMethods([method]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert
        handlers[0].InstrumentSchemas!.ShouldContain("bank_transfer_instrument");
    }

    [Fact]
    public async Task ExportHandlersAsync_MapsInstrumentSchemas_iDEAL()
    {
        // Arrange
        var method = CreatePaymentMethod(
            "stripe",
            "ideal",
            "iDEAL",
            PaymentIntegrationType.Redirect,
            methodType: "ideal");
        SetupMethods([method]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert
        handlers[0].InstrumentSchemas!.ShouldContain("bank_transfer_instrument");
    }

    [Fact]
    public async Task ExportHandlersAsync_MapsInstrumentSchemas_Klarna()
    {
        // Arrange
        var method = CreatePaymentMethod(
            "klarna",
            "klarna",
            "Klarna",
            PaymentIntegrationType.Widget,
            methodType: PaymentMethodTypes.BuyNowPayLater);
        SetupMethods([method]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert
        handlers[0].InstrumentSchemas!.ShouldContain("buy_now_pay_later_instrument");
    }

    [Fact]
    public async Task ExportHandlersAsync_SetsExpressCheckoutFlag()
    {
        // Arrange
        var cards = CreatePaymentMethod("stripe", "cards", "Cards", PaymentIntegrationType.HostedFields);
        var applePay = CreatePaymentMethod(
            "stripe",
            "applepay",
            "Apple Pay",
            PaymentIntegrationType.Widget,
            methodType: PaymentMethodTypes.ApplePay,
            isExpressCheckout: true);
        SetupMethods([cards, applePay]);

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
        var stripeCards = CreatePaymentMethod("stripe", "cards", "Credit Card", PaymentIntegrationType.HostedFields);
        var braintreeCards = CreatePaymentMethod("braintree", "cards", "Credit Card", PaymentIntegrationType.HostedFields);
        var braintreePaypal = CreatePaymentMethod(
            "braintree",
            "paypal",
            "PayPal",
            PaymentIntegrationType.Widget,
            methodType: PaymentMethodTypes.PayPal,
            isExpressCheckout: true);
        SetupMethods([stripeCards, braintreeCards, braintreePaypal]);

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
        var method = CreatePaymentMethod(
            "custom",
            "custom",
            "Custom Method",
            PaymentIntegrationType.DirectForm,
            methodType: "unknown-type");
        SetupMethods([method]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert
        handlers[0].InstrumentSchemas.ShouldBeNull();
    }

    [Fact]
    public async Task ExportHandlersAsync_DeduplicatesMethodsAcrossCheckoutAndExpress()
    {
        // Arrange
        var method = CreatePaymentMethod("stripe", "cards", "Cards", PaymentIntegrationType.HostedFields);
        SetupMethods([method], [method]);

        // Act
        var handlers = await _exporter.ExportHandlersAsync("ucp");

        // Assert - should only contain one handler after deduplication
        handlers.Count.ShouldBe(1);
        handlers[0].HandlerId.ShouldBe("stripe:cards");
    }

    // Helper methods

    private void SetupMethods(
        IReadOnlyCollection<PaymentMethodDto> checkout,
        IReadOnlyCollection<PaymentMethodDto>? express = null)
    {
        _providerManagerMock
            .Setup(x => x.GetCheckoutPaymentMethodsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(checkout);
        _providerManagerMock
            .Setup(x => x.GetExpressCheckoutMethodsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(express ?? []);
    }

    private static PaymentMethodDto CreatePaymentMethod(
        string providerAlias,
        string methodAlias,
        string displayName,
        PaymentIntegrationType integrationType,
        string? methodType = null,
        bool isExpressCheckout = false)
    {
        return new PaymentMethodDto
        {
            ProviderAlias = providerAlias,
            MethodAlias = methodAlias,
            DisplayName = displayName,
            IntegrationType = integrationType,
            MethodType = methodType,
            IsExpressCheckout = isExpressCheckout,
            ShowInCheckout = true
        };
    }
}

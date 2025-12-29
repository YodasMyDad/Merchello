using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Merchello.Core.Notifications;
using Merchello.Core.Payments.Factories;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers;
using Merchello.Core.Payments.Services;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.Payments;

/// <summary>
/// Tests for the PaymentService.CalculatePaymentStatus method.
/// This is the single source of truth for payment status calculations.
/// </summary>
public class PaymentStatusCalculationTests
{
    private readonly PaymentService _paymentService;
    private readonly string _currencyCode = "USD";

    public PaymentStatusCalculationTests()
    {
        var providerManagerMock = new Mock<IPaymentProviderManager>();
        var scopeProviderMock = new Mock<IEFCoreScopeProvider<MerchelloDbContext>>();
        var settings = Options.Create(new MerchelloSettings
        {
            DefaultRounding = MidpointRounding.AwayFromZero,
            StoreCurrencyCode = "USD"
        });
        var loggerMock = new Mock<ILogger<PaymentService>>();
        var notificationPublisherMock = new Mock<IMerchelloNotificationPublisher>();
        var currencyService = new CurrencyService(settings);
        var paymentFactory = new PaymentFactory(currencyService);

        var memoryCacheMock = new Mock<IMemoryCache>();

        _paymentService = new PaymentService(
            providerManagerMock.Object,
            scopeProviderMock.Object,
            paymentFactory,
            currencyService,
            notificationPublisherMock.Object,
            memoryCacheMock.Object,
            settings,
            loggerMock.Object);
    }

    #region Basic Status Tests

    [Fact]
    public void CalculatePaymentStatus_WithNoPayments_ReturnsUnpaid()
    {
        // Arrange
        var payments = new List<Payment>();
        var invoiceTotal = 100m;

        // Act
        var result = _paymentService.CalculatePaymentStatus(payments, invoiceTotal, _currencyCode);

        // Assert
        result.Status.ShouldBe(InvoicePaymentStatus.Unpaid);
        result.TotalPaid.ShouldBe(0m);
        result.TotalRefunded.ShouldBe(0m);
        result.NetPayment.ShouldBe(0m);
        result.BalanceDue.ShouldBe(100m);
    }

    [Fact]
    public void CalculatePaymentStatus_WithPartialPayment_ReturnsPartiallyPaid()
    {
        // Arrange
        var payments = new List<Payment>
        {
            CreatePayment(50m, PaymentType.Payment, success: true)
        };
        var invoiceTotal = 100m;

        // Act
        var result = _paymentService.CalculatePaymentStatus(payments, invoiceTotal, _currencyCode);

        // Assert
        result.Status.ShouldBe(InvoicePaymentStatus.PartiallyPaid);
        result.TotalPaid.ShouldBe(50m);
        result.NetPayment.ShouldBe(50m);
        result.BalanceDue.ShouldBe(50m);
    }

    [Fact]
    public void CalculatePaymentStatus_WithFullPayment_ReturnsPaid()
    {
        // Arrange
        var payments = new List<Payment>
        {
            CreatePayment(100m, PaymentType.Payment, success: true)
        };
        var invoiceTotal = 100m;

        // Act
        var result = _paymentService.CalculatePaymentStatus(payments, invoiceTotal, _currencyCode);

        // Assert
        result.Status.ShouldBe(InvoicePaymentStatus.Paid);
        result.TotalPaid.ShouldBe(100m);
        result.NetPayment.ShouldBe(100m);
        result.BalanceDue.ShouldBe(0m);
    }

    [Fact]
    public void CalculatePaymentStatus_WithOverpayment_ReturnsPaid()
    {
        // Arrange
        var payments = new List<Payment>
        {
            CreatePayment(120m, PaymentType.Payment, success: true)
        };
        var invoiceTotal = 100m;

        // Act
        var result = _paymentService.CalculatePaymentStatus(payments, invoiceTotal, _currencyCode);

        // Assert
        result.Status.ShouldBe(InvoicePaymentStatus.Paid);
        result.TotalPaid.ShouldBe(120m);
        result.NetPayment.ShouldBe(120m);
        result.BalanceDue.ShouldBe(0m); // System caps balance at 0
    }

    #endregion

    #region Refund Tests

    [Fact]
    public void CalculatePaymentStatus_WithFullRefund_ReturnsRefunded()
    {
        // Arrange
        var payments = new List<Payment>
        {
            CreatePayment(100m, PaymentType.Payment, success: true),
            CreatePayment(-100m, PaymentType.Refund, success: true)
        };
        var invoiceTotal = 100m;

        // Act
        var result = _paymentService.CalculatePaymentStatus(payments, invoiceTotal, _currencyCode);

        // Assert
        result.Status.ShouldBe(InvoicePaymentStatus.Refunded);
        result.TotalPaid.ShouldBe(100m);
        result.TotalRefunded.ShouldBe(100m);
        result.NetPayment.ShouldBe(0m);
        result.BalanceDue.ShouldBe(100m); // Full amount now due again
    }

    [Fact]
    public void CalculatePaymentStatus_WithPartialRefund_ReturnsPartiallyRefunded()
    {
        // Arrange
        var payments = new List<Payment>
        {
            CreatePayment(100m, PaymentType.Payment, success: true),
            CreatePayment(-30m, PaymentType.PartialRefund, success: true)
        };
        var invoiceTotal = 100m;

        // Act
        var result = _paymentService.CalculatePaymentStatus(payments, invoiceTotal, _currencyCode);

        // Assert
        result.Status.ShouldBe(InvoicePaymentStatus.PartiallyRefunded);
        result.TotalPaid.ShouldBe(100m);
        result.TotalRefunded.ShouldBe(30m);
        result.NetPayment.ShouldBe(70m);
        result.BalanceDue.ShouldBe(30m);
    }

    [Fact]
    public void CalculatePaymentStatus_WithMultiplePartialRefunds_CalculatesCorrectly()
    {
        // Arrange
        var payments = new List<Payment>
        {
            CreatePayment(100m, PaymentType.Payment, success: true),
            CreatePayment(-20m, PaymentType.PartialRefund, success: true),
            CreatePayment(-15m, PaymentType.PartialRefund, success: true)
        };
        var invoiceTotal = 100m;

        // Act
        var result = _paymentService.CalculatePaymentStatus(payments, invoiceTotal, _currencyCode);

        // Assert
        result.Status.ShouldBe(InvoicePaymentStatus.PartiallyRefunded);
        result.TotalPaid.ShouldBe(100m);
        result.TotalRefunded.ShouldBe(35m);
        result.NetPayment.ShouldBe(65m);
        result.BalanceDue.ShouldBe(35m);
    }

    #endregion

    #region Pending Payment Tests

    [Fact]
    public void CalculatePaymentStatus_WithPendingPayment_ReturnsUnpaid()
    {
        // Arrange - Payment exists but is not yet successful
        var payments = new List<Payment>
        {
            CreatePayment(100m, PaymentType.Payment, success: false)
        };
        var invoiceTotal = 100m;

        // Act
        var result = _paymentService.CalculatePaymentStatus(payments, invoiceTotal, _currencyCode);

        // Assert - Unsuccessful payments are treated as if no payment exists
        result.Status.ShouldBe(InvoicePaymentStatus.Unpaid);
        result.TotalPaid.ShouldBe(0m); // Pending payments don't count
        result.BalanceDue.ShouldBe(100m);
    }

    [Fact]
    public void CalculatePaymentStatus_WithMixedSuccessAndPending_CalculatesCorrectly()
    {
        // Arrange - One successful partial, one pending
        var payments = new List<Payment>
        {
            CreatePayment(50m, PaymentType.Payment, success: true),
            CreatePayment(50m, PaymentType.Payment, success: false) // Pending
        };
        var invoiceTotal = 100m;

        // Act
        var result = _paymentService.CalculatePaymentStatus(payments, invoiceTotal, _currencyCode);

        // Assert
        result.Status.ShouldBe(InvoicePaymentStatus.PartiallyPaid);
        result.TotalPaid.ShouldBe(50m); // Only successful payment counted
        result.BalanceDue.ShouldBe(50m);
    }

    #endregion

    #region Multiple Payments Tests

    [Fact]
    public void CalculatePaymentStatus_WithMultiplePaymentsEqualingTotal_ReturnsPaid()
    {
        // Arrange
        var payments = new List<Payment>
        {
            CreatePayment(30m, PaymentType.Payment, success: true),
            CreatePayment(40m, PaymentType.Payment, success: true),
            CreatePayment(30m, PaymentType.Payment, success: true)
        };
        var invoiceTotal = 100m;

        // Act
        var result = _paymentService.CalculatePaymentStatus(payments, invoiceTotal, _currencyCode);

        // Assert
        result.Status.ShouldBe(InvoicePaymentStatus.Paid);
        result.TotalPaid.ShouldBe(100m);
        result.NetPayment.ShouldBe(100m);
        result.BalanceDue.ShouldBe(0m);
    }

    [Fact]
    public void CalculatePaymentStatus_WithPaymentThenRefundThenRepayment_CalculatesCorrectly()
    {
        // Arrange - Customer paid, got refund, then paid again
        var payments = new List<Payment>
        {
            CreatePayment(100m, PaymentType.Payment, success: true),
            CreatePayment(-100m, PaymentType.Refund, success: true),
            CreatePayment(100m, PaymentType.Payment, success: true)
        };
        var invoiceTotal = 100m;

        // Act
        var result = _paymentService.CalculatePaymentStatus(payments, invoiceTotal, _currencyCode);

        // Assert - System treats this as PartiallyRefunded because a refund exists
        result.Status.ShouldBe(InvoicePaymentStatus.PartiallyRefunded);
        result.TotalPaid.ShouldBe(200m); // Total of all payments
        result.TotalRefunded.ShouldBe(100m);
        result.NetPayment.ShouldBe(100m);
        result.BalanceDue.ShouldBe(0m);
    }

    #endregion

    #region Status Display Tests

    [Fact]
    public void CalculatePaymentStatus_SetsCorrectStatusDisplay()
    {
        // Arrange
        var payments = new List<Payment>
        {
            CreatePayment(50m, PaymentType.Payment, success: true)
        };
        var invoiceTotal = 100m;

        // Act
        var result = _paymentService.CalculatePaymentStatus(payments, invoiceTotal, _currencyCode);

        // Assert
        result.StatusDisplay.ShouldBe("Partially Paid");
    }

    [Theory]
    [InlineData(InvoicePaymentStatus.Paid, "Paid")]
    [InlineData(InvoicePaymentStatus.Unpaid, "Unpaid")]
    [InlineData(InvoicePaymentStatus.PartiallyPaid, "Partially Paid")]
    [InlineData(InvoicePaymentStatus.Refunded, "Refunded")]
    [InlineData(InvoicePaymentStatus.PartiallyRefunded, "Partially Refunded")]
    [InlineData(InvoicePaymentStatus.AwaitingPayment, "Awaiting Payment")]
    public void GetStatusDisplay_ReturnsCorrectText(InvoicePaymentStatus status, string expected)
    {
        // Act
        var display = PaymentStatusDetails.GetStatusDisplay(status);

        // Assert
        display.ShouldBe(expected);
    }

    #endregion

    #region Risk Score Tests

    [Fact]
    public void CalculatePaymentStatus_WithRiskScore_ReturnsMaxRiskScore()
    {
        // Arrange
        var payments = new List<Payment>
        {
            CreatePayment(50m, PaymentType.Payment, success: true, riskScore: 30m),
            CreatePayment(50m, PaymentType.Payment, success: true, riskScore: 75m)
        };
        var invoiceTotal = 100m;

        // Act
        var result = _paymentService.CalculatePaymentStatus(payments, invoiceTotal, _currencyCode);

        // Assert
        result.MaxRiskScore.ShouldBe(75m);
        result.RiskLevel.ShouldBe("high"); // >= 75
    }

    [Theory]
    [InlineData(80, "high")]
    [InlineData(75, "high")]
    [InlineData(60, "medium")]
    [InlineData(50, "medium")]
    [InlineData(30, "low")]
    [InlineData(25, "low")]
    [InlineData(10, "minimal")]
    [InlineData(0, "minimal")]
    public void GetRiskLevel_ReturnsCorrectClassification(decimal riskScore, string expectedLevel)
    {
        // Act
        var level = PaymentStatusDetails.GetRiskLevel(riskScore);

        // Assert
        level.ShouldBe(expectedLevel);
    }

    [Fact]
    public void GetRiskLevel_WithNull_ReturnsNull()
    {
        // Act
        var level = PaymentStatusDetails.GetRiskLevel(null);

        // Assert
        level.ShouldBeNull();
    }

    #endregion

    #region Zero Invoice Total Tests

    [Fact]
    public void CalculatePaymentStatus_WithZeroTotal_AndNoPayments_ReturnsPaid()
    {
        // Arrange - Free order
        var payments = new List<Payment>();
        var invoiceTotal = 0m;

        // Act
        var result = _paymentService.CalculatePaymentStatus(payments, invoiceTotal, _currencyCode);

        // Assert
        result.Status.ShouldBe(InvoicePaymentStatus.Paid); // No payment needed
        result.BalanceDue.ShouldBe(0m);
    }

    #endregion

    #region Currency Rounding Tests

    [Fact]
    public void CalculatePaymentStatus_WithJPY_RoundsToWholeNumber()
    {
        // Arrange - JPY has 0 decimal places
        var payments = new List<Payment>
        {
            CreatePayment(99m, PaymentType.Payment, success: true)
        };
        var invoiceTotal = 100m;

        // Act
        var result = _paymentService.CalculatePaymentStatus(payments, invoiceTotal, "JPY");

        // Assert
        result.TotalPaid.ShouldBe(99m);
        result.BalanceDue.ShouldBe(1m);
    }

    #endregion

    #region Multi-Currency Tests

    [Fact]
    public void CalculatePaymentStatus_WithStoreCurrency_CalculatesBothCurrencies()
    {
        // Arrange - EUR invoice with USD store currency
        var payments = new List<Payment>
        {
            CreatePayment(85m, PaymentType.Payment, success: true, storeCurrencyAmount: 100m)
        };
        var invoiceTotal = 85m; // EUR
        var invoiceTotalInStoreCurrency = 100m; // USD

        // Act
        var result = _paymentService.CalculatePaymentStatus(
            payments,
            invoiceTotal,
            "EUR",
            invoiceTotalInStoreCurrency,
            "USD");

        // Assert
        result.Status.ShouldBe(InvoicePaymentStatus.Paid);
        result.TotalPaid.ShouldBe(85m);
        result.BalanceDue.ShouldBe(0m);
        result.TotalPaidInStoreCurrency.ShouldBe(100m);
        result.BalanceDueInStoreCurrency.ShouldBe(0m);
    }

    [Fact]
    public void CalculatePaymentStatus_WithPartialMultiCurrencyPayment_CalculatesBothBalances()
    {
        // Arrange - EUR invoice, partial payment
        var payments = new List<Payment>
        {
            CreatePayment(42.5m, PaymentType.Payment, success: true, storeCurrencyAmount: 50m)
        };
        var invoiceTotal = 85m; // EUR
        var invoiceTotalInStoreCurrency = 100m; // USD

        // Act
        var result = _paymentService.CalculatePaymentStatus(
            payments,
            invoiceTotal,
            "EUR",
            invoiceTotalInStoreCurrency,
            "USD");

        // Assert
        result.Status.ShouldBe(InvoicePaymentStatus.PartiallyPaid);
        result.TotalPaid.ShouldBe(42.5m);
        result.BalanceDue.ShouldBe(42.5m);
        result.TotalPaidInStoreCurrency.ShouldBe(50m);
        result.BalanceDueInStoreCurrency.ShouldBe(50m);
    }

    #endregion

    #region Edge Cases

    [Fact]
    public void CalculatePaymentStatus_WithNegativeInvoiceTotal_HandlesGracefully()
    {
        // Arrange - Credit note scenario
        var payments = new List<Payment>();
        var invoiceTotal = -50m;

        // Act
        var result = _paymentService.CalculatePaymentStatus(payments, invoiceTotal, _currencyCode);

        // Assert - System treats negative total as paid (balance capped at 0)
        result.BalanceDue.ShouldBe(0m);
    }

    [Fact]
    public void CalculatePaymentStatus_IgnoresFailedRefunds()
    {
        // Arrange
        var payments = new List<Payment>
        {
            CreatePayment(100m, PaymentType.Payment, success: true),
            CreatePayment(-50m, PaymentType.Refund, success: false) // Failed refund
        };
        var invoiceTotal = 100m;

        // Act
        var result = _paymentService.CalculatePaymentStatus(payments, invoiceTotal, _currencyCode);

        // Assert
        result.Status.ShouldBe(InvoicePaymentStatus.Paid);
        result.TotalRefunded.ShouldBe(0m); // Failed refund not counted
        result.NetPayment.ShouldBe(100m);
    }

    #endregion

    #region Helper Methods

    private static Payment CreatePayment(
        decimal amount,
        PaymentType paymentType,
        bool success,
        decimal? riskScore = null,
        decimal? storeCurrencyAmount = null)
    {
        return new Payment
        {
            Id = Guid.NewGuid(),
            InvoiceId = Guid.NewGuid(),
            Amount = amount,
            PaymentType = paymentType,
            PaymentSuccess = success,
            RiskScore = riskScore,
            RiskScoreSource = riskScore.HasValue ? "test" : null,
            AmountInStoreCurrency = storeCurrencyAmount,
            DateCreated = DateTime.UtcNow
        };
    }

    #endregion
}

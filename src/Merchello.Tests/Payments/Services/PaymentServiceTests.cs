using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Merchello.Core.Payments.Factories;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers;
using Merchello.Core.Payments.Services;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.Payments.Services;

public class PaymentServiceTests
{
    private readonly Mock<IPaymentProviderManager> _providerManagerMock;
    private readonly Mock<IEFCoreScopeProvider<MerchelloDbContext>> _scopeProviderMock;
    private readonly Mock<IOptions<MerchelloSettings>> _settingsMock;
    private readonly Mock<ILogger<PaymentService>> _loggerMock;
    private readonly CurrencyService _currencyService;
    private readonly PaymentFactory _paymentFactory;

    public PaymentServiceTests()
    {
        _providerManagerMock = new Mock<IPaymentProviderManager>();
        _scopeProviderMock = new Mock<IEFCoreScopeProvider<MerchelloDbContext>>();
        _settingsMock = new Mock<IOptions<MerchelloSettings>>();
        _settingsMock.Setup(s => s.Value).Returns(new MerchelloSettings());
        _loggerMock = new Mock<ILogger<PaymentService>>();
        _currencyService = new CurrencyService(_settingsMock.Object);
        _paymentFactory = new PaymentFactory(_currencyService);
    }

    private PaymentService CreateService() =>
        new(_providerManagerMock.Object, _scopeProviderMock.Object, _paymentFactory, _currencyService, _settingsMock.Object, _loggerMock.Object);

    #region ProcessRefundAsync Tests

    [Fact]
    public async Task ProcessRefundAsync_RefundingARefund_ReturnsError()
    {
        // Arrange
        var paymentId = Guid.NewGuid();
        var refundPayment = new Payment
        {
            Id = paymentId,
            InvoiceId = Guid.NewGuid(),
            Amount = -50m,
            PaymentType = PaymentType.Refund, // This is a refund, not a payment
            PaymentSuccess = true,
            PaymentProviderAlias = "manual"
        };

        SetupScopeForPaymentLookup(refundPayment);

        var service = CreateService();

        // Act
        var result = await service.ProcessRefundAsync(paymentId, 25m, "Test refund");

        // Assert
        result.ResultObject.ShouldBeNull();
        result.Messages.ShouldNotBeNull();
        result.Messages!.ShouldContain(m => m.Message != null && m.Message.Contains("Cannot refund a refund"));
    }

    [Fact]
    public async Task ProcessRefundAsync_AmountExceedsRefundable_ReturnsError()
    {
        // Arrange
        var paymentId = Guid.NewGuid();
        var originalPayment = new Payment
        {
            Id = paymentId,
            InvoiceId = Guid.NewGuid(),
            Amount = 100m,
            PaymentType = PaymentType.Payment,
            PaymentSuccess = true,
            PaymentProviderAlias = "manual",
            Refunds = new List<Payment>
            {
                new() { Amount = -30m, PaymentType = PaymentType.PartialRefund } // Already refunded 30
            }
        };

        SetupScopeForPaymentLookup(originalPayment);

        var service = CreateService();

        // Act - try to refund 80 when only 70 is refundable (100 - 30)
        var result = await service.ProcessRefundAsync(paymentId, 80m, "Test refund");

        // Assert
        result.ResultObject.ShouldBeNull();
        result.Messages.ShouldNotBeNull();
        result.Messages!.ShouldContain(m => m.Message != null && m.Message.Contains("exceeds refundable amount"));
    }

    [Fact]
    public async Task ProcessRefundAsync_PartialRefund_ProviderDoesNotSupportPartial_ReturnsError()
    {
        // Arrange
        var paymentId = Guid.NewGuid();
        var originalPayment = new Payment
        {
            Id = paymentId,
            InvoiceId = Guid.NewGuid(),
            Amount = 100m,
            PaymentType = PaymentType.Payment,
            PaymentSuccess = true,
            PaymentProviderAlias = "no-partial-refund-provider",
            Refunds = null
        };

        SetupScopeForPaymentLookup(originalPayment);

        // Setup provider that supports refunds but NOT partial refunds
        var providerMock = new Mock<IPaymentProvider>();
        providerMock.Setup(p => p.Metadata).Returns(new PaymentProviderMetadata
        {
            Alias = "no-partial-refund-provider",
            DisplayName = "No Partial Refund Provider",
            SupportsRefunds = true,
            SupportsPartialRefunds = false // Key: doesn't support partial
        });

        var registeredProvider = new RegisteredPaymentProvider(providerMock.Object, null);
        _providerManagerMock
            .Setup(m => m.GetProviderAsync("no-partial-refund-provider", false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(registeredProvider);

        var service = CreateService();

        // Act - try partial refund of 50 on 100 payment
        var result = await service.ProcessRefundAsync(paymentId, 50m, "Partial refund");

        // Assert
        result.ResultObject.ShouldBeNull();
        result.Messages.ShouldNotBeNull();
        result.Messages!.ShouldContain(m => m.Message != null && m.Message.Contains("does not support partial refunds"));
    }

    #endregion

    #region GetInvoicePaymentStatusAsync Tests

    [Fact]
    public async Task GetInvoicePaymentStatusAsync_FullPayment_ReturnsPaid()
    {
        // Arrange
        var invoiceId = Guid.NewGuid();
        var invoiceTotal = 100m;
        var payments = new List<Payment>
        {
            new() { Amount = 100m, PaymentType = PaymentType.Payment, PaymentSuccess = true }
        };

        SetupScopeForStatusCalculation(invoiceId, invoiceTotal, payments);

        var service = CreateService();

        // Act
        var status = await service.GetInvoicePaymentStatusAsync(invoiceId);

        // Assert
        status.ShouldBe(InvoicePaymentStatus.Paid);
    }

    [Fact]
    public async Task GetInvoicePaymentStatusAsync_PartialPayment_ReturnsPartiallyPaid()
    {
        // Arrange
        var invoiceId = Guid.NewGuid();
        var invoiceTotal = 100m;
        var payments = new List<Payment>
        {
            new() { Amount = 40m, PaymentType = PaymentType.Payment, PaymentSuccess = true }
        };

        SetupScopeForStatusCalculation(invoiceId, invoiceTotal, payments);

        var service = CreateService();

        // Act
        var status = await service.GetInvoicePaymentStatusAsync(invoiceId);

        // Assert
        status.ShouldBe(InvoicePaymentStatus.PartiallyPaid);
    }

    [Fact]
    public async Task GetInvoicePaymentStatusAsync_FullRefund_ReturnsRefunded()
    {
        // Arrange
        var invoiceId = Guid.NewGuid();
        var invoiceTotal = 100m;
        var payments = new List<Payment>
        {
            new() { Amount = 100m, PaymentType = PaymentType.Payment, PaymentSuccess = true },
            new() { Amount = -100m, PaymentType = PaymentType.Refund, PaymentSuccess = true }
        };

        SetupScopeForStatusCalculation(invoiceId, invoiceTotal, payments);

        var service = CreateService();

        // Act
        var status = await service.GetInvoicePaymentStatusAsync(invoiceId);

        // Assert
        status.ShouldBe(InvoicePaymentStatus.Refunded);
    }

    [Fact]
    public async Task GetInvoicePaymentStatusAsync_PartialRefund_ReturnsPartiallyRefunded()
    {
        // Arrange
        var invoiceId = Guid.NewGuid();
        var invoiceTotal = 100m;
        var payments = new List<Payment>
        {
            new() { Amount = 100m, PaymentType = PaymentType.Payment, PaymentSuccess = true },
            new() { Amount = -30m, PaymentType = PaymentType.PartialRefund, PaymentSuccess = true }
        };

        SetupScopeForStatusCalculation(invoiceId, invoiceTotal, payments);

        var service = CreateService();

        // Act
        var status = await service.GetInvoicePaymentStatusAsync(invoiceId);

        // Assert
        status.ShouldBe(InvoicePaymentStatus.PartiallyRefunded);
    }

    #endregion

    #region CreatePaymentSessionAsync Tests

    [Fact]
    public async Task CreatePaymentSessionAsync_ProviderNotEnabled_ReturnsFailedResult()
    {
        // Arrange
        var invoiceId = Guid.NewGuid();
        _providerManagerMock
            .Setup(m => m.GetProviderAsync("disabled-provider", true, It.IsAny<CancellationToken>()))
            .ReturnsAsync((RegisteredPaymentProvider?)null);

        var service = CreateService();

        // Act
        var result = await service.CreatePaymentSessionAsync(
            new CreatePaymentSessionParameters
            {
                InvoiceId = invoiceId,
                ProviderAlias = "disabled-provider",
                ReturnUrl = "https://return.url",
                CancelUrl = "https://cancel.url"
            });

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldNotBeNull();
        result.ErrorMessage!.ShouldContain("not available or not enabled");
    }

    #endregion

    #region Helper Methods for Mocking EF Core Scope Provider

    private void SetupScopeForPaymentLookup(Payment payment)
    {
        var scopeMock = new Mock<IEfCoreScope<MerchelloDbContext>>();

        // For ProcessRefundAsync, the ExecuteWithContextAsync call returns the payment
        scopeMock
            .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Payment?>>>()))
            .ReturnsAsync(payment);

        // For the second call (recording refund), we need to handle the Task callback
        scopeMock
            .Setup(s => s.ExecuteWithContextAsync<Task>(It.IsAny<Func<MerchelloDbContext, Task>>()))
            .Returns(Task.CompletedTask);

        scopeMock.Setup(s => s.Complete());

        _scopeProviderMock
            .Setup(p => p.CreateScope())
            .Returns(scopeMock.Object);
    }

    private void SetupScopeForStatusCalculation(Guid invoiceId, decimal invoiceTotal, List<Payment> payments, string currencyCode = "USD")
    {
        var scopeMock = new Mock<IEfCoreScope<MerchelloDbContext>>();

        // GetInvoicePaymentStatusAsync returns a tuple of (InvoiceTotal, CurrencyCode, Payments)
        var statusInfo = (InvoiceTotal: invoiceTotal, CurrencyCode: currencyCode, Payments: payments);

        scopeMock
            .Setup(s => s.ExecuteWithContextAsync(
                It.IsAny<Func<MerchelloDbContext, Task<(decimal InvoiceTotal, string CurrencyCode, List<Payment> Payments)>>>()))
            .ReturnsAsync(statusInfo);

        scopeMock.Setup(s => s.Complete());

        _scopeProviderMock
            .Setup(p => p.CreateScope())
            .Returns(scopeMock.Object);
    }

    #endregion
}

using Merchello.Core.Data;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Payments.Factories;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers;
using Merchello.Core.Payments.Providers.Interfaces;
using Merchello.Core.Payments.Services;
using Merchello.Core.Payments.Services.Interfaces;
using Merchello.Core.Payments.Services.Parameters;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shared.RateLimiting.Interfaces;
using Merchello.Core.Shared.Services.Interfaces;
using Merchello.Tests.TestInfrastructure;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.Payments.Services;

[Collection("Integration Tests")]
public class PaymentServiceTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IPaymentService _paymentService;

    public PaymentServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _paymentService = fixture.GetService<IPaymentService>();
    }

    /// <summary>
    /// Creates a PaymentService with a custom provider manager for tests needing specific provider behaviour.
    /// All other dependencies use real implementations from the fixture.
    /// </summary>
    private PaymentService CreateServiceWithCustomProvider(IPaymentProviderManager providerManager) =>
        new(
            providerManager,
            _fixture.GetService<IEFCoreScopeProvider<MerchelloDbContext>>(),
            _fixture.GetService<PaymentFactory>(),
            _fixture.GetService<ICurrencyService>(),
            _fixture.GetService<IMerchelloNotificationPublisher>(),
            _fixture.GetService<IRateLimiter>(),
            _fixture.GetService<IPaymentIdempotencyService>(),
            _fixture.GetService<IOptions<MerchelloSettings>>(),
            NullLogger<PaymentService>.Instance);

    #region ProcessRefundAsync Tests

    [Fact]
    public async Task ProcessRefundAsync_RefundingARefund_ReturnsError()
    {
        // Arrange - create invoice, record payment, process a real refund
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoice(total: 100m);
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var paymentResult = await _paymentService.RecordPaymentAsync(new RecordPaymentParameters
        {
            InvoiceId = invoice.Id,
            ProviderAlias = "manual",
            TransactionId = $"txn-{Guid.NewGuid()}",
            Amount = 100m
        });
        paymentResult.Successful.ShouldBeTrue();
        var payment = paymentResult.ResultObject!;
        _fixture.DbContext.ChangeTracker.Clear();

        // Process a real refund
        var refundResult = await _paymentService.ProcessRefundAsync(new ProcessRefundParameters
        {
            PaymentId = payment.Id,
            Amount = 50m,
            Reason = "Partial refund"
        });
        refundResult.Successful.ShouldBeTrue();
        var refundPayment = refundResult.ResultObject!;
        _fixture.DbContext.ChangeTracker.Clear();

        // Act - try to refund the refund
        var result = await _paymentService.ProcessRefundAsync(new ProcessRefundParameters
        {
            PaymentId = refundPayment.Id,
            Amount = 25m,
            Reason = "Test refund of refund"
        });

        // Assert
        result.ResultObject.ShouldBeNull();
        result.Messages.ShouldNotBeNull();
        result.Messages!.ShouldContain(m => m.Message != null && m.Message.Contains("Cannot refund a refund"));
    }

    [Fact]
    public async Task ProcessRefundAsync_AmountExceedsRefundable_ReturnsError()
    {
        // Arrange - create invoice, pay 100, refund 30
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoice(total: 100m);
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var paymentResult = await _paymentService.RecordPaymentAsync(new RecordPaymentParameters
        {
            InvoiceId = invoice.Id,
            ProviderAlias = "manual",
            TransactionId = $"txn-{Guid.NewGuid()}",
            Amount = 100m
        });
        paymentResult.Successful.ShouldBeTrue();
        var payment = paymentResult.ResultObject!;
        _fixture.DbContext.ChangeTracker.Clear();

        // Refund 30 first
        var firstRefund = await _paymentService.ProcessRefundAsync(new ProcessRefundParameters
        {
            PaymentId = payment.Id,
            Amount = 30m,
            Reason = "First refund"
        });
        firstRefund.Successful.ShouldBeTrue();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act - try to refund 80 when only 70 is refundable (100 - 30)
        var result = await _paymentService.ProcessRefundAsync(new ProcessRefundParameters
        {
            PaymentId = payment.Id,
            Amount = 80m,
            Reason = "Second refund"
        });

        // Assert
        result.ResultObject.ShouldBeNull();
        result.Messages.ShouldNotBeNull();
        result.Messages!.ShouldContain(m => m.Message != null && m.Message.Contains("exceeds refundable amount"));
    }

    [Fact]
    public async Task ProcessRefundAsync_PartialRefund_ProviderDoesNotSupportPartial_ReturnsError()
    {
        // Arrange - create invoice and insert payment with a custom provider alias
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoice(total: 100m);
        var payment = dataBuilder.CreatePayment(invoice, amount: 100m);
        payment.PaymentProviderAlias = "no-partial-provider";
        payment.PaymentSuccess = true;
        payment.PaymentType = PaymentType.Payment;
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Setup provider that supports refunds but NOT partial refunds
        var providerMock = new Mock<IPaymentProvider>();
        providerMock.Setup(p => p.Metadata).Returns(new PaymentProviderMetadata
        {
            Alias = "no-partial-provider",
            DisplayName = "No Partial Refund Provider",
            SupportsRefunds = true,
            SupportsPartialRefunds = false
        });

        var registered = new RegisteredPaymentProvider(providerMock.Object, null);
        var pmMock = new Mock<IPaymentProviderManager>();
        pmMock.Setup(m => m.GetProviderAsync("no-partial-provider", false, It.IsAny<CancellationToken>()))
              .ReturnsAsync(registered);

        var service = CreateServiceWithCustomProvider(pmMock.Object);

        // Act - try partial refund of 50 on 100 payment
        var result = await service.ProcessRefundAsync(new ProcessRefundParameters
        {
            PaymentId = payment.Id,
            Amount = 50m,
            Reason = "Partial refund"
        });

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
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoice(total: 100m);
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        await _paymentService.RecordPaymentAsync(new RecordPaymentParameters
        {
            InvoiceId = invoice.Id,
            ProviderAlias = "manual",
            TransactionId = $"txn-{Guid.NewGuid()}",
            Amount = 100m
        });
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var status = await _paymentService.GetInvoicePaymentStatusAsync(invoice.Id);

        // Assert
        status.ShouldBe(InvoicePaymentStatus.Paid);
    }

    [Fact]
    public async Task GetInvoicePaymentStatusAsync_PartialPayment_ReturnsPartiallyPaid()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoice(total: 100m);
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        await _paymentService.RecordPaymentAsync(new RecordPaymentParameters
        {
            InvoiceId = invoice.Id,
            ProviderAlias = "manual",
            TransactionId = $"txn-{Guid.NewGuid()}",
            Amount = 40m
        });
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var status = await _paymentService.GetInvoicePaymentStatusAsync(invoice.Id);

        // Assert
        status.ShouldBe(InvoicePaymentStatus.PartiallyPaid);
    }

    [Fact]
    public async Task GetInvoicePaymentStatusAsync_FullRefund_ReturnsRefunded()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoice(total: 100m);
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var paymentResult = await _paymentService.RecordPaymentAsync(new RecordPaymentParameters
        {
            InvoiceId = invoice.Id,
            ProviderAlias = "manual",
            TransactionId = $"txn-{Guid.NewGuid()}",
            Amount = 100m
        });
        paymentResult.Successful.ShouldBeTrue();
        var payment = paymentResult.ResultObject!;
        _fixture.DbContext.ChangeTracker.Clear();

        var refundResult = await _paymentService.ProcessRefundAsync(new ProcessRefundParameters
        {
            PaymentId = payment.Id,
            Amount = 100m,
            Reason = "Full refund"
        });
        refundResult.Successful.ShouldBeTrue();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var status = await _paymentService.GetInvoicePaymentStatusAsync(invoice.Id);

        // Assert
        status.ShouldBe(InvoicePaymentStatus.Refunded);
    }

    [Fact]
    public async Task GetInvoicePaymentStatusAsync_PartialRefund_ReturnsPartiallyRefunded()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoice(total: 100m);
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var paymentResult = await _paymentService.RecordPaymentAsync(new RecordPaymentParameters
        {
            InvoiceId = invoice.Id,
            ProviderAlias = "manual",
            TransactionId = $"txn-{Guid.NewGuid()}",
            Amount = 100m
        });
        paymentResult.Successful.ShouldBeTrue();
        var payment = paymentResult.ResultObject!;
        _fixture.DbContext.ChangeTracker.Clear();

        var refundResult = await _paymentService.ProcessRefundAsync(new ProcessRefundParameters
        {
            PaymentId = payment.Id,
            Amount = 30m,
            Reason = "Partial refund"
        });
        refundResult.Successful.ShouldBeTrue();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var status = await _paymentService.GetInvoicePaymentStatusAsync(invoice.Id);

        // Assert
        status.ShouldBe(InvoicePaymentStatus.PartiallyRefunded);
    }

    #endregion

    #region CreatePaymentSessionAsync Tests

    [Fact]
    public async Task CreatePaymentSessionAsync_ProviderNotEnabled_ReturnsFailedResult()
    {
        // Arrange - the fixture's provider manager only knows "manual",
        // so "disabled-provider" will return null
        var result = await _paymentService.CreatePaymentSessionAsync(
            new CreatePaymentSessionParameters
            {
                InvoiceId = Guid.NewGuid(),
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
}

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
    private PaymentService CreateServiceWithCustomProvider(
        IPaymentProviderManager providerManager,
        IPaymentIdempotencyService? idempotencyService = null) =>
        new(
            providerManager,
            _fixture.GetService<IEFCoreScopeProvider<MerchelloDbContext>>(),
            _fixture.GetService<PaymentFactory>(),
            _fixture.GetService<ICurrencyService>(),
            _fixture.GetService<IMerchelloNotificationPublisher>(),
            _fixture.GetService<IRateLimiter>(),
            idempotencyService ?? _fixture.GetService<IPaymentIdempotencyService>(),
            _fixture.GetService<IOptions<MerchelloSettings>>(),
            NullLogger<PaymentService>.Instance);

    #region RecordPaymentAsync Tests

    [Fact]
    public async Task RecordPaymentAsync_ClearsIdempotencyMarker_AfterDurableWrite()
    {
        // Arrange
        const string idempotencyKey = "record-payment-idem-123";
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoice(total: 100m);
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var idempotencyMock = new Mock<IPaymentIdempotencyService>();
        var service = CreateServiceWithCustomProvider(_fixture.PaymentProviderManagerMock.Object, idempotencyMock.Object);

        // Act
        var result = await service.RecordPaymentAsync(new RecordPaymentParameters
        {
            InvoiceId = invoice.Id,
            ProviderAlias = "manual",
            TransactionId = $"txn-{Guid.NewGuid():N}",
            IdempotencyKey = idempotencyKey,
            Amount = 100m
        });

        // Assert
        result.Success.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        idempotencyMock.Verify(
            x => x.CachePaymentResult(
                idempotencyKey,
                It.Is<PaymentResult>(r => r.Success)),
            Times.Once);
    }

    #endregion

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
        paymentResult.Success.ShouldBeTrue();
        var payment = paymentResult.ResultObject!;
        _fixture.DbContext.ChangeTracker.Clear();

        // Process a real refund
        var refundResult = await _paymentService.ProcessRefundAsync(new ProcessRefundParameters
        {
            PaymentId = payment.Id,
            Amount = 50m,
            Reason = "Partial refund"
        });
        refundResult.Success.ShouldBeTrue();
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
        paymentResult.Success.ShouldBeTrue();
        var payment = paymentResult.ResultObject!;
        _fixture.DbContext.ChangeTracker.Clear();

        // Refund 30 first
        var firstRefund = await _paymentService.ProcessRefundAsync(new ProcessRefundParameters
        {
            PaymentId = payment.Id,
            Amount = 30m,
            Reason = "First refund"
        });
        firstRefund.Success.ShouldBeTrue();
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
        paymentResult.Success.ShouldBeTrue();
        var payment = paymentResult.ResultObject!;
        _fixture.DbContext.ChangeTracker.Clear();

        var refundResult = await _paymentService.ProcessRefundAsync(new ProcessRefundParameters
        {
            PaymentId = payment.Id,
            Amount = 100m,
            Reason = "Full refund"
        });
        refundResult.Success.ShouldBeTrue();
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
        paymentResult.Success.ShouldBeTrue();
        var payment = paymentResult.ResultObject!;
        _fixture.DbContext.ChangeTracker.Clear();

        var refundResult = await _paymentService.ProcessRefundAsync(new ProcessRefundParameters
        {
            PaymentId = payment.Id,
            Amount = 30m,
            Reason = "Partial refund"
        });
        refundResult.Success.ShouldBeTrue();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var status = await _paymentService.GetInvoicePaymentStatusAsync(invoice.Id);

        // Assert
        status.ShouldBe(InvoicePaymentStatus.PartiallyRefunded);
    }

    #endregion

    #region CreditDue Integration Tests (Invoice Total Reduction / Overpayment)

    [Fact]
    public async Task CalculatePaymentStatus_InvoiceTotalReduced_SetsCreditDue()
    {
        // Arrange - Simulates product removal: invoice paid in full, then total drops
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoice(total: 100m);
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Pay the full invoice
        await _paymentService.RecordPaymentAsync(new RecordPaymentParameters
        {
            InvoiceId = invoice.Id,
            ProviderAlias = "manual",
            TransactionId = $"txn-{Guid.NewGuid()}",
            Amount = 100m
        });
        _fixture.DbContext.ChangeTracker.Clear();

        // Simulate product removal by reducing invoice total in DB
        var dbInvoice = await _fixture.DbContext.Invoices.FindAsync(invoice.Id);
        dbInvoice!.Total = 60m;
        await _fixture.DbContext.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act - Load payments from DB and recalculate status
        var payments = await _paymentService.GetPaymentsForInvoiceAsync(invoice.Id);
        var details = _paymentService.CalculatePaymentStatus(new CalculatePaymentStatusParameters
        {
            Payments = payments,
            InvoiceTotal = 60m,
            CurrencyCode = "GBP"
        });

        // Assert
        details.Status.ShouldBe(InvoicePaymentStatus.Paid);
        details.BalanceDue.ShouldBe(0m);
        details.CreditDue.ShouldBe(40m); // 100 paid - 60 total = 40 overpaid
    }

    [Fact]
    public async Task CalculatePaymentStatus_AllProductsRemoved_CreditDueEqualsFullPayment()
    {
        // Arrange - All products removed: invoice total drops to 0
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

        // Simulate all products removed
        var dbInvoice = await _fixture.DbContext.Invoices.FindAsync(invoice.Id);
        dbInvoice!.Total = 0m;
        await _fixture.DbContext.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var payments = await _paymentService.GetPaymentsForInvoiceAsync(invoice.Id);
        var details = _paymentService.CalculatePaymentStatus(new CalculatePaymentStatusParameters
        {
            Payments = payments,
            InvoiceTotal = 0m,
            CurrencyCode = "GBP"
        });

        // Assert
        details.Status.ShouldBe(InvoicePaymentStatus.Paid);
        details.CreditDue.ShouldBe(100m); // Full payment is credit due
    }

    [Fact]
    public async Task CalculatePaymentStatus_RefundResolvesOverpayment_CreditDueDropsToZero()
    {
        // Arrange - Pay 100, reduce total to 60, refund 40 overpayment
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
        paymentResult.Success.ShouldBeTrue();
        var payment = paymentResult.ResultObject!;
        _fixture.DbContext.ChangeTracker.Clear();

        // Simulate product removal
        var dbInvoice = await _fixture.DbContext.Invoices.FindAsync(invoice.Id);
        dbInvoice!.Total = 60m;
        await _fixture.DbContext.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Refund the exact overpayment amount
        var refundResult = await _paymentService.ProcessRefundAsync(new ProcessRefundParameters
        {
            PaymentId = payment.Id,
            Amount = 40m,
            Reason = "Refund for removed products"
        });
        refundResult.Success.ShouldBeTrue();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act - Recalculate with updated payments
        var payments = await _paymentService.GetPaymentsForInvoiceAsync(invoice.Id);
        var details = _paymentService.CalculatePaymentStatus(new CalculatePaymentStatusParameters
        {
            Payments = payments,
            InvoiceTotal = 60m,
            CurrencyCode = "GBP"
        });

        // Assert - Net payment (100-40=60) matches invoice total (60), so balanced
        details.Status.ShouldBe(InvoicePaymentStatus.PartiallyRefunded);
        details.NetPayment.ShouldBe(60m);
        details.BalanceDue.ShouldBe(0m);
        details.CreditDue.ShouldBe(0m);
    }

    [Fact]
    public async Task CalculatePaymentStatus_PartialRefundStillOverpaid_CreditDueReduced()
    {
        // Arrange - Pay 100, reduce total to 60 (40 overpaid), refund only 15
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
        paymentResult.Success.ShouldBeTrue();
        var payment = paymentResult.ResultObject!;
        _fixture.DbContext.ChangeTracker.Clear();

        // Simulate product removal
        var dbInvoice = await _fixture.DbContext.Invoices.FindAsync(invoice.Id);
        dbInvoice!.Total = 60m;
        await _fixture.DbContext.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Partial refund — not enough to resolve overpayment
        var refundResult = await _paymentService.ProcessRefundAsync(new ProcessRefundParameters
        {
            PaymentId = payment.Id,
            Amount = 15m,
            Reason = "Partial refund"
        });
        refundResult.Success.ShouldBeTrue();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var payments = await _paymentService.GetPaymentsForInvoiceAsync(invoice.Id);
        var details = _paymentService.CalculatePaymentStatus(new CalculatePaymentStatusParameters
        {
            Payments = payments,
            InvoiceTotal = 60m,
            CurrencyCode = "GBP"
        });

        // Assert - Net payment (100-15=85) still exceeds total (60), credit due = 25
        details.Status.ShouldBe(InvoicePaymentStatus.PartiallyRefunded);
        details.NetPayment.ShouldBe(85m);
        details.BalanceDue.ShouldBe(0m);
        details.CreditDue.ShouldBe(25m);
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

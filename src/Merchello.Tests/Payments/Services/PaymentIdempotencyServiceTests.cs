using Merchello.Core.Accounting.Models;
using Merchello.Core.Data;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services;
using Microsoft.Extensions.Logging;
using Moq;
using Shouldly;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.Payments.Services;

public class PaymentIdempotencyServiceTests
{
    private readonly Mock<IEFCoreScopeProvider<MerchelloDbContext>> _scopeProviderMock;
    private readonly Mock<ILogger<PaymentIdempotencyService>> _loggerMock;
    private readonly PaymentIdempotencyService _service;

    public PaymentIdempotencyServiceTests()
    {
        _scopeProviderMock = new Mock<IEFCoreScopeProvider<MerchelloDbContext>>();
        _loggerMock = new Mock<ILogger<PaymentIdempotencyService>>();
        _service = new PaymentIdempotencyService(_scopeProviderMock.Object, _loggerMock.Object);
    }

    private string UniqueKey() => $"test-key-{Guid.NewGuid()}";

    private void SetupScopeReturnsNoPayment()
    {
        var scopeMock = new Mock<IEfCoreScope<MerchelloDbContext>>();

        scopeMock
            .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Payment?>>>()))
            .ReturnsAsync((Payment?)null);

        scopeMock
            .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<bool>>>()))
            .ReturnsAsync(false);

        scopeMock.Setup(s => s.Complete());

        _scopeProviderMock
            .Setup(p => p.CreateScope())
            .Returns(scopeMock.Object);
    }

    private void SetupScopeReturnsPayment(Payment payment)
    {
        var scopeMock = new Mock<IEfCoreScope<MerchelloDbContext>>();

        scopeMock
            .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<Payment?>>>()))
            .ReturnsAsync(payment);

        scopeMock
            .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<bool>>>()))
            .ReturnsAsync(true);

        scopeMock.Setup(s => s.Complete());

        _scopeProviderMock
            .Setup(p => p.CreateScope())
            .Returns(scopeMock.Object);
    }

    #region GetCachedPaymentResultAsync Tests

    [Fact]
    public async Task GetCachedPaymentResultAsync_UnknownKey_ReturnsNull()
    {
        // Arrange
        SetupScopeReturnsNoPayment();
        var key = UniqueKey();

        // Act
        var result = await _service.GetCachedPaymentResultAsync(key);

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public async Task GetCachedPaymentResultAsync_ExistingPayment_ReturnsCachedResult()
    {
        // Arrange
        var key = UniqueKey();
        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            InvoiceId = Guid.NewGuid(),
            Amount = 99.99m,
            PaymentSuccess = true,
            TransactionId = "txn_12345",
            PaymentType = PaymentType.Payment,
            IdempotencyKey = key,
            SettlementCurrencyCode = "GBP",
            SettlementExchangeRate = 0.79m,
            SettlementAmount = 78.99m,
            RiskScore = 15m,
            RiskScoreSource = "stripe-radar"
        };
        SetupScopeReturnsPayment(payment);

        // Act
        var result = await _service.GetCachedPaymentResultAsync(key);

        // Assert
        result.ShouldNotBeNull();
        result.Success.ShouldBeTrue();
        result.TransactionId.ShouldBe("txn_12345");
        result.Amount.ShouldBe(99.99m);
        result.Status.ShouldBe(PaymentResultStatus.Completed);
        result.SettlementCurrency.ShouldBe("GBP");
        result.SettlementExchangeRate.ShouldBe(0.79m);
        result.SettlementAmount.ShouldBe(78.99m);
        result.RiskScore.ShouldBe(15m);
        result.RiskScoreSource.ShouldBe("stripe-radar");
    }

    #endregion

    #region GetCachedRefundResultAsync Tests

    [Fact]
    public async Task GetCachedRefundResultAsync_UnknownKey_ReturnsNull()
    {
        // Arrange
        SetupScopeReturnsNoPayment();
        var key = UniqueKey();

        // Act
        var result = await _service.GetCachedRefundResultAsync(key);

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public async Task GetCachedRefundResultAsync_ExistingRefund_ReturnsCachedResult()
    {
        // Arrange
        var key = UniqueKey();
        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            InvoiceId = Guid.NewGuid(),
            Amount = -50m,
            PaymentSuccess = true,
            TransactionId = "refund_67890",
            PaymentType = PaymentType.Refund,
            IdempotencyKey = key
        };
        SetupScopeReturnsPayment(payment);

        // Act
        var result = await _service.GetCachedRefundResultAsync(key);

        // Assert
        result.ShouldNotBeNull();
        result.Success.ShouldBeTrue();
        result.RefundTransactionId.ShouldBe("refund_67890");
        result.AmountRefunded.ShouldBe(50m); // Absolute value of -50
    }

    #endregion

    #region TryMarkAsProcessingAsync Tests

    [Fact]
    public async Task TryMarkAsProcessingAsync_NewKey_ReturnsTrue()
    {
        // Arrange
        SetupScopeReturnsNoPayment();
        var key = UniqueKey();

        // Act
        var result = await _service.TryMarkAsProcessingAsync(key);

        // Assert
        result.ShouldBeTrue();

        // Cleanup
        _service.ClearProcessingMarker(key);
    }

    [Fact]
    public async Task TryMarkAsProcessingAsync_AlreadyProcessingKey_ReturnsFalse()
    {
        // Arrange
        SetupScopeReturnsNoPayment();
        var key = UniqueKey();

        // First call marks it
        var firstResult = await _service.TryMarkAsProcessingAsync(key);
        firstResult.ShouldBeTrue();

        // Act - second call with same key
        var secondResult = await _service.TryMarkAsProcessingAsync(key);

        // Assert
        secondResult.ShouldBeFalse();

        // Cleanup
        _service.ClearProcessingMarker(key);
    }

    #endregion

    #region ClearProcessingMarker Tests

    [Fact]
    public async Task ClearProcessingMarker_AllowsKeyToBeMarkedAgain()
    {
        // Arrange
        SetupScopeReturnsNoPayment();
        var key = UniqueKey();

        // Mark as processing
        var firstMark = await _service.TryMarkAsProcessingAsync(key);
        firstMark.ShouldBeTrue();

        // Clear the marker
        _service.ClearProcessingMarker(key);

        // Act - should be able to mark again
        var secondMark = await _service.TryMarkAsProcessingAsync(key);

        // Assert
        secondMark.ShouldBeTrue();

        // Cleanup
        _service.ClearProcessingMarker(key);
    }

    #endregion

    #region CachePaymentResult Tests

    [Fact]
    public async Task CachePaymentResult_ClearsProcessingMarker()
    {
        // Arrange
        SetupScopeReturnsNoPayment();
        var key = UniqueKey();
        var paymentResult = PaymentResult.Completed("txn_abc", 100m);

        // Mark as processing first
        var marked = await _service.TryMarkAsProcessingAsync(key);
        marked.ShouldBeTrue();

        // Act - cache the result (this should clear the processing marker)
        _service.CachePaymentResult(key, paymentResult);

        // Assert - key can be marked again since marker was cleared
        var remarked = await _service.TryMarkAsProcessingAsync(key);
        remarked.ShouldBeTrue();

        // Cleanup
        _service.ClearProcessingMarker(key);
    }

    #endregion

    #region CacheRefundResult Tests

    [Fact]
    public async Task CacheRefundResult_ClearsProcessingMarker()
    {
        // Arrange
        SetupScopeReturnsNoPayment();
        var key = UniqueKey();
        var refundResult = RefundResult.Successful("refund_xyz", 25m);

        // Mark as processing first
        var marked = await _service.TryMarkAsProcessingAsync(key);
        marked.ShouldBeTrue();

        // Act - cache the result (this should clear the processing marker)
        _service.CacheRefundResult(key, refundResult);

        // Assert - key can be marked again since marker was cleared
        var remarked = await _service.TryMarkAsProcessingAsync(key);
        remarked.ShouldBeTrue();

        // Cleanup
        _service.ClearProcessingMarker(key);
    }

    #endregion

    #region Key Isolation Tests

    [Fact]
    public async Task DifferentKeys_DoNotInterfereWithEachOther()
    {
        // Arrange
        SetupScopeReturnsNoPayment();
        var keyA = UniqueKey();
        var keyB = UniqueKey();

        // Act - mark both keys
        var resultA = await _service.TryMarkAsProcessingAsync(keyA);
        var resultB = await _service.TryMarkAsProcessingAsync(keyB);

        // Assert - both should succeed independently
        resultA.ShouldBeTrue();
        resultB.ShouldBeTrue();

        // Clearing one should not affect the other
        _service.ClearProcessingMarker(keyA);

        var retryA = await _service.TryMarkAsProcessingAsync(keyA);
        var retryB = await _service.TryMarkAsProcessingAsync(keyB);

        retryA.ShouldBeTrue(); // keyA cleared, can be re-marked
        retryB.ShouldBeFalse(); // keyB still marked

        // Cleanup
        _service.ClearProcessingMarker(keyA);
        _service.ClearProcessingMarker(keyB);
    }

    #endregion
}

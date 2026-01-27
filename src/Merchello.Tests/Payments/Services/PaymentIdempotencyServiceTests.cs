using Merchello.Core.Data;
using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Services;
using Merchello.Tests.TestInfrastructure;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Shouldly;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.Payments.Services;

[Collection("Integration Tests")]
public class PaymentIdempotencyServiceTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly PaymentIdempotencyService _service;

    public PaymentIdempotencyServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _service = new PaymentIdempotencyService(
            fixture.GetService<IEFCoreScopeProvider<MerchelloDbContext>>(),
            NullLogger<PaymentIdempotencyService>.Instance);
    }

    private static string UniqueKey() => $"test-key-{Guid.NewGuid()}";

    #region GetCachedPaymentResultAsync Tests

    [Fact]
    public async Task GetCachedPaymentResultAsync_UnknownKey_ReturnsNull()
    {
        // Arrange
        var key = UniqueKey();

        // Act
        var result = await _service.GetCachedPaymentResultAsync(key);

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public async Task GetCachedPaymentResultAsync_ExistingPayment_ReturnsCachedResult()
    {
        // Arrange - create a real payment with an idempotency key in the database
        var key = UniqueKey();
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoice(total: 99.99m);
        var payment = dataBuilder.CreatePayment(invoice, amount: 99.99m);
        payment.IdempotencyKey = key;
        payment.TransactionId = "txn_12345";
        payment.PaymentType = PaymentType.Payment;
        payment.PaymentSuccess = true;
        payment.SettlementCurrencyCode = "GBP";
        payment.SettlementExchangeRate = 0.79m;
        payment.SettlementAmount = 78.99m;
        payment.RiskScore = 15m;
        payment.RiskScoreSource = "stripe-radar";
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

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
        var key = UniqueKey();

        // Act
        var result = await _service.GetCachedRefundResultAsync(key);

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public async Task GetCachedRefundResultAsync_ExistingRefund_ReturnsCachedResult()
    {
        // Arrange - create a real refund payment in the database
        var key = UniqueKey();
        var dataBuilder = _fixture.CreateDataBuilder();
        var invoice = dataBuilder.CreateInvoice(total: 100m);
        var payment = dataBuilder.CreatePayment(invoice, amount: 50m);
        payment.IdempotencyKey = key;
        payment.Amount = -50m;
        payment.TransactionId = "refund_67890";
        payment.PaymentType = PaymentType.Refund;
        payment.PaymentSuccess = true;
        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

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

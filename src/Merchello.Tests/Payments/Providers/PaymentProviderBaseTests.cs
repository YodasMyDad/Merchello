using Merchello.Core.Payments.Models;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Payments.Providers;

public class PaymentProviderBaseTests
{
    [Fact]
    public async Task RefundPaymentAsync_DefaultImplementation_ReturnsNotSupported()
    {
        // Arrange
        var provider = new TestPaymentProvider();
        var request = new RefundRequest
        {
            PaymentId = Guid.NewGuid(),
            TransactionId = "txn-123",
            Amount = 100m
        };

        // Act
        var result = await provider.RefundPaymentAsync(request);

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldNotBeNullOrEmpty();
        result.ErrorMessage.ShouldContain("does not support refunds");
    }

    [Fact]
    public async Task CapturePaymentAsync_DefaultImplementation_ReturnsNotSupported()
    {
        // Arrange
        var provider = new TestPaymentProvider();
        var transactionId = "txn-123";

        // Act
        var result = await provider.CapturePaymentAsync(transactionId, 100m);

        // Assert
        result.Success.ShouldBeFalse();
        result.ErrorMessage.ShouldNotBeNullOrEmpty();
        result.ErrorMessage.ShouldContain("does not support authorization");
    }

    [Fact]
    public async Task ValidateWebhookAsync_DefaultImplementation_ReturnsFalse()
    {
        // Arrange
        var provider = new TestPaymentProvider();
        var payload = """{"event": "payment.completed"}""";
        var headers = new Dictionary<string, string>
        {
            ["X-Signature"] = "fake-signature"
        };

        // Act
        var result = await provider.ValidateWebhookAsync(payload, headers);

        // Assert
        result.ShouldBeFalse();
    }
}

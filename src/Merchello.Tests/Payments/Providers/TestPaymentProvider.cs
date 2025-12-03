using Merchello.Core.Payments.Models;
using Merchello.Core.Payments.Providers;

namespace Merchello.Tests.Payments.Providers;

/// <summary>
/// Test implementation of PaymentProviderBase for testing default implementations.
/// </summary>
public class TestPaymentProvider : PaymentProviderBase
{
    public override PaymentProviderMetadata Metadata => new()
    {
        Alias = "test",
        DisplayName = "Test Provider",
        IntegrationType = PaymentIntegrationType.DirectForm
    };

    public override Task<PaymentSessionResult> CreatePaymentSessionAsync(
        PaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(PaymentSessionResult.DirectForm([], "test-session"));
    }

    public override Task<PaymentResult> ProcessPaymentAsync(
        ProcessPaymentRequest request,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(PaymentResult.Completed("test-txn", request.Amount ?? 0));
    }
}

using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Providers;
using Merchello.Core.Fulfilment.Providers.SupplierDirect;

namespace Merchello.Tests.Fulfilment.Providers;

/// <summary>
/// Deterministic provider used by integration tests that exercise Supplier Direct trigger flows.
/// </summary>
internal class IntegrationSupplierDirectProvider : FulfilmentProviderBase
{
    public override FulfilmentProviderMetadata Metadata => new()
    {
        Key = SupplierDirectProviderDefaults.ProviderKey,
        DisplayName = "Integration Supplier Direct",
        Description = "Integration test provider for Supplier Direct release flow",
        SupportsOrderSubmission = true,
        SupportsOrderCancellation = false,
        SupportsWebhooks = false,
        SupportsPolling = false,
        SupportsProductSync = false,
        SupportsInventorySync = false,
        CreatesShipmentOnSubmission = true,
        ApiStyle = FulfilmentApiStyle.Sftp
    };

    public List<Guid> SubmittedOrderIds { get; } = [];

    public override Task<FulfilmentOrderResult> SubmitOrderAsync(
        FulfilmentOrderRequest request,
        CancellationToken cancellationToken = default)
    {
        SubmittedOrderIds.Add(request.OrderId);
        var reference = $"INT-{request.OrderId.ToString("N")[..10].ToUpperInvariant()}";
        return Task.FromResult(FulfilmentOrderResult.Succeeded(reference));
    }
}

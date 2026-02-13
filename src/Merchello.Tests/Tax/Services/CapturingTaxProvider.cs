using Merchello.Core.Tax.Providers;
using Merchello.Core.Tax.Providers.Models;

namespace Merchello.Tests.Tax.Services;

internal sealed class CapturingTaxProvider : TaxProviderBase
{
    public TaxCalculationRequest? LastRequest { get; private set; }

    public override TaxProviderMetadata Metadata => new(
        Alias: "capturing-provider",
        DisplayName: "Capturing Provider",
        Icon: "icon-calculator",
        Description: "Test provider",
        SupportsRealTimeCalculation: true,
        RequiresApiCredentials: false);

    public override Task<TaxCalculationResult> CalculateOrderTaxAsync(
        TaxCalculationRequest request,
        CancellationToken cancellationToken = default)
    {
        LastRequest = request;
        return Task.FromResult(TaxCalculationResult.ZeroTax(request.LineItems));
    }
}

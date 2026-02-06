using Merchello.Core.Tax.Providers;
using Merchello.Core.Tax.Providers.Models;

namespace Merchello.Tests.Tax.Providers;

/// <summary>
/// Test subclass that exposes protected methods for testing.
/// </summary>
internal class TestTaxProvider : TaxProviderBase
{
    public override TaxProviderMetadata Metadata => new(
        Alias: "test",
        DisplayName: "Test Provider",
        Icon: null,
        Description: "Test tax provider for unit testing",
        SupportsRealTimeCalculation: false,
        RequiresApiCredentials: false);

    public override Task<TaxCalculationResult> CalculateOrderTaxAsync(
        TaxCalculationRequest request,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(TaxCalculationResult.ZeroTax(request.LineItems));
    }

    public string? TestGetTaxCodeForTaxGroup(Guid? taxGroupId)
        => GetTaxCodeForTaxGroup(taxGroupId);

    public string? TestGetShippingTaxCode()
        => GetShippingTaxCode();
}

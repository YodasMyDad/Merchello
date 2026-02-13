using Merchello.Core.Locality.Models;
using Merchello.Core.Tax.Models;
using Merchello.Core.Tax.Providers;
using Merchello.Core.Tax.Providers.Interfaces;
using Merchello.Core.Tax.Providers.Models;
using Merchello.Core.Tax.Services;
using Merchello.Core.Tax.Services.Models;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Tax.Services;

public class TaxOrchestrationServiceTests
{
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task CalculateAsync_MapsAllowEstimateToProviderRequest(bool allowEstimate)
    {
        var provider = new CapturingTaxProvider();
        var providerManager = new Mock<ITaxProviderManager>();
        providerManager
            .Setup(x => x.GetActiveProviderAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new RegisteredTaxProvider(
                provider,
                new TaxProviderSetting
                {
                    ProviderKey = "capturing-provider",
                    IsEnabled = true,
                    CreateDate = DateTime.UtcNow,
                    UpdateDate = DateTime.UtcNow
                },
                configuration: null));

        var service = new TaxOrchestrationService(
            providerManager.Object,
            NullLogger<TaxOrchestrationService>.Instance);

        var result = await service.CalculateAsync(
            new TaxOrchestrationRequest
            {
                ShippingAddress = new Address
                {
                    CountryCode = "US",
                    CountyState = new CountyState { RegionCode = "CA" }
                },
                CurrencyCode = "USD",
                LineItems =
                [
                    new TaxableLineItem
                    {
                        Sku = "SKU-1",
                        Name = "Product",
                        Amount = 10m,
                        Quantity = 1,
                        IsTaxable = true
                    }
                ],
                AllowEstimate = allowEstimate
            });

        result.Success.ShouldBeTrue();
        provider.LastRequest.ShouldNotBeNull();
        provider.LastRequest!.IsEstimate.ShouldBe(allowEstimate);
    }
}

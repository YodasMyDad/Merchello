using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Core;
using Merchello.Tests.TestInfrastructure;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Tax.Services;

[Collection("Integration Tests")]
public class TaxServiceNormalizationTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly ITaxService _taxService;

    public TaxServiceNormalizationTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _fixture.ResetMocks();
        _taxService = fixture.GetService<ITaxService>();
    }

    [Fact]
    public async Task CreateTaxGroupRate_NormalizesCountryAndRegion_AndPreventsCaseVariantDuplicates()
    {
        var taxGroup = await _taxService.CreateTaxGroup("Standard", 20m);
        taxGroup.Success.ShouldBeTrue();
        taxGroup.ResultObject.ShouldNotBeNull();

        var createRate = await _taxService.CreateTaxGroupRate(
            taxGroup.ResultObject!.Id,
            countryCode: "us",
            regionCode: "ca",
            taxPercentage: 7.25m);

        createRate.Success.ShouldBeTrue();
        createRate.ResultObject.ShouldNotBeNull();
        createRate.ResultObject.CountryCode.ShouldBe("US");
        createRate.ResultObject.RegionCode.ShouldBe("CA");

        await using var db = _fixture.CreateDbContext();
        var storedRates = db.TaxGroupRates.Where(x => x.TaxGroupId == taxGroup.ResultObject.Id).ToList();
        storedRates.Count.ShouldBe(1);
        storedRates[0].CountryCode.ShouldBe("US");
        storedRates[0].RegionCode.ShouldBe("CA");

        var duplicate = await _taxService.CreateTaxGroupRate(
            taxGroup.ResultObject.Id,
            countryCode: "US",
            regionCode: "CA",
            taxPercentage: 8m);
        duplicate.Success.ShouldBeFalse();
    }

    [Fact]
    public async Task CreateShippingTaxOverride_NormalizesLocation_AndPreventsCaseVariantDuplicates()
    {
        var createOverride = await _taxService.CreateShippingTaxOverrideAsync(new CreateShippingTaxOverrideDto
        {
            CountryCode = "us",
            RegionCode = "ca",
            ShippingTaxGroupId = null
        });

        createOverride.Success.ShouldBeTrue();
        createOverride.ResultObject.ShouldNotBeNull();
        createOverride.ResultObject.CountryCode.ShouldBe("US");
        createOverride.ResultObject.RegionCode.ShouldBe("CA");

        var duplicateOverride = await _taxService.CreateShippingTaxOverrideAsync(new CreateShippingTaxOverrideDto
        {
            CountryCode = "US",
            RegionCode = "CA",
            ShippingTaxGroupId = null
        });
        duplicateOverride.Success.ShouldBeFalse();

        var lookupUpper = await _taxService.GetShippingTaxOverrideAsync("US", "CA");
        var lookupLower = await _taxService.GetShippingTaxOverrideAsync("us", "ca");
        lookupUpper.ShouldNotBeNull();
        lookupLower.ShouldNotBeNull();
        lookupLower!.Id.ShouldBe(lookupUpper!.Id);
    }

    [Fact]
    public async Task CreateTaxGroupRate_WhitespaceRegion_NormalizesToNull()
    {
        var taxGroup = await _taxService.CreateTaxGroup("Reduced", 5m);
        taxGroup.Success.ShouldBeTrue();
        taxGroup.ResultObject.ShouldNotBeNull();

        var createRate = await _taxService.CreateTaxGroupRate(
            taxGroup.ResultObject!.Id,
            countryCode: "de",
            regionCode: "   ",
            taxPercentage: 19m);

        createRate.Success.ShouldBeTrue();
        createRate.ResultObject.ShouldNotBeNull();
        createRate.ResultObject.CountryCode.ShouldBe("DE");
        createRate.ResultObject.RegionCode.ShouldBeNull();

        var duplicateCountryOnly = await _taxService.CreateTaxGroupRate(
            taxGroup.ResultObject.Id,
            countryCode: "DE",
            regionCode: null,
            taxPercentage: 18m);
        duplicateCountryOnly.Success.ShouldBeFalse();
    }

    [Fact]
    public async Task TaxWrites_InvalidateTaxCacheTag()
    {
        var taxGroup = await _taxService.CreateTaxGroup("Cache Test", 10m);
        taxGroup.Success.ShouldBeTrue();
        taxGroup.ResultObject.ShouldNotBeNull();

        var createRate = await _taxService.CreateTaxGroupRate(
            taxGroup.ResultObject!.Id,
            countryCode: "US",
            regionCode: "WA",
            taxPercentage: 9m);
        createRate.Success.ShouldBeTrue();
        createRate.ResultObject.ShouldNotBeNull();

        var updateRate = await _taxService.UpdateTaxGroupRate(createRate.ResultObject!.Id, 9.5m);
        updateRate.Success.ShouldBeTrue();

        var deleteRate = await _taxService.DeleteTaxGroupRate(createRate.ResultObject.Id);
        deleteRate.Success.ShouldBeTrue();

        var createOverride = await _taxService.CreateShippingTaxOverrideAsync(new CreateShippingTaxOverrideDto
        {
            CountryCode = "US",
            RegionCode = "WA",
            ShippingTaxGroupId = null
        });
        createOverride.Success.ShouldBeTrue();

        _fixture.CacheServiceMock.Verify(
            x => x.RemoveByTagAsync(Constants.CacheTags.Tax, It.IsAny<CancellationToken>()),
            Times.AtLeast(4));
    }
}

using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Warehouses.Models;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Shipping.Services;

public class ShippingOptionEligibilityServiceTests
{
    private readonly IShippingOptionEligibilityService _service = new ShippingOptionEligibilityService(new ShippingCostResolver());

    [Fact]
    public void GetEligibleOptions_IgnoresDisabledOptions()
    {
        var option = CreateOption("Standard", fixedCost: 5m);
        option.IsEnabled = false;

        var result = _service.GetEligibleOptions([option], "GB");

        result.ShouldBeEmpty();
    }

    [Fact]
    public void GetEligibleOptions_ExcludesCountryLevelExclusion()
    {
        var option = CreateOption("Standard", fixedCost: 5m);
        option.SetExcludedRegions(
        [
            new ShippingOptionExcludedRegion
            {
                CountryCode = "GB"
            }
        ]);

        var result = _service.GetEligibleOptions([option], "GB");

        result.ShouldBeEmpty();
    }

    [Fact]
    public void GetEligibleOptions_ExcludesOnlyMatchingRegion()
    {
        var option = CreateOption("US Ground", fixedCost: 8m);
        option.SetExcludedRegions(
        [
            new ShippingOptionExcludedRegion
            {
                CountryCode = "US",
                RegionCode = "CA"
            }
        ]);

        var californiaResult = _service.GetEligibleOptions([option], "US", "CA");
        var texasResult = _service.GetEligibleOptions([option], "US", "TX");

        californiaResult.ShouldBeEmpty();
        texasResult.Count.ShouldBe(1);
        texasResult[0].Cost.ShouldBe(8m);
    }

    [Fact]
    public void GetEligibleOptions_ExcludesWhenWarehouseCannotServeDestination()
    {
        var option = CreateOption("US Ground", fixedCost: 8m);
        option.Warehouse.SetServiceRegions(
        [
            new WarehouseServiceRegion
            {
                CountryCode = "US"
            }
        ]);

        var result = _service.GetEligibleOptions([option], "GB");

        result.ShouldBeEmpty();
    }

    [Fact]
    public void GetEligibleOptions_AllowsLiveRateOptionWithoutConfiguredCost()
    {
        var option = CreateOption("FedEx Ground", providerKey: "fedex", fixedCost: null);

        var result = _service.GetEligibleOptions(
            [option],
            countryCode: "US",
            enabledProviderKeys: new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "fedex" },
            usesLiveRatesLookup: new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase)
            {
                ["fedex"] = true
            });

        result.Count.ShouldBe(1);
        result[0].UsesLiveRates.ShouldBeTrue();
        result[0].Cost.ShouldBeNull();
    }

    [Fact]
    public void GetEligibleOptions_RequiresConfiguredCostForLocalRateOption()
    {
        var option = CreateOption("UPS Ground", providerKey: "ups", fixedCost: null);

        var result = _service.GetEligibleOptions(
            [option],
            countryCode: "US",
            enabledProviderKeys: new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "ups" },
            usesLiveRatesLookup: new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase)
            {
                ["ups"] = false
            });

        result.ShouldBeEmpty();
    }

    [Fact]
    public void GetEligibleOptions_FlatRateWithoutFixedCost_UsesZeroFallback()
    {
        var option = CreateOption("Standard", fixedCost: null);

        var result = _service.GetEligibleOptions([option], "GB");

        result.Count.ShouldBe(1);
        result[0].Cost.ShouldBe(0m);
    }

    [Fact]
    public void GetEligibleOptions_AppliesEnabledProviderFilterForNonFlatRate()
    {
        var option = CreateOption("UPS Ground", providerKey: "ups", fixedCost: 11m);

        var result = _service.GetEligibleOptions(
            [option],
            countryCode: "US",
            enabledProviderKeys: new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "fedex" });

        result.ShouldBeEmpty();
    }

    private static ShippingOption CreateOption(string name, string providerKey = "flat-rate", decimal? fixedCost = 5m)
    {
        var warehouse = new Warehouse
        {
            Name = "Test Warehouse"
        };

        return new ShippingOption
        {
            Id = Guid.NewGuid(),
            Name = name,
            ProviderKey = providerKey,
            FixedCost = fixedCost,
            Warehouse = warehouse,
            WarehouseId = warehouse.Id,
            IsEnabled = true
        };
    }
}

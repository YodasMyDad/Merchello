using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Locality.Factories;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Shipping.Services.Parameters;
using Merchello.Core.Warehouses.Models;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Shipping.Services;

/// <summary>
/// Integration coverage for flat-rate shipping option destination exclusions.
/// Validates basket shipping options and estimated shipping totals by destination.
/// </summary>
[Collection("Integration Tests")]
public class FlatRateDestinationExclusionIntegrationTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IShippingService _shippingService;
    private readonly ICheckoutService _checkoutService;
    private readonly AddressFactory _addressFactory = new();

    public FlatRateDestinationExclusionIntegrationTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _shippingService = fixture.GetService<IShippingService>();
        _checkoutService = fixture.GetService<ICheckoutService>();
    }

    [Fact]
    public async Task GetShippingOptionsForBasket_GBDestination_ReturnsOnlyDomesticOptions()
    {
        // Arrange
        var (_, product) = await SeedSingleWarehouseCountryScenarioAsync();
        var basket = await CreateBasketAsync("GB", (product, 1));

        // Act
        var result = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = CreateAddress("GB")
            });

        // Assert
        result.WarehouseGroups.Count.ShouldBe(1);
        var options = result.WarehouseGroups[0].AvailableShippingOptions;
        options.Count.ShouldBe(2);

        options.ShouldContain(o => o.Name == "Next Day");
        options.ShouldContain(o => o.Name == "Standard Shipping");
        options.ShouldNotContain(o => o.Name == "International Express");
        options.ShouldNotContain(o => o.Name == "International Standard");

        options.First(o => o.Name == "Next Day").Cost.ShouldBe(0m);
        options.First(o => o.Name == "Standard Shipping").Cost.ShouldBe(2.99m);
    }

    [Fact]
    public async Task GetShippingOptionsForBasket_NZDestination_ReturnsOnlyInternationalStandard()
    {
        // Arrange
        var (_, product) = await SeedSingleWarehouseCountryScenarioAsync();
        var basket = await CreateBasketAsync("NZ", (product, 1));

        // Act
        var result = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = CreateAddress("NZ")
            });

        // Assert
        result.WarehouseGroups.Count.ShouldBe(1);
        var options = result.WarehouseGroups[0].AvailableShippingOptions;
        options.Count.ShouldBe(1);
        options[0].Name.ShouldBe("International Standard");
        options[0].Cost.ShouldBe(30m);
    }

    [Fact]
    public async Task GetEstimatedShippingAsync_SingleWarehouse_UsesOnlyDestinationEligibleOption()
    {
        // Arrange
        var (_, product) = await SeedSingleWarehouseCountryScenarioAsync();
        var basket = await CreateBasketAsync("NZ", (product, 1));

        // Act
        var estimate = await _checkoutService.GetEstimatedShippingAsync(
            new GetEstimatedShippingParameters
            {
                Basket = basket,
                CountryCode = "NZ"
            });

        // Assert
        estimate.Success.ShouldBeTrue();
        estimate.GroupCount.ShouldBe(1);
        estimate.EstimatedShipping.ShouldBe(30m);
        basket.Shipping.ShouldBe(30m);
    }

    [Fact]
    public async Task GetShippingOptionsForBasket_MultiWarehouse_FiltersOptionsPerWarehouseByCountry()
    {
        // Arrange
        var (warehouseA, warehouseB, productA, productB) = await SeedMultiWarehouseCountryScenarioAsync();
        var basket = await CreateBasketAsync("NZ", (productA, 1), (productB, 1));

        // Act
        var result = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = CreateAddress("NZ")
            });

        // Assert
        result.WarehouseGroups.Count.ShouldBe(2);

        var groupA = result.WarehouseGroups.First(g => g.WarehouseId == warehouseA.Id);
        groupA.AvailableShippingOptions.Count.ShouldBe(2);
        groupA.AvailableShippingOptions.ShouldContain(o => o.Name == "A International Standard");
        groupA.AvailableShippingOptions.ShouldContain(o => o.Name == "A International Express");
        groupA.AvailableShippingOptions.ShouldNotContain(o => o.Name == "A Domestic");

        var groupB = result.WarehouseGroups.First(g => g.WarehouseId == warehouseB.Id);
        groupB.AvailableShippingOptions.Count.ShouldBe(2);
        groupB.AvailableShippingOptions.ShouldContain(o => o.Name == "B International Economy");
        groupB.AvailableShippingOptions.ShouldContain(o => o.Name == "B International Priority");
        groupB.AvailableShippingOptions.ShouldNotContain(o => o.Name == "B Domestic");
    }

    [Fact]
    public async Task GetEstimatedShippingAsync_MultiWarehouse_SumsCheapestOptionPerGroup()
    {
        // Arrange
        var (_, _, productA, productB) = await SeedMultiWarehouseCountryScenarioAsync();
        var basket = await CreateBasketAsync("NZ", (productA, 1), (productB, 1));

        // Act
        var estimate = await _checkoutService.GetEstimatedShippingAsync(
            new GetEstimatedShippingParameters
            {
                Basket = basket,
                CountryCode = "NZ"
            });

        // Assert
        // Warehouse A cheapest for NZ = 30.00
        // Warehouse B cheapest for NZ = 18.00
        estimate.Success.ShouldBeTrue();
        estimate.GroupCount.ShouldBe(2);
        estimate.EstimatedShipping.ShouldBe(48m);
        basket.Shipping.ShouldBe(48m);
    }

    [Fact]
    public async Task GetShippingOptionsAndEstimate_RegionSpecificExclusion_OnlyBlocksMatchingRegion()
    {
        // Arrange
        var product = await SeedRegionSpecificScenarioAsync();
        var basket = await CreateBasketAsync("GB", (product, 1));

        // Act
        var englandResult = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = CreateAddress("GB", "ENG")
            });

        var niResult = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = CreateAddress("GB", "NIR")
            });

        var englandEstimate = await _checkoutService.GetEstimatedShippingAsync(
            new GetEstimatedShippingParameters
            {
                Basket = basket,
                CountryCode = "GB",
                RegionCode = "ENG"
            });

        var niEstimate = await _checkoutService.GetEstimatedShippingAsync(
            new GetEstimatedShippingParameters
            {
                Basket = basket,
                CountryCode = "GB",
                RegionCode = "NIR"
            });

        // Assert
        englandResult.WarehouseGroups.Count.ShouldBe(1);
        englandResult.WarehouseGroups[0].AvailableShippingOptions.Count.ShouldBe(2);
        englandResult.WarehouseGroups[0].AvailableShippingOptions.ShouldContain(o => o.Name == "Next Day");
        englandResult.WarehouseGroups[0].AvailableShippingOptions.ShouldContain(o => o.Name == "Standard Shipping");

        niResult.WarehouseGroups.Count.ShouldBe(1);
        niResult.WarehouseGroups[0].AvailableShippingOptions.Count.ShouldBe(1);
        niResult.WarehouseGroups[0].AvailableShippingOptions[0].Name.ShouldBe("Standard Shipping");

        englandEstimate.Success.ShouldBeTrue();
        englandEstimate.EstimatedShipping.ShouldBe(0m);
        niEstimate.Success.ShouldBeTrue();
        niEstimate.EstimatedShipping.ShouldBe(2.99m);
    }

    private async Task<(Warehouse Warehouse, Product Product)> SeedSingleWarehouseCountryScenarioAsync()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);

        var warehouse = dataBuilder.CreateWarehouse("UK Warehouse", "GB");
        SetServiceRegions(warehouse, "GB", "US", "ES", "DE", "NZ");

        var nextDay = dataBuilder.CreateShippingOption(
            "Next Day",
            warehouse,
            fixedCost: 0m,
            daysFrom: 0,
            daysTo: 0,
            isNextDay: true);
        nextDay.SetExcludedRegions(CreateCountryExclusions("US", "ES", "DE", "NZ"));

        var standard = dataBuilder.CreateShippingOption(
            "Standard Shipping",
            warehouse,
            fixedCost: 2.99m,
            daysFrom: 2,
            daysTo: 5);
        standard.SetExcludedRegions(CreateCountryExclusions("US", "ES", "DE", "NZ"));

        var internationalExpress = dataBuilder.CreateShippingOption(
            "International Express",
            warehouse,
            fixedCost: 24.99m,
            daysFrom: 2,
            daysTo: 4);
        internationalExpress.SetExcludedRegions(CreateCountryExclusions("GB", "ES", "DE", "NZ"));

        var internationalStandard = dataBuilder.CreateShippingOption(
            "International Standard",
            warehouse,
            fixedCost: 30m,
            daysFrom: 5,
            daysTo: 8);
        internationalStandard.SetExcludedRegions(CreateCountryExclusions("US", "ES", "DE", "GB"));

        var productRoot = dataBuilder.CreateProductRoot("Country Exclusion Product", taxGroup);
        var product = dataBuilder.CreateProduct("Country Exclusion Product - Default", productRoot, price: 50m);
        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return (warehouse, product);
    }

    private async Task<(Warehouse WarehouseA, Warehouse WarehouseB, Product ProductA, Product ProductB)> SeedMultiWarehouseCountryScenarioAsync()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);

        var warehouseA = dataBuilder.CreateWarehouse("Warehouse A", "GB");
        SetServiceRegions(warehouseA, "GB", "NZ");

        var aDomestic = dataBuilder.CreateShippingOption("A Domestic", warehouseA, fixedCost: 0m);
        aDomestic.SetExcludedRegions(CreateCountryExclusions("NZ"));

        var aInternationalStandard = dataBuilder.CreateShippingOption("A International Standard", warehouseA, fixedCost: 30m);
        aInternationalStandard.SetExcludedRegions(CreateCountryExclusions("GB"));

        var aInternationalExpress = dataBuilder.CreateShippingOption("A International Express", warehouseA, fixedCost: 40m);
        aInternationalExpress.SetExcludedRegions(CreateCountryExclusions("GB"));

        var warehouseB = dataBuilder.CreateWarehouse("Warehouse B", "DE");
        SetServiceRegions(warehouseB, "GB", "NZ");

        var bDomestic = dataBuilder.CreateShippingOption("B Domestic", warehouseB, fixedCost: 3m);
        bDomestic.SetExcludedRegions(CreateCountryExclusions("NZ"));

        var bInternationalEconomy = dataBuilder.CreateShippingOption("B International Economy", warehouseB, fixedCost: 18m);
        bInternationalEconomy.SetExcludedRegions(CreateCountryExclusions("GB"));

        var bInternationalPriority = dataBuilder.CreateShippingOption("B International Priority", warehouseB, fixedCost: 25m);
        bInternationalPriority.SetExcludedRegions(CreateCountryExclusions("GB"));

        var productRootA = dataBuilder.CreateProductRoot("Product A Root", taxGroup);
        var productA = dataBuilder.CreateProduct("Product A", productRootA, price: 25m);
        dataBuilder.AddWarehouseToProductRoot(productRootA, warehouseA);
        dataBuilder.CreateProductWarehouse(productA, warehouseA, stock: 100);

        var productRootB = dataBuilder.CreateProductRoot("Product B Root", taxGroup);
        var productB = dataBuilder.CreateProduct("Product B", productRootB, price: 35m);
        dataBuilder.AddWarehouseToProductRoot(productRootB, warehouseB);
        dataBuilder.CreateProductWarehouse(productB, warehouseB, stock: 100);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return (warehouseA, warehouseB, productA, productB);
    }

    private async Task<Product> SeedRegionSpecificScenarioAsync()
    {
        var dataBuilder = _fixture.CreateDataBuilder();
        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);

        var warehouse = dataBuilder.CreateWarehouse("UK Region Warehouse", "GB");
        SetServiceRegions(warehouse, "GB");

        var nextDay = dataBuilder.CreateShippingOption(
            "Next Day",
            warehouse,
            fixedCost: 0m,
            daysFrom: 0,
            daysTo: 0,
            isNextDay: true);
        nextDay.SetExcludedRegions(
        [
            new ShippingOptionExcludedRegion
            {
                CountryCode = "GB",
                RegionCode = "NIR"
            }
        ]);

        dataBuilder.CreateShippingOption(
            "Standard Shipping",
            warehouse,
            fixedCost: 2.99m,
            daysFrom: 2,
            daysTo: 5);

        var productRoot = dataBuilder.CreateProductRoot("Region Exclusion Product", taxGroup);
        var product = dataBuilder.CreateProduct("Region Exclusion Product - Default", productRoot, price: 15m);
        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        return product;
    }

    private async Task<Basket> CreateBasketAsync(string countryCode, params (Product Product, int Quantity)[] items)
    {
        var basket = _checkoutService.CreateBasket("GBP");

        foreach (var (product, quantity) in items)
        {
            var lineItem = _checkoutService.CreateLineItem(product, quantity);
            await _checkoutService.AddToBasketAsync(basket, lineItem, countryCode);
        }

        await _checkoutService.CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = countryCode
        });

        return basket;
    }

    private Address CreateAddress(string countryCode, string? regionCode = null)
    {
        return _addressFactory.CreateFromFormData(
            firstName: "Test",
            lastName: "User",
            address1: "1 Test Street",
            address2: null,
            city: "London",
            postalCode: "SW1A 1AA",
            countryCode: countryCode,
            regionCode: regionCode,
            phone: null,
            email: "test@example.com");
    }

    private static List<ShippingOptionExcludedRegion> CreateCountryExclusions(params string[] countryCodes)
    {
        return countryCodes
            .Select(c => new ShippingOptionExcludedRegion
            {
                CountryCode = c.ToUpperInvariant()
            })
            .ToList();
    }

    private static void SetServiceRegions(Warehouse warehouse, params string[] countryCodes)
    {
        warehouse.SetServiceRegions(
            countryCodes
                .Select(countryCode => new WarehouseServiceRegion
                {
                    CountryCode = countryCode.ToUpperInvariant(),
                    IsExcluded = false
                })
                .ToList());
    }
}

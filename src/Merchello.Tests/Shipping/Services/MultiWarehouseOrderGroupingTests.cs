using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Shipping.Extensions;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Shipping.Services.Parameters;
using Merchello.Core.Warehouses.Models;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Shipping.Services;

/// <summary>
/// Integration tests for multi-warehouse order grouping.
/// Validates that items from different warehouses are correctly split into separate shipping groups,
/// each with their own available shipping options.
/// </summary>
[Collection("Integration Tests")]
public class MultiWarehouseOrderGroupingTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IShippingService _shippingService;
    private readonly ICheckoutService _checkoutService;

    public MultiWarehouseOrderGroupingTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _shippingService = fixture.GetService<IShippingService>();
        _checkoutService = fixture.GetService<ICheckoutService>();
    }

    [Fact]
    public async Task GetShippingOptions_TwoWarehouses_CreatesSeparateGroups()
    {
        // Arrange: Two warehouses, each with one product
        var dataBuilder = _fixture.CreateDataBuilder();
        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);

        var warehouseGB = dataBuilder.CreateWarehouse("UK Warehouse", "GB");
        var shippingOptionGB = dataBuilder.CreateShippingOption("UK Standard", warehouseGB, fixedCost: 5.00m);
        shippingOptionGB.ShippingCosts.Add(new ShippingCost { CountryCode = "GB", Cost = 5.00m });
        dataBuilder.AddServiceRegion(warehouseGB, "GB");

        var warehouseUS = dataBuilder.CreateWarehouse("US Warehouse", "US");
        var shippingOptionUS = dataBuilder.CreateShippingOption("US Standard", warehouseUS, fixedCost: 10.00m);
        shippingOptionUS.ShippingCosts.Add(new ShippingCost { CountryCode = "GB", Cost = 10.00m });
        dataBuilder.AddServiceRegion(warehouseUS, "GB");

        var productRootA = dataBuilder.CreateProductRoot("Product A", taxGroup);
        var productA = dataBuilder.CreateProduct("Widget A", productRootA, price: 25.00m);
        dataBuilder.AddWarehouseToProductRoot(productRootA, warehouseGB);
        dataBuilder.CreateProductWarehouse(productA, warehouseGB, stock: 50);

        var productRootB = dataBuilder.CreateProductRoot("Product B", taxGroup);
        var productB = dataBuilder.CreateProduct("Widget B", productRootB, price: 35.00m);
        dataBuilder.AddWarehouseToProductRoot(productRootB, warehouseUS);
        dataBuilder.CreateProductWarehouse(productB, warehouseUS, stock: 50);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var basket = await CreateBasketAsync("GB", productA, productB);
        var shippingAddress = CreateAddress("GB");

        // Act
        var result = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = shippingAddress
            });

        // Assert
        result.WarehouseGroups.Count.ShouldBe(2);

        var gbGroup = result.WarehouseGroups.First(g => g.WarehouseId == warehouseGB.Id);
        gbGroup.LineItems.Count.ShouldBe(1);
        gbGroup.LineItems[0].Sku.ShouldBe(productA.Sku);
        gbGroup.AvailableShippingOptions.ShouldNotBeEmpty();

        var usGroup = result.WarehouseGroups.First(g => g.WarehouseId == warehouseUS.Id);
        usGroup.LineItems.Count.ShouldBe(1);
        usGroup.LineItems[0].Sku.ShouldBe(productB.Sku);
        usGroup.AvailableShippingOptions.ShouldNotBeEmpty();
    }

    [Fact]
    public async Task GetShippingOptions_SingleWarehouse_CreatesSingleGroup()
    {
        // Arrange: Both products from same warehouse
        var dataBuilder = _fixture.CreateDataBuilder();
        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);

        var warehouse = dataBuilder.CreateWarehouse("Main Warehouse", "GB");
        var shippingOption = dataBuilder.CreateShippingOption("Standard", warehouse, fixedCost: 5.00m);
        shippingOption.ShippingCosts.Add(new ShippingCost { CountryCode = "GB", Cost = 5.00m });
        dataBuilder.AddServiceRegion(warehouse, "GB");

        var productRootA = dataBuilder.CreateProductRoot("Product A", taxGroup);
        var productA = dataBuilder.CreateProduct("Widget A", productRootA, price: 25.00m);
        dataBuilder.AddWarehouseToProductRoot(productRootA, warehouse);
        dataBuilder.CreateProductWarehouse(productA, warehouse, stock: 50);

        var productRootB = dataBuilder.CreateProductRoot("Product B", taxGroup);
        var productB = dataBuilder.CreateProduct("Widget B", productRootB, price: 35.00m);
        dataBuilder.AddWarehouseToProductRoot(productRootB, warehouse);
        dataBuilder.CreateProductWarehouse(productB, warehouse, stock: 50);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var basket = await CreateBasketAsync("GB", productA, productB);
        var shippingAddress = CreateAddress("GB");

        // Act
        var result = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = shippingAddress
            });

        // Assert
        result.WarehouseGroups.Count.ShouldBe(1);
        result.WarehouseGroups[0].LineItems.Count.ShouldBe(2);
        result.WarehouseGroups[0].AvailableShippingOptions.ShouldNotBeEmpty();
    }

    [Fact]
    public async Task GetShippingOptions_WithSelectedOption_PreservesSelection()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var taxGroup = dataBuilder.CreateTaxGroup("Standard VAT", 20m);

        var warehouse = dataBuilder.CreateWarehouse("Warehouse", "GB");
        var standardOption = dataBuilder.CreateShippingOption("Standard", warehouse, fixedCost: 5.00m);
        standardOption.ShippingCosts.Add(new ShippingCost { CountryCode = "GB", Cost = 5.00m });
        var expressOption = dataBuilder.CreateShippingOption("Express", warehouse, fixedCost: 12.00m, daysFrom: 1, daysTo: 1, isNextDay: true);
        expressOption.ShippingCosts.Add(new ShippingCost { CountryCode = "GB", Cost = 12.00m });
        dataBuilder.AddServiceRegion(warehouse, "GB");

        var productRoot = dataBuilder.CreateProductRoot("Product", taxGroup);
        var product = dataBuilder.CreateProduct("Widget", productRoot, price: 30.00m);
        dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 50);

        await dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var basket = await CreateBasketAsync("GB", product);
        var shippingAddress = CreateAddress("GB");

        // First call to get the group ID
        var initialResult = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = shippingAddress
            });
        initialResult.WarehouseGroups.ShouldNotBeEmpty();
        var group = initialResult.WarehouseGroups.First();
        var expressSelectionKey = SelectionKeyExtensions.ForShippingOption(expressOption.Id);

        // Act: Call again with pre-selected option
        var selectedOptions = new Dictionary<Guid, string>
        {
            [group.GroupId] = expressSelectionKey
        };
        var result = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = shippingAddress,
                SelectedShippingOptions = selectedOptions
            });

        // Assert
        result.WarehouseGroups.ShouldNotBeEmpty();
        result.WarehouseGroups[0].SelectedShippingOptionId.ShouldBe(expressSelectionKey);
    }

    private async Task<Basket> CreateBasketAsync(string countryCode, params Product[] products)
    {
        var builder = _fixture.CreateDataBuilder();
        var basket = builder.CreateBasket();

        foreach (var product in products)
        {
            basket.LineItems.Add(builder.CreateBasketLineItem(product));
        }

        await _checkoutService.CalculateBasketAsync(new CalculateBasketParameters
        {
            Basket = basket,
            CountryCode = countryCode
        });

        return basket;
    }

    private Address CreateAddress(string countryCode)
    {
        var builder = _fixture.CreateDataBuilder();
        return builder.CreateTestAddress(countryCode: countryCode);
    }
}

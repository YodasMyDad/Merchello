using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;
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
[Collection("Integration")]
public class MultiWarehouseOrderGroupingTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IShippingService _shippingService;

    public MultiWarehouseOrderGroupingTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _shippingService = fixture.GetService<IShippingService>();
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

        var basket = CreateBasket("GBP", productA, productB);
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

        var basket = CreateBasket("GBP", productA, productB);
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

        var basket = CreateBasket("GBP", product);
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

    private static Basket CreateBasket(string currency, params Product[] products)
    {
        var lineItems = products.Select(p => new LineItem
        {
            Id = Guid.NewGuid(),
            ProductId = p.Id,
            Name = p.Name,
            Sku = p.Sku,
            Quantity = 1,
            Amount = p.Price,
            LineItemType = LineItemType.Product,
            IsTaxable = true,
            TaxRate = 20m
        }).ToList();

        var subTotal = lineItems.Sum(li => li.Amount * li.Quantity);
        var tax = Math.Round(subTotal * 0.2m, 2);

        return new Basket
        {
            Id = Guid.NewGuid(),
            Currency = currency,
            LineItems = lineItems,
            SubTotal = subTotal,
            Tax = tax,
            Total = subTotal + tax
        };
    }

    private static Address CreateAddress(string countryCode)
    {
        return new Address
        {
            Name = "Test Customer",
            Email = "test@example.com",
            AddressOne = "123 Test St",
            TownCity = "London",
            CountryCode = countryCode,
            PostalCode = "SW1A 1AA"
        };
    }
}

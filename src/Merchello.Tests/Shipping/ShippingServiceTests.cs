using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Services.Interfaces;
using Merchello.Core.Checkout.Services.Parameters;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services.Interfaces;
using Merchello.Core.Shipping.Services.Parameters;
using Merchello.Tests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Shipping;

/// <summary>
/// Integration tests for ShippingService.
/// Tests shipping option retrieval and basket grouping logic.
/// </summary>
[Collection("Integration Tests")]
public class ShippingServiceTests
{
    private readonly ServiceTestFixture _fixture;
    private readonly IShippingService _shippingService;
    private readonly ICheckoutService _checkoutService;
    private readonly TestDataBuilder _dataBuilder;

    public ShippingServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _shippingService = fixture.GetService<IShippingService>();
        _checkoutService = fixture.GetService<ICheckoutService>();
        _dataBuilder = fixture.CreateDataBuilder();
    }

    #region GetAllShippingOptions Tests

    [Fact]
    public async Task GetAllShippingOptions_ReturnsEmptyList_WhenNoOptions()
    {
        // Act
        var result = await _shippingService.GetAllShippingOptions();

        // Assert
        result.ShouldNotBeNull();
        result.ShouldBeEmpty();
    }

    [Fact]
    public async Task GetAllShippingOptions_ReturnsAllOptions()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse();
        _dataBuilder.CreateShippingOption("Standard Delivery", warehouse, fixedCost: 5m);
        _dataBuilder.CreateShippingOption("Express Delivery", warehouse, fixedCost: 15m, isNextDay: true);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _shippingService.GetAllShippingOptions();

        // Assert
        result.ShouldNotBeNull();
        result.Count.ShouldBe(2);
        result.ShouldContain(o => o.Name == "Standard Delivery");
        result.ShouldContain(o => o.Name == "Express Delivery");
    }

    [Fact]
    public async Task GetAllShippingOptions_ReturnsOrderedByName()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse();
        _dataBuilder.CreateShippingOption("Zebra Express", warehouse);
        _dataBuilder.CreateShippingOption("Alpha Shipping", warehouse);
        _dataBuilder.CreateShippingOption("Medium Priority", warehouse);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _shippingService.GetAllShippingOptions();

        // Assert
        result.Count.ShouldBe(3);
        result[0].Name.ShouldBe("Alpha Shipping");
        result[1].Name.ShouldBe("Medium Priority");
        result[2].Name.ShouldBe("Zebra Express");
    }

    #endregion

    #region GetShippingOptionsForProductAsync Tests

    [Fact]
    public async Task GetShippingOptionsForProductAsync_InvalidCountryCode_ReturnsError()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse();
        var product = _dataBuilder.CreateProduct();
        _dataBuilder.AddWarehouseToProductRoot(product.ProductRoot!, warehouse);
        await _dataBuilder.SaveChangesAsync();

        // Act
        var result = await _shippingService.GetShippingOptionsForProductAsync(product.Id, "");

        // Assert
        result.CanShipToLocation.ShouldBeFalse();
        result.Message!.ShouldContain("required");
    }

    [Fact]
    public async Task GetShippingOptionsForProductAsync_ProductNotFound_ReturnsError()
    {
        // Act
        var result = await _shippingService.GetShippingOptionsForProductAsync(
            Guid.NewGuid(), "GB");

        // Assert
        result.CanShipToLocation.ShouldBeFalse();
        result.Message!.ShouldContain("not found");
    }

    [Fact]
    public async Task GetShippingOptionsForProductAsync_WithServiceableWarehouse_ReturnsOptions()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse("UK Warehouse", "GB");
        _dataBuilder.AddServiceRegion(warehouse, "GB"); // Services GB
        var shippingOption = _dataBuilder.CreateShippingOption(
            "UK Standard", warehouse, fixedCost: 5m, daysFrom: 3, daysTo: 5);
        var product = _dataBuilder.CreateProduct();
        _dataBuilder.AddWarehouseToProductRoot(product.ProductRoot!, warehouse);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _shippingService.GetShippingOptionsForProductAsync(
            product.Id, "GB");

        // Assert
        result.CanShipToLocation.ShouldBeTrue();
        result.AvailableMethods.ShouldNotBeEmpty();
        result.AvailableMethods.First().Name.ShouldBe("UK Standard");
        result.AvailableMethods.First().EstimatedCost.ShouldBe(5m);
    }

    [Fact]
    public async Task GetShippingOptionsForProductAsync_NoServiceableWarehouse_ReturnsCannotShip()
    {
        // Arrange - Warehouse only services US, not GB
        var warehouse = _dataBuilder.CreateWarehouse("US Warehouse", "US");
        _dataBuilder.AddServiceRegion(warehouse, "US"); // Only services US
        _dataBuilder.CreateShippingOption("US Standard", warehouse);
        var product = _dataBuilder.CreateProduct();
        _dataBuilder.AddWarehouseToProductRoot(product.ProductRoot!, warehouse);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _shippingService.GetShippingOptionsForProductAsync(
            product.Id, "GB"); // Requesting GB but warehouse only services US

        // Assert
        result.CanShipToLocation.ShouldBeFalse();
        result.Message!.ShouldContain("cannot be shipped");
    }

    [Fact]
    public async Task GetShippingOptionsForProductAsync_WarehouseWithNoServiceRegions_ServicesEverywhere()
    {
        // Arrange - No service regions means global service
        var warehouse = _dataBuilder.CreateWarehouse("Global Warehouse", "GB");
        // Note: NOT adding service regions - means it services everywhere
        _dataBuilder.CreateShippingOption("Global Shipping", warehouse, fixedCost: 10m);
        var product = _dataBuilder.CreateProduct();
        _dataBuilder.AddWarehouseToProductRoot(product.ProductRoot!, warehouse);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act - Request shipping to any country
        var result = await _shippingService.GetShippingOptionsForProductAsync(
            product.Id, "JP"); // Japan - should work since no restrictions

        // Assert
        result.CanShipToLocation.ShouldBeTrue();
        result.AvailableMethods.ShouldNotBeEmpty();
    }

    [Fact]
    public async Task GetShippingOptionsForProductAsync_NextDayOption_ReturnsExpressServiceLevel()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse();
        _dataBuilder.CreateShippingOption("Next Day Delivery", warehouse, fixedCost: 25m, isNextDay: true);
        var product = _dataBuilder.CreateProduct();
        _dataBuilder.AddWarehouseToProductRoot(product.ProductRoot!, warehouse);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _shippingService.GetShippingOptionsForProductAsync(
            product.Id, "GB");

        // Assert
        result.CanShipToLocation.ShouldBeTrue();
        var nextDayMethod = result.AvailableMethods.FirstOrDefault(m => m.Name == "Next Day Delivery");
        nextDayMethod.ShouldNotBeNull();
        nextDayMethod.ServiceLevel.ShouldBe("express");
        nextDayMethod.DeliveryTimeDescription.ShouldBe("Next Day Delivery");
    }

    [Fact]
    public async Task GetShippingOptionsForProductAsync_RegionExclusion_BlocksSpecificStateOnly()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse("US Warehouse", "US");
        _dataBuilder.AddServiceRegion(warehouse, "US");
        var shippingOption = _dataBuilder.CreateShippingOption("US Ground", warehouse, fixedCost: 12m);
        shippingOption.SetExcludedRegions(
        [
            new ShippingOptionExcludedRegion
            {
                CountryCode = "US",
                RegionCode = "CA"
            }
        ]);

        var product = _dataBuilder.CreateProduct();
        _dataBuilder.AddWarehouseToProductRoot(product.ProductRoot!, warehouse);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var californiaResult = await _shippingService.GetShippingOptionsForProductAsync(product.Id, "US", "CA");
        var texasResult = await _shippingService.GetShippingOptionsForProductAsync(product.Id, "US", "TX");

        // Assert
        californiaResult.CanShipToLocation.ShouldBeFalse();
        californiaResult.AvailableMethods.ShouldBeEmpty();
        californiaResult.Message!.ShouldContain("No shipping options available");

        texasResult.CanShipToLocation.ShouldBeTrue();
        texasResult.AvailableMethods.ShouldContain(m => m.Name == "US Ground" && m.EstimatedCost == 12m);
    }

    #endregion

    #region Fulfillment Option Tests

    [Fact]
    public async Task GetFulfillmentOptionsForProductAsync_NoProductWarehouseStockRecord_ReturnsCannotAddToOrder()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse("North America Warehouse", "US");
        _dataBuilder.AddServiceRegion(warehouse, "CA");
        _dataBuilder.CreateShippingOption("International Standard", warehouse, fixedCost: 12m);

        var product = _dataBuilder.CreateProduct("Stocked By Mapping Only");
        _dataBuilder.AddWarehouseToProductRoot(product.ProductRoot!, warehouse);
        // Intentionally no ProductWarehouse row for this variant + warehouse.
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _shippingService.GetFulfillmentOptionsForProductAsync(product.Id, "CA");

        // Assert
        result.CanAddToOrder.ShouldBeFalse();
        result.HasAvailableStock.ShouldBeFalse();
        result.AvailableStock.ShouldBe(0);
        result.FulfillingWarehouse.ShouldBeNull();
        result.BlockedReason.ShouldBe("Out of stock");
    }

    [Fact]
    public async Task GetDefaultFulfillingWarehouseAsync_NoProductWarehouseStockRecord_ReturnsCannotAddToOrder()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse("Fallback Warehouse", "GB");
        _dataBuilder.CreateShippingOption("Standard", warehouse, fixedCost: 5m);

        var product = _dataBuilder.CreateProduct("Missing Variant Stock");
        _dataBuilder.AddWarehouseToProductRoot(product.ProductRoot!, warehouse);
        // Intentionally no ProductWarehouse row for this variant + warehouse.
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _shippingService.GetDefaultFulfillingWarehouseAsync(product.Id);

        // Assert
        result.CanAddToOrder.ShouldBeFalse();
        result.HasAvailableStock.ShouldBeFalse();
        result.AvailableStock.ShouldBe(0);
        result.BlockedReason.ShouldBe("Out of stock");
    }

    #endregion

    #region GetShippingOptionsForBasket Tests

    [Fact]
    public async Task GetShippingOptionsForBasket_EmptyCountryCode_ReturnsEmptyGroups()
    {
        // Arrange
        var basket = await CreateBasketAsync(null);
        var shippingAddress = CreateAddress(string.Empty);

        // Act
        var result = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = shippingAddress
            });

        // Assert
        result.WarehouseGroups.ShouldBeEmpty();
    }

    [Fact]
    public async Task GetShippingOptionsForBasket_EmptyBasket_ReturnsEmptyGroups()
    {
        // Arrange
        var basket = await CreateBasketAsync("GB"); // Empty basket
        var shippingAddress = CreateAddress("GB");

        // Act
        var result = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = shippingAddress
            });

        // Assert
        result.WarehouseGroups.ShouldBeEmpty();
    }

    [Fact]
    public async Task GetShippingOptionsForBasket_WithProduct_ReturnsWarehouseGroup()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse("UK Warehouse", "GB");
        var shippingOption = _dataBuilder.CreateShippingOption("Standard", warehouse, fixedCost: 5m);
        var product = _dataBuilder.CreateProduct("Test Product", price: 29.99m);
        _dataBuilder.AddWarehouseToProductRoot(product.ProductRoot!, warehouse);
        _dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var basket = await CreateBasketAsync("GB", (product, 1));
        var shippingAddress = CreateAddress("GB");

        // Act
        var result = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = shippingAddress
            });

        // Assert
        result.WarehouseGroups.ShouldNotBeEmpty();
        result.WarehouseGroups.First().WarehouseId.ShouldBe(warehouse.Id);
        result.WarehouseGroups.First().AvailableShippingOptions.ShouldNotBeEmpty();
    }

    [Fact]
    public async Task GetShippingOptionsForBasket_MultipleProductsSameWarehouse_GroupedTogether()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse();
        _dataBuilder.CreateShippingOption("Standard", warehouse);
        var product1 = _dataBuilder.CreateProduct("Product 1");
        var product2 = _dataBuilder.CreateProduct("Product 2");
        _dataBuilder.AddWarehouseToProductRoot(product1.ProductRoot!, warehouse);
        _dataBuilder.AddWarehouseToProductRoot(product2.ProductRoot!, warehouse);
        _dataBuilder.CreateProductWarehouse(product1, warehouse, stock: 100);
        _dataBuilder.CreateProductWarehouse(product2, warehouse, stock: 100);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var basket = await CreateBasketAsync("GB", (product1, 2), (product2, 1));
        var shippingAddress = CreateAddress("GB");

        // Act
        var result = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = shippingAddress
            });

        // Assert - Both products should be in the same group
        result.WarehouseGroups.Count.ShouldBe(1);
        result.WarehouseGroups.First().LineItems.Count.ShouldBe(2);
    }

    [Fact]
    public async Task GetShippingOptionsForBasket_StateExclusion_RemovesExcludedOptionFromGroup()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse("US Warehouse", "US");
        _dataBuilder.AddServiceRegion(warehouse, "US");

        var standard = _dataBuilder.CreateShippingOption("US Standard", warehouse, fixedCost: 10m);
        var californiaOnlyBlocked = _dataBuilder.CreateShippingOption("US Economy", warehouse, fixedCost: 5m);
        californiaOnlyBlocked.SetExcludedRegions(
        [
            new ShippingOptionExcludedRegion
            {
                CountryCode = "US",
                RegionCode = "CA"
            }
        ]);

        var product = _dataBuilder.CreateProduct("Test Product", price: 29.99m);
        _dataBuilder.AddWarehouseToProductRoot(product.ProductRoot!, warehouse);
        _dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var basket = await CreateBasketAsync("US", (product, 1));
        var shippingAddress = CreateAddress("US", "CA");

        // Act
        var result = await _shippingService.GetShippingOptionsForBasket(
            new GetShippingOptionsParameters
            {
                Basket = basket,
                ShippingAddress = shippingAddress
            });

        // Assert
        result.WarehouseGroups.ShouldNotBeEmpty();
        var options = result.WarehouseGroups.First().AvailableShippingOptions;
        options.ShouldContain(o => o.Name == standard.Name);
        options.ShouldNotContain(o => o.Name == californiaOnlyBlocked.Name);
    }

    #endregion

    #region GetShippingOptionsForWarehouseAsync Tests

    [Fact]
    public async Task GetShippingOptionsForWarehouseAsync_RegionExclusion_BlocksSpecificStateOnly()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse("US Warehouse", "US");
        _dataBuilder.AddServiceRegion(warehouse, "US");
        var shippingOption = _dataBuilder.CreateShippingOption("US Ground", warehouse, fixedCost: 9m);
        shippingOption.SetExcludedRegions(
        [
            new ShippingOptionExcludedRegion
            {
                CountryCode = "US",
                RegionCode = "CA"
            }
        ]);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var californiaResult = await _shippingService.GetShippingOptionsForWarehouseAsync(warehouse.Id, "US", "CA");
        var texasResult = await _shippingService.GetShippingOptionsForWarehouseAsync(warehouse.Id, "US", "TX");

        // Assert
        californiaResult.CanShipToDestination.ShouldBeFalse();
        californiaResult.AvailableOptions.ShouldBeEmpty();
        californiaResult.Message!.ShouldContain("No shipping options available");

        texasResult.CanShipToDestination.ShouldBeTrue();
        texasResult.AvailableOptions.ShouldContain(o => o.Name == "US Ground" && o.EstimatedCost == 9m);
    }

    #endregion

    #region GetRequiredWarehouses Tests

    [Fact]
    public async Task GetRequiredWarehouses_EmptyBasket_ReturnsEmptyList()
    {
        // Arrange
        var basket = await CreateBasketAsync("GB");
        var shippingAddress = CreateAddress("GB");

        // Act
        var result = await _shippingService.GetRequiredWarehouses(basket, shippingAddress);

        // Assert
        result.ShouldBeEmpty();
    }

    [Fact]
    public async Task GetRequiredWarehouses_WithProducts_ReturnsDistinctWarehouses()
    {
        // Arrange
        var warehouse1 = _dataBuilder.CreateWarehouse("Warehouse 1");
        var warehouse2 = _dataBuilder.CreateWarehouse("Warehouse 2");
        _dataBuilder.CreateShippingOption("Standard", warehouse1);
        _dataBuilder.CreateShippingOption("Standard", warehouse2);

        var product1 = _dataBuilder.CreateProduct("Product 1");
        var product2 = _dataBuilder.CreateProduct("Product 2");
        _dataBuilder.AddWarehouseToProductRoot(product1.ProductRoot!, warehouse1);
        _dataBuilder.AddWarehouseToProductRoot(product2.ProductRoot!, warehouse2);
        _dataBuilder.CreateProductWarehouse(product1, warehouse1, stock: 100);
        _dataBuilder.CreateProductWarehouse(product2, warehouse2, stock: 100);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var basket = await CreateBasketAsync("GB", (product1, 1), (product2, 1));
        var shippingAddress = CreateAddress("GB");

        // Act
        var result = await _shippingService.GetRequiredWarehouses(basket, shippingAddress);

        // Assert
        result.Count.ShouldBe(2);
        result.ShouldContain(warehouse1.Id);
        result.ShouldContain(warehouse2.Id);
    }

    #endregion

    #region Helper Methods

    private async Task<Basket> CreateBasketAsync(string? countryCode, params (Product Product, int Quantity)[] items)
    {
        var basket = _dataBuilder.CreateBasket();
        foreach (var (product, quantity) in items)
        {
            var lineItem = _dataBuilder.CreateBasketLineItem(product, quantity);
            basket.LineItems.Add(lineItem);
        }

        if (!string.IsNullOrWhiteSpace(countryCode))
        {
            await _checkoutService.CalculateBasketAsync(new CalculateBasketParameters
            {
                Basket = basket,
                CountryCode = countryCode
            });
        }

        return basket;
    }

    private Address CreateAddress(string countryCode, string? regionCode = null)
    {
        var address = _dataBuilder.CreateTestAddress(countryCode: countryCode);
        if (!string.IsNullOrWhiteSpace(regionCode))
        {
            address.CountyState.RegionCode = regionCode;
        }

        return address;
    }

    #endregion
}

using Merchello.Core.Accounting.Models;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Checkout.Strategies;
using Merchello.Core.Checkout.Strategies.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Warehouses.Models;
using Merchello.Core.Warehouses.Services.Interfaces;
using Microsoft.Extensions.Logging;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Checkout.Strategies;

public class DefaultOrderGroupingStrategyTests
{
    private readonly Mock<IWarehouseService> _warehouseServiceMock;
    private readonly Mock<ILogger<DefaultOrderGroupingStrategy>> _loggerMock;
    private readonly DefaultOrderGroupingStrategy _strategy;

    public DefaultOrderGroupingStrategyTests()
    {
        _warehouseServiceMock = new Mock<IWarehouseService>();
        _loggerMock = new Mock<ILogger<DefaultOrderGroupingStrategy>>();
        _strategy = new DefaultOrderGroupingStrategy(_warehouseServiceMock.Object, _loggerMock.Object);
    }

    [Fact]
    public void Metadata_ReturnsCorrectValues()
    {
        // Assert
        _strategy.Metadata.Key.ShouldBe("default-warehouse");
        _strategy.Metadata.DisplayName.ShouldBe("Warehouse Grouping");
        _strategy.Metadata.Description.ShouldNotBeNullOrEmpty();
    }

    [Fact]
    public async Task GroupItemsAsync_EmptyCountryCode_ReturnsError()
    {
        // Arrange
        var context = CreateContext(countryCode: "");

        // Act
        var result = await _strategy.GroupItemsAsync(context);

        // Assert
        result.Success.ShouldBeFalse();
        result.Errors.ShouldContain(e => e.Contains("country code"));
    }

    [Fact]
    public async Task GroupItemsAsync_SingleProduct_SingleWarehouse_CreatesOneGroup()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var shippingOptionId = Guid.NewGuid();

        var warehouse = CreateWarehouse(warehouseId, "Main Warehouse", shippingOptionId);
        var product = CreateProduct(productId, warehouse);

        var context = CreateContext(
            products: new Dictionary<Guid, Product> { [productId] = product },
            warehouses: new Dictionary<Guid, Warehouse> { [warehouseId] = warehouse },
            lineItems: [CreateLineItem(productId, quantity: 2)]);

        _warehouseServiceMock
            .Setup(x => x.SelectWarehouseForProduct(
                It.IsAny<Product>(),
                It.IsAny<Address>(),
                It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WarehouseSelectionResult
            {
                Warehouse = warehouse
            });

        // Act
        var result = await _strategy.GroupItemsAsync(context);

        // Assert
        result.Success.ShouldBeTrue();
        result.Groups.Count.ShouldBe(1);
        result.Groups[0].WarehouseId.ShouldBe(warehouseId);
        result.Groups[0].LineItems.Count.ShouldBe(1);
        result.Groups[0].LineItems[0].Quantity.ShouldBe(2);
    }

    [Fact]
    public async Task GroupItemsAsync_TwoProducts_SameWarehouse_CreatesOneGroup()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        var productId1 = Guid.NewGuid();
        var productId2 = Guid.NewGuid();
        var shippingOptionId = Guid.NewGuid();

        var warehouse = CreateWarehouse(warehouseId, "Main Warehouse", shippingOptionId);
        var product1 = CreateProduct(productId1, warehouse);
        var product2 = CreateProduct(productId2, warehouse);

        var context = CreateContext(
            products: new Dictionary<Guid, Product>
            {
                [productId1] = product1,
                [productId2] = product2
            },
            warehouses: new Dictionary<Guid, Warehouse> { [warehouseId] = warehouse },
            lineItems:
            [
                CreateLineItem(productId1, quantity: 1),
                CreateLineItem(productId2, quantity: 3)
            ]);

        _warehouseServiceMock
            .Setup(x => x.SelectWarehouseForProduct(
                It.IsAny<Product>(),
                It.IsAny<Address>(),
                It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WarehouseSelectionResult
            {
                Warehouse = warehouse
            });

        // Act
        var result = await _strategy.GroupItemsAsync(context);

        // Assert
        result.Success.ShouldBeTrue();
        result.Groups.Count.ShouldBe(1);
        result.Groups[0].LineItems.Count.ShouldBe(2);
    }

    [Fact]
    public async Task GroupItemsAsync_TwoProducts_DifferentWarehouses_CreatesTwoGroups()
    {
        // Arrange
        var warehouseId1 = Guid.NewGuid();
        var warehouseId2 = Guid.NewGuid();
        var productId1 = Guid.NewGuid();
        var productId2 = Guid.NewGuid();
        var shippingOptionId = Guid.NewGuid();

        var warehouse1 = CreateWarehouse(warehouseId1, "London Warehouse", shippingOptionId);
        var warehouse2 = CreateWarehouse(warehouseId2, "Manchester Warehouse", shippingOptionId);
        var product1 = CreateProduct(productId1, warehouse1);
        var product2 = CreateProduct(productId2, warehouse2);

        var context = CreateContext(
            products: new Dictionary<Guid, Product>
            {
                [productId1] = product1,
                [productId2] = product2
            },
            warehouses: new Dictionary<Guid, Warehouse>
            {
                [warehouseId1] = warehouse1,
                [warehouseId2] = warehouse2
            },
            lineItems:
            [
                CreateLineItem(productId1, quantity: 1),
                CreateLineItem(productId2, quantity: 1)
            ]);

        _warehouseServiceMock
            .Setup(x => x.SelectWarehouseForProduct(
                It.Is<Product>(p => p.Id == productId1),
                It.IsAny<Address>(),
                It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WarehouseSelectionResult
            {
                Warehouse = warehouse1
            });

        _warehouseServiceMock
            .Setup(x => x.SelectWarehouseForProduct(
                It.Is<Product>(p => p.Id == productId2),
                It.IsAny<Address>(),
                It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WarehouseSelectionResult
            {
                Warehouse = warehouse2
            });

        // Act
        var result = await _strategy.GroupItemsAsync(context);

        // Assert
        result.Success.ShouldBeTrue();
        result.Groups.Count.ShouldBe(2);
        result.Groups.ShouldContain(g => g.WarehouseId == warehouseId1);
        result.Groups.ShouldContain(g => g.WarehouseId == warehouseId2);
    }

    [Fact]
    public async Task GroupItemsAsync_WarehouseSelectionFails_AddsError()
    {
        // Arrange
        var productId = Guid.NewGuid();
        var product = CreateProduct(productId, null!);

        var context = CreateContext(
            products: new Dictionary<Guid, Product> { [productId] = product },
            warehouses: new Dictionary<Guid, Warehouse>(),
            lineItems: [CreateLineItem(productId)]);

        _warehouseServiceMock
            .Setup(x => x.SelectWarehouseForProduct(
                It.IsAny<Product>(),
                It.IsAny<Address>(),
                It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WarehouseSelectionResult
            {
                FailureReason = "No warehouse has sufficient stock"
            });

        // Act
        var result = await _strategy.GroupItemsAsync(context);

        // Assert
        result.Errors.ShouldContain(e => e.Contains("No warehouse has sufficient stock"));
    }

    [Fact]
    public async Task GroupItemsAsync_DeterministicGroupId_ConsistentAcrossCalls()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        var productId = Guid.NewGuid();
        var shippingOptionId = Guid.NewGuid();

        var warehouse = CreateWarehouse(warehouseId, "Test", shippingOptionId);
        var product = CreateProduct(productId, warehouse);

        var context = CreateContext(
            products: new Dictionary<Guid, Product> { [productId] = product },
            warehouses: new Dictionary<Guid, Warehouse> { [warehouseId] = warehouse },
            lineItems: [CreateLineItem(productId)]);

        _warehouseServiceMock
            .Setup(x => x.SelectWarehouseForProduct(
                It.IsAny<Product>(),
                It.IsAny<Address>(),
                It.IsAny<int>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WarehouseSelectionResult
            {
                Warehouse = warehouse
            });

        // Act
        var result1 = await _strategy.GroupItemsAsync(context);
        var result2 = await _strategy.GroupItemsAsync(context);

        // Assert
        result1.Groups[0].GroupId.ShouldBe(result2.Groups[0].GroupId);
    }

    private static OrderGroupingContext CreateContext(
        Dictionary<Guid, Product>? products = null,
        Dictionary<Guid, Warehouse>? warehouses = null,
        List<LineItem>? lineItems = null,
        string countryCode = "GB")
    {
        return new OrderGroupingContext
        {
            Basket = new Basket
            {
                Id = Guid.NewGuid(),
                LineItems = lineItems ?? [],
                SubTotal = 100m,
                Tax = 20m,
                Total = 120m
            },
            BillingAddress = new Address(),
            ShippingAddress = new Address
            {
                CountryCode = countryCode
            },
            Products = products ?? new Dictionary<Guid, Product>(),
            Warehouses = warehouses ?? new Dictionary<Guid, Warehouse>()
        };
    }

    private static LineItem CreateLineItem(Guid productId, int quantity = 1, decimal amount = 50m)
    {
        return new LineItem
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            Name = "Test Product",
            Sku = "TEST-SKU",
            Quantity = quantity,
            Amount = amount
        };
    }

    private static Warehouse CreateWarehouse(Guid id, string name, Guid shippingOptionId)
    {
        return new Warehouse
        {
            Id = id,
            Name = name,
            ShippingOptions = new List<ShippingOption>
            {
                new()
                {
                    Id = shippingOptionId,
                    Name = "Standard Delivery",
                    DaysFrom = 3,
                    DaysTo = 5,
                    FixedCost = 5.99m
                }
            }
        };
    }

    private static Product CreateProduct(Guid id, Warehouse? warehouse)
    {
        var product = new Product
        {
            Id = id,
            Name = "Test Product",
            Sku = "TEST-SKU",
            Price = 50m,
            ShippingOptions = warehouse?.ShippingOptions.ToList() ?? []
        };
        return product;
    }
}


using Merchello.Core.Products.ExtensionMethods;
using Merchello.Core.Products.Models;
using Merchello.Core.Warehouses.Models;
using Shouldly;

namespace Merchello.Tests.Products;

public class ProductExtensionMethodsTests
{
    [Fact]
    public void GetAvailableStockInWarehouse_WithTrackedItem_ReturnsStockMinusReserved()
    {
        // Arrange
        var warehouse = new Warehouse { Name = "Test" };
        var product = new Product
        {
            Name = "Test Product",
            ProductWarehouses =
            [
                new ProductWarehouse
                {
                    Warehouse = warehouse,
                    WarehouseId = warehouse.Id,
                    Stock = 100,
                    ReservedStock = 30,
                    TrackStock = true
                }
            ]
        };

        // Act
        var available = product.GetAvailableStockInWarehouse(warehouse.Id);

        // Assert
        available.ShouldBe(70); // 100 - 30
    }

    [Fact]
    public void GetAvailableStockInWarehouse_WithUntrackedItem_ReturnsMaxValue()
    {
        // Arrange
        var warehouse = new Warehouse { Name = "Test" };
        var product = new Product
        {
            Name = "Digital Product",
            ProductWarehouses =
            [
                new ProductWarehouse
                {
                    Warehouse = warehouse,
                    WarehouseId = warehouse.Id,
                    Stock = 0,
                    ReservedStock = 0,
                    TrackStock = false
                }
            ]
        };

        // Act
        var available = product.GetAvailableStockInWarehouse(warehouse.Id);

        // Assert
        available.ShouldBe(int.MaxValue);
    }

    [Fact]
    public void HasAvailableStockInWarehouse_WithSufficientStock_ReturnsTrue()
    {
        // Arrange
        var warehouse = new Warehouse { Name = "Test" };
        var product = new Product
        {
            Name = "Test Product",
            ProductWarehouses =
            [
                new ProductWarehouse
                {
                    Warehouse = warehouse,
                    WarehouseId = warehouse.Id,
                    Stock = 100,
                    ReservedStock = 20,
                    TrackStock = true
                }
            ]
        };

        // Act
        var hasStock = product.HasAvailableStockInWarehouse(warehouse.Id, 50);

        // Assert
        hasStock.ShouldBeTrue(); // 100 - 20 = 80 available, need 50
    }

    [Fact]
    public void HasAvailableStockInWarehouse_WithInsufficientStock_ReturnsFalse()
    {
        // Arrange
        var warehouse = new Warehouse { Name = "Test" };
        var product = new Product
        {
            Name = "Test Product",
            ProductWarehouses =
            [
                new ProductWarehouse
                {
                    Warehouse = warehouse,
                    WarehouseId = warehouse.Id,
                    Stock = 100,
                    ReservedStock = 80,
                    TrackStock = true
                }
            ]
        };

        // Act
        var hasStock = product.HasAvailableStockInWarehouse(warehouse.Id, 50);

        // Assert
        hasStock.ShouldBeFalse(); // 100 - 80 = 20 available, need 50
    }

    [Fact]
    public void HasAvailableStockInWarehouse_WithUntrackedItem_AlwaysReturnsTrue()
    {
        // Arrange
        var warehouse = new Warehouse { Name = "Test" };
        var product = new Product
        {
            Name = "Digital Product",
            ProductWarehouses =
            [
                new ProductWarehouse
                {
                    Warehouse = warehouse,
                    WarehouseId = warehouse.Id,
                    Stock = 0,
                    ReservedStock = 0,
                    TrackStock = false
                }
            ]
        };

        // Act
        var hasStock = product.HasAvailableStockInWarehouse(warehouse.Id, 1000000);

        // Assert
        hasStock.ShouldBeTrue(); // Always true for untracked items
    }

    [Fact]
    public void IsStockTrackedInWarehouse_ReturnsCorrectValue()
    {
        // Arrange
        var warehouse1 = new Warehouse { Name = "Warehouse 1" };
        var warehouse2 = new Warehouse { Name = "Warehouse 2" };

        var product = new Product
        {
            Name = "Test Product",
            ProductWarehouses =
            [
                new ProductWarehouse
                {
                    Warehouse = warehouse1,
                    WarehouseId = warehouse1.Id,
                    Stock = 100,
                    TrackStock = true
                },
                new ProductWarehouse
                {
                    Warehouse = warehouse2,
                    WarehouseId = warehouse2.Id,
                    Stock = 0,
                    TrackStock = false
                }
            ]
        };

        // Act & Assert
        product.IsStockTrackedInWarehouse(warehouse1.Id).ShouldBeTrue();
        product.IsStockTrackedInWarehouse(warehouse2.Id).ShouldBeFalse();
    }

    [Fact]
    public void IsStockTrackedInWarehouse_WithNonexistentWarehouse_ReturnsTrue()
    {
        // Arrange
        var product = new Product
        {
            Name = "Test Product",
            ProductWarehouses = []
        };

        // Act
        var isTracked = product.IsStockTrackedInWarehouse(Guid.NewGuid());

        // Assert
        isTracked.ShouldBeTrue(); // Default behavior when no ProductWarehouse exists
    }
}


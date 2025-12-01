using Merchello.Core.Data;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Warehouses.Factories;
using Merchello.Core.Warehouses.Models;
using Merchello.Core.Warehouses.Services;
using Merchello.Core.Warehouses.Services.Parameters;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;

namespace Merchello.Tests.Warehouses;

public class WarehouseServiceTests : IClassFixture<ServiceTestFixture>
{
    private readonly IMerchDbContext _dbContext;
    private readonly WarehouseService _warehouseService;
    private readonly Mock<ILogger<WarehouseService>> _loggerMock;
    private readonly WarehouseFactory _warehouseFactory;

    public WarehouseServiceTests(ServiceTestFixture fixture)
    {
        fixture.ResetDatabase();
        _dbContext = fixture.DbContext;
        _loggerMock = new Mock<ILogger<WarehouseService>>();
        _warehouseFactory = new WarehouseFactory();
        _warehouseService = new WarehouseService(_dbContext, _warehouseFactory, _loggerMock.Object);
    }

    #region Warehouse CRUD Tests

    [Fact]
    public async Task CreateWarehouse_ShouldCreateWarehouseSuccessfully()
    {
        // Arrange
        var parameters = new CreateWarehouseParameters
        {
            Name = "Test Warehouse",
            Code = "TW-01",
            Address = new Address { CountryCode = "GB", Country = "United Kingdom" }
        };

        // Act
        var result = await _warehouseService.CreateWarehouse(parameters);

        // Assert
        Assert.True(result.Successful);
        Assert.NotNull(result.ResultObject);
        Assert.Equal("Test Warehouse", result.ResultObject.Name);
        Assert.Equal("TW-01", result.ResultObject.Code);

        var savedWarehouse = await _dbContext.Warehouses.FirstOrDefaultAsync(w => w.Code == "TW-01");
        Assert.NotNull(savedWarehouse);
    }

    [Fact]
    public async Task UpdateWarehouse_ShouldUpdateWarehouseProperties()
    {
        // Arrange
        var warehouse = _warehouseFactory.Create("Original Name");
        _dbContext.Warehouses.Add(warehouse);
        await _dbContext.SaveChangesAsync();

        var parameters = new UpdateWarehouseParameters
        {
            WarehouseId = warehouse.Id,
            Name = "Updated Name",
            Code = "NEW-CODE"
        };

        // Act
        var result = await _warehouseService.UpdateWarehouse(parameters);

        // Assert
        Assert.True(result.Successful);
        Assert.Equal("Updated Name", result.ResultObject!.Name);
        Assert.Equal("NEW-CODE", result.ResultObject.Code);
    }

    [Fact]
    public async Task DeleteWarehouse_WithNoDependencies_ShouldDeleteSuccessfully()
    {
        // Arrange
        var warehouse = _warehouseFactory.Create("Test Warehouse");
        _dbContext.Warehouses.Add(warehouse);
        await _dbContext.SaveChangesAsync();

        // Act
        var result = await _warehouseService.DeleteWarehouse(warehouse.Id);

        // Assert
        Assert.True(result.Successful);
        var deletedWarehouse = await _dbContext.Warehouses.FindAsync(warehouse.Id);
        Assert.Null(deletedWarehouse);
    }

    [Fact]
    public async Task DeleteWarehouse_WithStockRecords_ShouldFailWithoutForce()
    {
        // Arrange
        var warehouse = CreateTestWarehouse();
        var product = CreateTestProduct();
        var productWarehouse = new ProductWarehouse
        {
            ProductId = product.Id,
            WarehouseId = warehouse.Id,
            Stock = 10
        };
        _dbContext.ProductWarehouses.Add(productWarehouse);
        await _dbContext.SaveChangesAsync();

        // Act
        var result = await _warehouseService.DeleteWarehouse(warehouse.Id, force: false);

        // Assert
        Assert.False(result.Successful);
        Assert.Contains(result.Messages!, m => m.Message!.Contains("stock record"));
    }

    [Fact]
    public async Task DeleteWarehouse_WithStockRecords_ShouldSucceedWithForce()
    {
        // Arrange
        var warehouse = CreateTestWarehouse();
        var product = CreateTestProduct();
        var productWarehouse = new ProductWarehouse
        {
            ProductId = product.Id,
            WarehouseId = warehouse.Id,
            Stock = 10
        };
        _dbContext.ProductWarehouses.Add(productWarehouse);
        await _dbContext.SaveChangesAsync();

        // Act
        var result = await _warehouseService.DeleteWarehouse(warehouse.Id, force: true);

        // Assert
        Assert.True(result.Successful);
        var deletedWarehouse = await _dbContext.Warehouses.FindAsync(warehouse.Id);
        Assert.Null(deletedWarehouse);

        var stockRecord = await _dbContext.ProductWarehouses
            .FirstOrDefaultAsync(pw => pw.WarehouseId == warehouse.Id);
        Assert.Null(stockRecord);
    }

    #endregion

    #region ProductRootWarehouse Management Tests

    [Fact]
    public async Task AddWarehouseToProductRoot_ShouldCreateAssociation()
    {
        // Arrange
        var warehouse = CreateTestWarehouse();
        var productRoot = CreateTestProductRoot();

        // Act
        var result = await _warehouseService.AddWarehouseToProductRoot(
            productRoot.Id, warehouse.Id, priorityOrder: 1);

        // Assert
        Assert.True(result.Successful);

        var association = await _dbContext.ProductRootWarehouses
            .FirstOrDefaultAsync(prw =>
                prw.ProductRootId == productRoot.Id &&
                prw.WarehouseId == warehouse.Id);

        Assert.NotNull(association);
        Assert.Equal(1, association.PriorityOrder);
    }

    [Fact]
    public async Task RemoveWarehouseFromProductRoot_ShouldCleanupStockRecords()
    {
        // Arrange
        var warehouse = CreateTestWarehouse();
        var productRoot = CreateTestProductRoot();
        var product = CreateTestProduct("Test Product", productRoot.Id);

        // Create association
        var association = new ProductRootWarehouse
        {
            ProductRootId = productRoot.Id,
            WarehouseId = warehouse.Id,
            PriorityOrder = 1
        };
        _dbContext.ProductRootWarehouses.Add(association);

        // Create stock record
        var stock = new ProductWarehouse
        {
            ProductId = product.Id,
            WarehouseId = warehouse.Id,
            Stock = 100
        };
        _dbContext.ProductWarehouses.Add(stock);
        await _dbContext.SaveChangesAsync();

        // Act
        var result = await _warehouseService.RemoveWarehouseFromProductRoot(
            productRoot.Id, warehouse.Id);

        // Assert
        Assert.True(result.Successful);

        // Association should be deleted
        var deletedAssociation = await _dbContext.ProductRootWarehouses
            .FirstOrDefaultAsync(prw =>
                prw.ProductRootId == productRoot.Id &&
                prw.WarehouseId == warehouse.Id);
        Assert.Null(deletedAssociation);

        // Stock records should be cleaned up
        var stockRecords = await _dbContext.ProductWarehouses
            .Where(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse.Id)
            .ToListAsync();
        Assert.Empty(stockRecords);
    }

    [Fact]
    public async Task UpdateWarehousePriority_ShouldUpdatePriorityOrder()
    {
        // Arrange
        var warehouse = CreateTestWarehouse();
        var productRoot = CreateTestProductRoot();

        var association = new ProductRootWarehouse
        {
            ProductRootId = productRoot.Id,
            WarehouseId = warehouse.Id,
            PriorityOrder = 1
        };
        _dbContext.ProductRootWarehouses.Add(association);
        await _dbContext.SaveChangesAsync();

        // Act
        var result = await _warehouseService.UpdateWarehousePriority(
            productRoot.Id, warehouse.Id, newPriorityOrder: 5);

        // Assert
        Assert.True(result.Successful);

        var updatedAssociation = await _dbContext.ProductRootWarehouses
            .FirstOrDefaultAsync(prw =>
                prw.ProductRootId == productRoot.Id &&
                prw.WarehouseId == warehouse.Id);

        Assert.NotNull(updatedAssociation);
        Assert.Equal(5, updatedAssociation.PriorityOrder);
    }

    #endregion

    #region Stock Management Tests

    [Fact]
    public async Task SetProductStock_ShouldCreateNewStockRecord()
    {
        // Arrange
        var warehouse = CreateTestWarehouse();
        var product = CreateTestProduct();

        // Act
        var result = await _warehouseService.SetProductStock(
            product.Id, warehouse.Id, stock: 50, reorderPoint: 10, reorderQuantity: 30);

        // Assert
        Assert.True(result.Successful);

        var stockRecord = await _dbContext.ProductWarehouses
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse.Id);

        Assert.NotNull(stockRecord);
        Assert.Equal(50, stockRecord.Stock);
        Assert.Equal(10, stockRecord.ReorderPoint);
        Assert.Equal(30, stockRecord.ReorderQuantity);
    }

    [Fact]
    public async Task SetProductStock_WithNegativeStock_ShouldFail()
    {
        // Arrange
        var warehouse = CreateTestWarehouse();
        var product = CreateTestProduct();

        // Act
        var result = await _warehouseService.SetProductStock(
            product.Id, warehouse.Id, stock: -10);

        // Assert
        Assert.False(result.Successful);
        Assert.Contains(result.Messages!, m => m.Message!.Contains("cannot be negative"));
    }

    [Fact]
    public async Task AdjustStock_ShouldIncreaseStock()
    {
        // Arrange
        var warehouse = CreateTestWarehouse();
        var product = CreateTestProduct();
        await _warehouseService.SetProductStock(product.Id, warehouse.Id, stock: 50);

        var parameters = new StockAdjustmentParameters
        {
            ProductId = product.Id,
            WarehouseId = warehouse.Id,
            Adjustment = 25,
            Reason = "Restock"
        };

        // Act
        var result = await _warehouseService.AdjustStock(parameters);

        // Assert
        Assert.True(result.Successful);

        var stockRecord = await _dbContext.ProductWarehouses
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse.Id);

        Assert.Equal(75, stockRecord!.Stock);
    }

    [Fact]
    public async Task AdjustStock_ShouldDecreaseStock()
    {
        // Arrange
        var warehouse = CreateTestWarehouse();
        var product = CreateTestProduct();
        await _warehouseService.SetProductStock(product.Id, warehouse.Id, stock: 50);

        var parameters = new StockAdjustmentParameters
        {
            ProductId = product.Id,
            WarehouseId = warehouse.Id,
            Adjustment = -20,
            Reason = "Sale"
        };

        // Act
        var result = await _warehouseService.AdjustStock(parameters);

        // Assert
        Assert.True(result.Successful);

        var stockRecord = await _dbContext.ProductWarehouses
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse.Id);

        Assert.Equal(30, stockRecord!.Stock);
    }

    [Fact]
    public async Task AdjustStock_ResultingInNegative_ShouldFail()
    {
        // Arrange
        var warehouse = CreateTestWarehouse();
        var product = CreateTestProduct();
        await _warehouseService.SetProductStock(product.Id, warehouse.Id, stock: 10);

        var parameters = new StockAdjustmentParameters
        {
            ProductId = product.Id,
            WarehouseId = warehouse.Id,
            Adjustment = -20
        };

        // Act
        var result = await _warehouseService.AdjustStock(parameters);

        // Assert
        Assert.False(result.Successful);
        Assert.Contains(result.Messages!, m => m.Message!.Contains("negative stock"));
    }

    [Fact]
    public async Task TransferStock_ShouldMoveStockBetweenWarehouses()
    {
        // Arrange
        var warehouse1 = CreateTestWarehouse("Warehouse 1");
        var warehouse2 = CreateTestWarehouse("Warehouse 2");
        var product = CreateTestProduct();

        await _warehouseService.SetProductStock(product.Id, warehouse1.Id, stock: 100);
        await _warehouseService.SetProductStock(product.Id, warehouse2.Id, stock: 50);

        // Act
        var result = await _warehouseService.TransferStock(
            product.Id, warehouse1.Id, warehouse2.Id, quantity: 30);

        // Assert
        Assert.True(result.Successful);

        var stock1 = await _dbContext.ProductWarehouses
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse1.Id);
        var stock2 = await _dbContext.ProductWarehouses
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse2.Id);

        Assert.Equal(70, stock1!.Stock);
        Assert.Equal(80, stock2!.Stock);
    }

    [Fact]
    public async Task TransferStock_InsufficientStock_ShouldFail()
    {
        // Arrange
        var warehouse1 = CreateTestWarehouse("Warehouse 1");
        var warehouse2 = CreateTestWarehouse("Warehouse 2");
        var product = CreateTestProduct();

        await _warehouseService.SetProductStock(product.Id, warehouse1.Id, stock: 10);

        // Act
        var result = await _warehouseService.TransferStock(
            product.Id, warehouse1.Id, warehouse2.Id, quantity: 50);

        // Assert
        Assert.False(result.Successful);
        Assert.Contains(result.Messages!, m => m.Message!.Contains("Insufficient"));
    }

    [Fact]
    public async Task TransferStock_ToSameWarehouse_ShouldFail()
    {
        // Arrange
        var warehouse = CreateTestWarehouse();
        var product = CreateTestProduct();
        await _warehouseService.SetProductStock(product.Id, warehouse.Id, stock: 100);

        // Act
        var result = await _warehouseService.TransferStock(
            product.Id, warehouse.Id, warehouse.Id, quantity: 10);

        // Assert
        Assert.False(result.Successful);
        Assert.Contains(result.Messages!, m => m.Message!.Contains("same warehouse"));
    }

    #endregion

    #region Inventory Query Tests

    [Fact]
    public async Task GetProductStockLevels_ShouldReturnAllWarehouses()
    {
        // Arrange
        var warehouse1 = CreateTestWarehouse("Warehouse 1");
        var warehouse2 = CreateTestWarehouse("Warehouse 2");
        var product = CreateTestProduct();

        await _warehouseService.SetProductStock(product.Id, warehouse1.Id, stock: 100, reorderPoint: 20);
        await _warehouseService.SetProductStock(product.Id, warehouse2.Id, stock: 50, reorderPoint: 10);

        // Act
        var stockLevels = await _warehouseService.GetProductStockLevels(product.Id);

        // Assert
        Assert.Equal(2, stockLevels.Count);
        Assert.Contains(stockLevels, sl => sl.WarehouseId == warehouse1.Id && sl.Stock == 100);
        Assert.Contains(stockLevels, sl => sl.WarehouseId == warehouse2.Id && sl.Stock == 50);
    }

    [Fact]
    public async Task GetWarehouseInventory_ShouldReturnAllProducts()
    {
        // Arrange
        var warehouse = CreateTestWarehouse();
        var product1 = CreateTestProduct("Product 1", null);
        var product2 = CreateTestProduct("Product 2", null);

        await _warehouseService.SetProductStock(product1.Id, warehouse.Id, stock: 100);
        await _warehouseService.SetProductStock(product2.Id, warehouse.Id, stock: 50);

        // Act
        var inventory = await _warehouseService.GetWarehouseInventory(warehouse.Id);

        // Assert
        Assert.Equal(2, inventory.Count);
        Assert.Contains(inventory, i => i.ProductId == product1.Id);
        Assert.Contains(inventory, i => i.ProductId == product2.Id);
    }

    [Fact]
    public async Task GetWarehouseInventory_LowStockOnly_ShouldFilterCorrectly()
    {
        // Arrange
        var warehouse = CreateTestWarehouse();
        var product1 = CreateTestProduct("Product 1", null);
        var product2 = CreateTestProduct("Product 2", null);
        var product3 = CreateTestProduct("Product 3", null);

        await _warehouseService.SetProductStock(product1.Id, warehouse.Id, stock: 3, reorderPoint: 5); // Low
        await _warehouseService.SetProductStock(product2.Id, warehouse.Id, stock: 50, reorderPoint: 10); // OK
        await _warehouseService.SetProductStock(product3.Id, warehouse.Id, stock: 5, reorderPoint: 20); // Low

        // Act
        var lowStockInventory = await _warehouseService.GetWarehouseInventory(warehouse.Id, lowStockOnly: true);

        // Assert
        Assert.Equal(2, lowStockInventory.Count);
        Assert.Contains(lowStockInventory, i => i.ProductId == product1.Id);
        Assert.Contains(lowStockInventory, i => i.ProductId == product3.Id);
        Assert.DoesNotContain(lowStockInventory, i => i.ProductId == product2.Id);
    }

    [Fact]
    public async Task GetLowStockProducts_ShouldReturnProductsBelowReorderPoint()
    {
        // Arrange
        var warehouse = CreateTestWarehouse();
        var product1 = CreateTestProduct("Low Stock Product", null);
        var product2 = CreateTestProduct("Good Stock Product", null);

        await _warehouseService.SetProductStock(product1.Id, warehouse.Id, stock: 3, reorderPoint: 10);
        await _warehouseService.SetProductStock(product2.Id, warehouse.Id, stock: 50, reorderPoint: 10);

        // Act
        var lowStockProducts = await _warehouseService.GetLowStockProducts();

        // Assert
        Assert.Single(lowStockProducts);
        Assert.Equal(product1.Id, lowStockProducts[0].ProductId);
        Assert.True(lowStockProducts[0].IsLowStock);
    }

    #endregion

    #region Helper Methods

    private Warehouse CreateTestWarehouse(string name = "Test Warehouse")
    {
        var warehouse = _warehouseFactory.Create(name, new Address { CountryCode = "GB" });
        _dbContext.Warehouses.Add(warehouse);
        _dbContext.SaveChanges();
        return warehouse;
    }

    private ProductRoot CreateTestProductRoot()
    {
        var taxGroup = new Core.Accounting.Models.TaxGroup
        {
            Id = Guid.NewGuid(),
            Name = "Standard VAT",
            TaxPercentage = 20m
        };
        _dbContext.TaxGroups.Add(taxGroup);

        var productType = new ProductType
        {
            Id = Guid.NewGuid(),
            Name = "Test Type",
            Alias = "test"
        };
        _dbContext.ProductTypes.Add(productType);

        var productRoot = new ProductRoot
        {
            Id = Guid.NewGuid(),
            RootName = "Test Product Root",
            TaxGroupId = taxGroup.Id,
            ProductTypeId = productType.Id
        };
        _dbContext.RootProducts.Add(productRoot);
        _dbContext.SaveChanges();

        return productRoot;
    }

    private Product CreateTestProduct(string name = "Test Product", Guid? productRootId = null)
    {
        var productRoot = productRootId.HasValue
            ? _dbContext.RootProducts.Find(productRootId.Value)!
            : CreateTestProductRoot();

        var product = new Product
        {
            Id = Guid.NewGuid(),
            ProductRootId = productRoot.Id,
            Name = name,
            Price = 10.99m,
            Default = true
        };
        _dbContext.Products.Add(product);
        _dbContext.SaveChanges();

        return product;
    }

    #endregion
}


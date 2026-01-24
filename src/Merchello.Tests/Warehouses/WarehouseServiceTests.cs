using Merchello.Core.Locality.Models;
using Merchello.Core.Warehouses.Services.Interfaces;
using Merchello.Core.Warehouses.Services.Parameters;
using Merchello.Tests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Warehouses;

/// <summary>
/// Integration tests for WarehouseService covering CRUD operations,
/// ProductRootWarehouse management, and stock operations.
/// </summary>
[Collection("Integration Tests")]
public class WarehouseServiceTests
{
    private readonly ServiceTestFixture _fixture;
    private readonly IWarehouseService _warehouseService;
    private readonly TestDataBuilder _dataBuilder;

    public WarehouseServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _warehouseService = fixture.GetService<IWarehouseService>();
        _dataBuilder = fixture.CreateDataBuilder();
    }

    #region Warehouse CRUD Tests

    [Fact]
    public async Task CreateWarehouse_WithValidParameters_CreatesSuccessfully()
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
        result.Successful.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.Name.ShouldBe("Test Warehouse");
        result.ResultObject.Code.ShouldBe("TW-01");

        var savedWarehouse = await _fixture.DbContext.Warehouses
            .FirstOrDefaultAsync(w => w.Code == "TW-01");
        savedWarehouse.ShouldNotBeNull();
    }

    [Fact]
    public async Task UpdateWarehouse_WithValidParameters_UpdatesSuccessfully()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse("Original Name");
        await _dataBuilder.SaveChangesAsync();

        var parameters = new UpdateWarehouseParameters
        {
            WarehouseId = warehouse.Id,
            Name = "Updated Name",
            Code = "NEW-CODE"
        };

        // Act
        var result = await _warehouseService.UpdateWarehouse(parameters);

        // Assert
        result.Successful.ShouldBeTrue();
        result.ResultObject!.Name.ShouldBe("Updated Name");
        result.ResultObject.Code.ShouldBe("NEW-CODE");
    }

    [Fact]
    public async Task UpdateWarehouse_NonexistentWarehouse_ReturnsError()
    {
        // Arrange
        var parameters = new UpdateWarehouseParameters
        {
            WarehouseId = Guid.NewGuid(),
            Name = "Updated Name"
        };

        // Act
        var result = await _warehouseService.UpdateWarehouse(parameters);

        // Assert
        result.Successful.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message!.Contains("not found"));
    }

    [Fact]
    public async Task DeleteWarehouse_WithNoDependencies_DeletesSuccessfully()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse();
        await _dataBuilder.SaveChangesAsync();

        // Act
        var result = await _warehouseService.DeleteWarehouse(warehouse.Id);

        // Assert
        result.Successful.ShouldBeTrue();
        // Clear change tracker to get fresh data from database
        _fixture.DbContext.ChangeTracker.Clear();
        var deletedWarehouse = await _fixture.DbContext.Warehouses.FindAsync(warehouse.Id);
        deletedWarehouse.ShouldBeNull();
    }

    [Fact]
    public async Task DeleteWarehouse_WithStockRecords_FailsWithoutForce()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse();
        var product = _dataBuilder.CreateProduct();
        _dataBuilder.CreateProductWarehouse(product, warehouse, stock: 10);
        await _dataBuilder.SaveChangesAsync();

        // Act
        var result = await _warehouseService.DeleteWarehouse(warehouse.Id, force: false);

        // Assert
        result.Successful.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message!.Contains("stock record"));
    }

    [Fact]
    public async Task DeleteWarehouse_WithStockRecords_SucceedsWithForce()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse();
        var product = _dataBuilder.CreateProduct();
        _dataBuilder.CreateProductWarehouse(product, warehouse, stock: 10);
        await _dataBuilder.SaveChangesAsync();

        // Act
        var result = await _warehouseService.DeleteWarehouse(warehouse.Id, force: true);

        // Assert
        result.Successful.ShouldBeTrue();

        // Clear change tracker to get fresh data from database
        _fixture.DbContext.ChangeTracker.Clear();
        var deletedWarehouse = await _fixture.DbContext.Warehouses.FindAsync(warehouse.Id);
        deletedWarehouse.ShouldBeNull();

        var stockRecord = await _fixture.DbContext.ProductWarehouses
            .FirstOrDefaultAsync(pw => pw.WarehouseId == warehouse.Id);
        stockRecord.ShouldBeNull();
    }

    #endregion

    #region ProductRootWarehouse Management Tests

    [Fact]
    public async Task AddWarehouseToProductRoot_CreatesAssociation()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse();
        var productRoot = _dataBuilder.CreateProductRoot();
        await _dataBuilder.SaveChangesAsync();

        // Act
        var result = await _warehouseService.AddWarehouseToProductRoot(new AddWarehouseToProductRootParameters
        {
            ProductRootId = productRoot.Id,
            WarehouseId = warehouse.Id,
            PriorityOrder = 1
        });

        // Assert
        result.Successful.ShouldBeTrue();

        var association = await _fixture.DbContext.ProductRootWarehouses
            .FirstOrDefaultAsync(prw =>
                prw.ProductRootId == productRoot.Id &&
                prw.WarehouseId == warehouse.Id);

        association.ShouldNotBeNull();
        association.PriorityOrder.ShouldBe(1);
    }

    [Fact]
    public async Task AddWarehouseToProductRoot_DuplicateAssociation_ReturnsError()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse();
        var productRoot = _dataBuilder.CreateProductRoot();
        _dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        await _dataBuilder.SaveChangesAsync();

        // Act
        var result = await _warehouseService.AddWarehouseToProductRoot(new AddWarehouseToProductRootParameters
        {
            ProductRootId = productRoot.Id,
            WarehouseId = warehouse.Id,
            PriorityOrder = 2
        });

        // Assert
        result.Successful.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message!.Contains("already assigned"));
    }

    [Fact]
    public async Task RemoveWarehouseFromProductRoot_CleansUpStockRecords()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse();
        var productRoot = _dataBuilder.CreateProductRoot();
        var product = _dataBuilder.CreateProduct("Test Product", productRoot);
        _dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse);
        _dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100);
        await _dataBuilder.SaveChangesAsync();

        // Clear change tracker to ensure service gets fresh data from DB
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _warehouseService.RemoveWarehouseFromProductRoot(
            productRoot.Id, warehouse.Id);

        // Assert
        result.Successful.ShouldBeTrue();

        // Association should be deleted
        var deletedAssociation = await _fixture.DbContext.ProductRootWarehouses
            .FirstOrDefaultAsync(prw =>
                prw.ProductRootId == productRoot.Id &&
                prw.WarehouseId == warehouse.Id);
        deletedAssociation.ShouldBeNull();

        // Stock records should be cleaned up
        var stockRecords = await _fixture.DbContext.ProductWarehouses
            .Where(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse.Id)
            .ToListAsync();
        stockRecords.ShouldBeEmpty();
    }

    [Fact]
    public async Task UpdateWarehousePriority_UpdatesPriorityOrder()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse();
        var productRoot = _dataBuilder.CreateProductRoot();
        _dataBuilder.AddWarehouseToProductRoot(productRoot, warehouse, priorityOrder: 1);
        await _dataBuilder.SaveChangesAsync();

        // Act
        var result = await _warehouseService.UpdateWarehousePriority(new UpdateWarehousePriorityParameters
        {
            ProductRootId = productRoot.Id,
            WarehouseId = warehouse.Id,
            NewPriorityOrder = 5
        });

        // Assert
        result.Successful.ShouldBeTrue();

        // Clear change tracker to get fresh data from database
        _fixture.DbContext.ChangeTracker.Clear();
        var updatedAssociation = await _fixture.DbContext.ProductRootWarehouses
            .FirstOrDefaultAsync(prw =>
                prw.ProductRootId == productRoot.Id &&
                prw.WarehouseId == warehouse.Id);

        updatedAssociation.ShouldNotBeNull();
        updatedAssociation.PriorityOrder.ShouldBe(5);
    }

    #endregion

    #region Stock Management Tests

    [Fact]
    public async Task SetProductStock_CreatesNewStockRecord()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse();
        var product = _dataBuilder.CreateProduct();
        await _dataBuilder.SaveChangesAsync();

        // Act
        var result = await _warehouseService.SetProductStock(new SetProductStockParameters
        {
            ProductId = product.Id,
            WarehouseId = warehouse.Id,
            Stock = 50,
            ReorderPoint = 10,
            ReorderQuantity = 30
        });

        // Assert
        result.Successful.ShouldBeTrue();

        var stockRecord = await _fixture.DbContext.ProductWarehouses
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse.Id);

        stockRecord.ShouldNotBeNull();
        stockRecord.Stock.ShouldBe(50);
        stockRecord.ReorderPoint.ShouldBe(10);
        stockRecord.ReorderQuantity.ShouldBe(30);
    }

    [Fact]
    public async Task SetProductStock_UpdatesExistingStockRecord()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse();
        var product = _dataBuilder.CreateProduct();
        _dataBuilder.CreateProductWarehouse(product, warehouse, stock: 25);
        await _dataBuilder.SaveChangesAsync();

        // Act
        var result = await _warehouseService.SetProductStock(new SetProductStockParameters
        {
            ProductId = product.Id,
            WarehouseId = warehouse.Id,
            Stock = 100,
            ReorderPoint = 20
        });

        // Assert
        result.Successful.ShouldBeTrue();

        // Clear change tracker to get fresh data from database
        _fixture.DbContext.ChangeTracker.Clear();
        var stockRecord = await _fixture.DbContext.ProductWarehouses
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse.Id);

        stockRecord.ShouldNotBeNull();
        stockRecord.Stock.ShouldBe(100);
        stockRecord.ReorderPoint.ShouldBe(20);
    }

    [Fact]
    public async Task SetProductStock_WithNegativeStock_Fails()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse();
        var product = _dataBuilder.CreateProduct();
        await _dataBuilder.SaveChangesAsync();

        // Act
        var result = await _warehouseService.SetProductStock(new SetProductStockParameters
        {
            ProductId = product.Id,
            WarehouseId = warehouse.Id,
            Stock = -10
        });

        // Assert
        result.Successful.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message!.Contains("cannot be negative"));
    }

    [Fact]
    public async Task AdjustStock_IncreaseStock_SuccessfullyIncreases()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse();
        var product = _dataBuilder.CreateProduct();
        _dataBuilder.CreateProductWarehouse(product, warehouse, stock: 50);
        await _dataBuilder.SaveChangesAsync();

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
        result.Successful.ShouldBeTrue();

        // Clear change tracker to get fresh data from database
        _fixture.DbContext.ChangeTracker.Clear();
        var stockRecord = await _fixture.DbContext.ProductWarehouses
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse.Id);

        stockRecord!.Stock.ShouldBe(75);
    }

    [Fact]
    public async Task AdjustStock_DecreaseStock_SuccessfullyDecreases()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse();
        var product = _dataBuilder.CreateProduct();
        _dataBuilder.CreateProductWarehouse(product, warehouse, stock: 50);
        await _dataBuilder.SaveChangesAsync();

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
        result.Successful.ShouldBeTrue();

        // Clear change tracker to get fresh data from database
        _fixture.DbContext.ChangeTracker.Clear();
        var stockRecord = await _fixture.DbContext.ProductWarehouses
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse.Id);

        stockRecord!.Stock.ShouldBe(30);
    }

    [Fact]
    public async Task AdjustStock_ResultingInNegative_Fails()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse();
        var product = _dataBuilder.CreateProduct();
        _dataBuilder.CreateProductWarehouse(product, warehouse, stock: 10);
        await _dataBuilder.SaveChangesAsync();

        var parameters = new StockAdjustmentParameters
        {
            ProductId = product.Id,
            WarehouseId = warehouse.Id,
            Adjustment = -20
        };

        // Act
        var result = await _warehouseService.AdjustStock(parameters);

        // Assert
        result.Successful.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message!.Contains("negative stock"));
    }

    [Fact]
    public async Task TransferStock_MovesStockBetweenWarehouses()
    {
        // Arrange
        var warehouse1 = _dataBuilder.CreateWarehouse("Warehouse 1");
        var warehouse2 = _dataBuilder.CreateWarehouse("Warehouse 2");
        var product = _dataBuilder.CreateProduct();
        _dataBuilder.CreateProductWarehouse(product, warehouse1, stock: 100);
        _dataBuilder.CreateProductWarehouse(product, warehouse2, stock: 50);
        await _dataBuilder.SaveChangesAsync();

        // Act
        var result = await _warehouseService.TransferStock(new TransferStockParameters
        {
            ProductId = product.Id,
            FromWarehouseId = warehouse1.Id,
            ToWarehouseId = warehouse2.Id,
            Quantity = 30
        });

        // Assert
        result.Successful.ShouldBeTrue();

        // Clear change tracker to get fresh data from database
        _fixture.DbContext.ChangeTracker.Clear();
        var stock1 = await _fixture.DbContext.ProductWarehouses
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse1.Id);
        var stock2 = await _fixture.DbContext.ProductWarehouses
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse2.Id);

        stock1!.Stock.ShouldBe(70);
        stock2!.Stock.ShouldBe(80);
    }

    [Fact]
    public async Task TransferStock_CreatesDestinationRecordIfNotExists()
    {
        // Arrange
        var warehouse1 = _dataBuilder.CreateWarehouse("Source Warehouse");
        var warehouse2 = _dataBuilder.CreateWarehouse("Destination Warehouse");
        var product = _dataBuilder.CreateProduct();
        _dataBuilder.CreateProductWarehouse(product, warehouse1, stock: 100);
        // Note: No stock record for warehouse2
        await _dataBuilder.SaveChangesAsync();

        // Act
        var result = await _warehouseService.TransferStock(new TransferStockParameters
        {
            ProductId = product.Id,
            FromWarehouseId = warehouse1.Id,
            ToWarehouseId = warehouse2.Id,
            Quantity = 25
        });

        // Assert
        result.Successful.ShouldBeTrue();

        var stock2 = await _fixture.DbContext.ProductWarehouses
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse2.Id);

        stock2.ShouldNotBeNull();
        stock2.Stock.ShouldBe(25);
    }

    [Fact]
    public async Task TransferStock_InsufficientStock_Fails()
    {
        // Arrange
        var warehouse1 = _dataBuilder.CreateWarehouse("Warehouse 1");
        var warehouse2 = _dataBuilder.CreateWarehouse("Warehouse 2");
        var product = _dataBuilder.CreateProduct();
        _dataBuilder.CreateProductWarehouse(product, warehouse1, stock: 10);
        await _dataBuilder.SaveChangesAsync();

        // Act
        var result = await _warehouseService.TransferStock(new TransferStockParameters
        {
            ProductId = product.Id,
            FromWarehouseId = warehouse1.Id,
            ToWarehouseId = warehouse2.Id,
            Quantity = 50
        });

        // Assert
        result.Successful.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message!.Contains("Insufficient"));
    }

    [Fact]
    public async Task TransferStock_ToSameWarehouse_Fails()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse();
        var product = _dataBuilder.CreateProduct();
        _dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100);
        await _dataBuilder.SaveChangesAsync();

        // Act
        var result = await _warehouseService.TransferStock(new TransferStockParameters
        {
            ProductId = product.Id,
            FromWarehouseId = warehouse.Id,
            ToWarehouseId = warehouse.Id,
            Quantity = 10
        });

        // Assert
        result.Successful.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message!.Contains("same warehouse"));
    }

    #endregion

    #region Inventory Query Tests

    [Fact]
    public async Task GetProductStockLevels_ReturnsAllWarehouses()
    {
        // Arrange
        var warehouse1 = _dataBuilder.CreateWarehouse("Warehouse 1");
        var warehouse2 = _dataBuilder.CreateWarehouse("Warehouse 2");
        var product = _dataBuilder.CreateProduct();
        _dataBuilder.CreateProductWarehouse(product, warehouse1, stock: 100, reorderPoint: 20);
        _dataBuilder.CreateProductWarehouse(product, warehouse2, stock: 50, reorderPoint: 10);
        await _dataBuilder.SaveChangesAsync();

        // Act
        var stockLevels = await _warehouseService.GetProductStockLevels(product.Id);

        // Assert
        stockLevels.Count.ShouldBe(2);
        stockLevels.ShouldContain(sl => sl.WarehouseId == warehouse1.Id && sl.Stock == 100);
        stockLevels.ShouldContain(sl => sl.WarehouseId == warehouse2.Id && sl.Stock == 50);
    }

    [Fact]
    public async Task GetWarehouseInventory_ReturnsAllProducts()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse();
        var productRoot1 = _dataBuilder.CreateProductRoot("Product Root 1");
        var productRoot2 = _dataBuilder.CreateProductRoot("Product Root 2");
        var product1 = _dataBuilder.CreateProduct("Product 1", productRoot1);
        var product2 = _dataBuilder.CreateProduct("Product 2", productRoot2);
        _dataBuilder.CreateProductWarehouse(product1, warehouse, stock: 100);
        _dataBuilder.CreateProductWarehouse(product2, warehouse, stock: 50);
        await _dataBuilder.SaveChangesAsync();

        // Act
        var inventory = await _warehouseService.GetWarehouseInventory(warehouse.Id);

        // Assert
        inventory.Count.ShouldBe(2);
        inventory.ShouldContain(i => i.ProductId == product1.Id);
        inventory.ShouldContain(i => i.ProductId == product2.Id);
    }

    [Fact]
    public async Task GetWarehouseInventory_LowStockOnly_FiltersCorrectly()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse();
        var productRoot1 = _dataBuilder.CreateProductRoot("PR1");
        var productRoot2 = _dataBuilder.CreateProductRoot("PR2");
        var productRoot3 = _dataBuilder.CreateProductRoot("PR3");
        var product1 = _dataBuilder.CreateProduct("Low Stock Product", productRoot1);
        var product2 = _dataBuilder.CreateProduct("OK Stock Product", productRoot2);
        var product3 = _dataBuilder.CreateProduct("Also Low Stock", productRoot3);

        _dataBuilder.CreateProductWarehouse(product1, warehouse, stock: 3, reorderPoint: 5); // Low (3 <= 5)
        _dataBuilder.CreateProductWarehouse(product2, warehouse, stock: 50, reorderPoint: 10); // OK (50 > 10)
        _dataBuilder.CreateProductWarehouse(product3, warehouse, stock: 5, reorderPoint: 20); // Low (5 <= 20)
        await _dataBuilder.SaveChangesAsync();

        // Act
        var lowStockInventory = await _warehouseService.GetWarehouseInventory(warehouse.Id, lowStockOnly: true);

        // Assert
        lowStockInventory.Count.ShouldBe(2);
        lowStockInventory.ShouldContain(i => i.ProductId == product1.Id);
        lowStockInventory.ShouldContain(i => i.ProductId == product3.Id);
        lowStockInventory.ShouldNotContain(i => i.ProductId == product2.Id);
    }

    [Fact]
    public async Task GetLowStockProducts_ReturnsProductsBelowReorderPoint()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse();
        var productRoot1 = _dataBuilder.CreateProductRoot("PR1");
        var productRoot2 = _dataBuilder.CreateProductRoot("PR2");
        var product1 = _dataBuilder.CreateProduct("Low Stock Product", productRoot1);
        var product2 = _dataBuilder.CreateProduct("Good Stock Product", productRoot2);

        _dataBuilder.CreateProductWarehouse(product1, warehouse, stock: 3, reorderPoint: 10);
        _dataBuilder.CreateProductWarehouse(product2, warehouse, stock: 50, reorderPoint: 10);
        await _dataBuilder.SaveChangesAsync();

        // Act
        var lowStockProducts = await _warehouseService.GetLowStockProducts();

        // Assert
        lowStockProducts.Count.ShouldBe(1);
        lowStockProducts[0].ProductId.ShouldBe(product1.Id);
    }

    [Fact]
    public async Task GetWarehouses_ReturnsAllWarehouses()
    {
        // Arrange
        _dataBuilder.CreateWarehouse("Alpha Warehouse");
        _dataBuilder.CreateWarehouse("Beta Warehouse");
        _dataBuilder.CreateWarehouse("Gamma Warehouse");
        await _dataBuilder.SaveChangesAsync();

        // Act
        var warehouses = await _warehouseService.GetWarehouses();

        // Assert
        warehouses.Count.ShouldBe(3);
    }

    #endregion
}

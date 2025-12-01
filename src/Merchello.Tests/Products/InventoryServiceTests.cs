using Merchello.Core.Data;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services;
using Merchello.Tests.TestInfrastructure;
using Microsoft.Extensions.Logging;
using Moq;
using Shouldly;

namespace Merchello.Tests.Products;

public class InventoryServiceTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IMerchDbContext _dbContext;
    private readonly InventoryService _inventoryService;
    private readonly Mock<ILogger<InventoryService>> _loggerMock;
    private readonly TestDataBuilder _dataBuilder;

    public InventoryServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _dbContext = fixture.DbContext;
        _loggerMock = new Mock<ILogger<InventoryService>>();
        _inventoryService = new InventoryService(_dbContext, _loggerMock.Object);
        _dataBuilder = new TestDataBuilder(_dbContext);
    }

    [Fact]
    public async Task ReserveStock_WithTrackStockTrue_ReducesAvailableStock()
    {
        // Arrange
        _fixture.ResetDatabase();

        var warehouse = _dataBuilder.CreateWarehouse();
        var product = _dataBuilder.CreateProduct();
        var productWarehouse = new ProductWarehouse
        {
            ProductId = product.Id,
            Product = product,
            WarehouseId = warehouse.Id,
            Warehouse = warehouse,
            Stock = 100,
            TrackStock = true,
            ReservedStock = 0
        };

        _dbContext.ProductWarehouses.Add(productWarehouse);
        await _dataBuilder.SaveChangesAsync();

        // Act
        var result = await _inventoryService.ReserveStockAsync(product.Id, warehouse.Id, 10);

        // Assert
        result.ResultObject.ShouldBeTrue();
        productWarehouse.ReservedStock.ShouldBe(10);
        var availableStock = await _inventoryService.GetAvailableStockAsync(product.Id, warehouse.Id);
        availableStock.ShouldBe(90); // 100 - 10
    }

    [Fact]
    public async Task ReserveStock_WithTrackStockFalse_SucceedsWithoutModifyingStock()
    {
        // Arrange
        _fixture.ResetDatabase();

        var warehouse = _dataBuilder.CreateWarehouse();
        var product = _dataBuilder.CreateProduct("Digital Product");
        var productWarehouse = new ProductWarehouse
        {
            ProductId = product.Id,
            Product = product,
            WarehouseId = warehouse.Id,
            Warehouse = warehouse,
            Stock = 0,
            TrackStock = false,
            ReservedStock = 0
        };

        _dbContext.ProductWarehouses.Add(productWarehouse);
        await _dataBuilder.SaveChangesAsync();

        // Act
        var result = await _inventoryService.ReserveStockAsync(product.Id, warehouse.Id, 100);

        // Assert
        result.ResultObject.ShouldBeTrue();
        productWarehouse.ReservedStock.ShouldBe(0); // Should not change
        productWarehouse.Stock.ShouldBe(0); // Should not change
    }

    [Fact]
    public async Task ReserveStock_WithInsufficientQuantity_Fails()
    {
        // Arrange
        _fixture.ResetDatabase();

        var warehouse = _dataBuilder.CreateWarehouse();
        var product = _dataBuilder.CreateProduct();
        var productWarehouse = new ProductWarehouse
        {
            ProductId = product.Id,
            Product = product,
            WarehouseId = warehouse.Id,
            Warehouse = warehouse,
            Stock = 10,
            TrackStock = true,
            ReservedStock = 0
        };

        _dbContext.ProductWarehouses.Add(productWarehouse);
        await _dataBuilder.SaveChangesAsync();

        // Act
        var result = await _inventoryService.ReserveStockAsync(product.Id, warehouse.Id, 20);

        // Assert
        result.ResultObject.ShouldBeFalse();
        result.Messages.ShouldNotBeEmpty();
        result.Messages.First().Message!.ShouldContain("Insufficient stock");
    }

    [Fact]
    public async Task ReleaseReservation_WithTrackStockTrue_IncreasesAvailableStock()
    {
        // Arrange
        _fixture.ResetDatabase();

        var warehouse = _dataBuilder.CreateWarehouse();
        var product = _dataBuilder.CreateProduct();
        var productWarehouse = new ProductWarehouse
        {
            ProductId = product.Id,
            Product = product,
            WarehouseId = warehouse.Id,
            Warehouse = warehouse,
            Stock = 100,
            TrackStock = true,
            ReservedStock = 30
        };

        _dbContext.ProductWarehouses.Add(productWarehouse);
        await _dataBuilder.SaveChangesAsync();

        // Act
        var result = await _inventoryService.ReleaseReservationAsync(product.Id, warehouse.Id, 10);

        // Assert
        result.ResultObject.ShouldBeTrue();
        productWarehouse.ReservedStock.ShouldBe(20);
        var availableStock = await _inventoryService.GetAvailableStockAsync(product.Id, warehouse.Id);
        availableStock.ShouldBe(80); // 100 - 20
    }

    [Fact]
    public async Task ReleaseReservation_WithTrackStockFalse_SucceedsWithoutModifying()
    {
        // Arrange
        _fixture.ResetDatabase();

        var warehouse = _dataBuilder.CreateWarehouse();
        var product = _dataBuilder.CreateProduct("Digital Product");
        var productWarehouse = new ProductWarehouse
        {
            ProductId = product.Id,
            Product = product,
            WarehouseId = warehouse.Id,
            Warehouse = warehouse,
            Stock = 0,
            TrackStock = false,
            ReservedStock = 0
        };

        _dbContext.ProductWarehouses.Add(productWarehouse);
        await _dataBuilder.SaveChangesAsync();

        // Act
        var result = await _inventoryService.ReleaseReservationAsync(product.Id, warehouse.Id, 10);

        // Assert
        result.ResultObject.ShouldBeTrue();
        productWarehouse.ReservedStock.ShouldBe(0);
    }

    [Fact]
    public async Task AllocateStock_WithTrackStockTrue_DeductsFromBothStockAndReserved()
    {
        // Arrange
        _fixture.ResetDatabase();

        var warehouse = _dataBuilder.CreateWarehouse();
        var product = _dataBuilder.CreateProduct();
        var productWarehouse = new ProductWarehouse
        {
            ProductId = product.Id,
            Product = product,
            WarehouseId = warehouse.Id,
            Warehouse = warehouse,
            Stock = 100,
            TrackStock = true,
            ReservedStock = 30
        };

        _dbContext.ProductWarehouses.Add(productWarehouse);
        await _dataBuilder.SaveChangesAsync();

        // Act
        var result = await _inventoryService.AllocateStockAsync(product.Id, warehouse.Id, 10);

        // Assert
        result.ResultObject.ShouldBeTrue();
        productWarehouse.Stock.ShouldBe(90); // 100 - 10
        productWarehouse.ReservedStock.ShouldBe(20); // 30 - 10
    }

    [Fact]
    public async Task AllocateStock_WithTrackStockFalse_SucceedsWithoutModifying()
    {
        // Arrange
        _fixture.ResetDatabase();

        var warehouse = _dataBuilder.CreateWarehouse();
        var product = _dataBuilder.CreateProduct("Digital Product");
        var productWarehouse = new ProductWarehouse
        {
            ProductId = product.Id,
            Product = product,
            WarehouseId = warehouse.Id,
            Warehouse = warehouse,
            Stock = 0,
            TrackStock = false,
            ReservedStock = 0
        };

        _dbContext.ProductWarehouses.Add(productWarehouse);
        await _dataBuilder.SaveChangesAsync();

        // Act
        var result = await _inventoryService.AllocateStockAsync(product.Id, warehouse.Id, 10);

        // Assert
        result.ResultObject.ShouldBeTrue();
        productWarehouse.Stock.ShouldBe(0);
        productWarehouse.ReservedStock.ShouldBe(0);
    }

    [Fact]
    public async Task GetAvailableStock_WithTrackedItem_ReturnsStockMinusReserved()
    {
        // Arrange
        _fixture.ResetDatabase();

        var warehouse = _dataBuilder.CreateWarehouse();
        var product = _dataBuilder.CreateProduct();
        var productWarehouse = new ProductWarehouse
        {
            ProductId = product.Id,
            Product = product,
            WarehouseId = warehouse.Id,
            Warehouse = warehouse,
            Stock = 100,
            TrackStock = true,
            ReservedStock = 25
        };

        _dbContext.ProductWarehouses.Add(productWarehouse);
        await _dataBuilder.SaveChangesAsync();

        // Act
        var availableStock = await _inventoryService.GetAvailableStockAsync(product.Id, warehouse.Id);

        // Assert
        availableStock.ShouldBe(75); // 100 - 25
    }

    [Fact]
    public async Task GetAvailableStock_WithUntrackedItem_ReturnsMaxValue()
    {
        // Arrange
        _fixture.ResetDatabase();

        var warehouse = _dataBuilder.CreateWarehouse();
        var product = _dataBuilder.CreateProduct("Digital Product");
        var productWarehouse = new ProductWarehouse
        {
            ProductId = product.Id,
            Product = product,
            WarehouseId = warehouse.Id,
            Warehouse = warehouse,
            Stock = 0,
            TrackStock = false,
            ReservedStock = 0
        };

        _dbContext.ProductWarehouses.Add(productWarehouse);
        await _dataBuilder.SaveChangesAsync();

        // Act
        var availableStock = await _inventoryService.GetAvailableStockAsync(product.Id, warehouse.Id);

        // Assert
        availableStock.ShouldBe(int.MaxValue);
    }

    [Fact]
    public async Task IsStockTracked_ReturnsCorrectValue()
    {
        // Arrange
        _fixture.ResetDatabase();

        var warehouse = _dataBuilder.CreateWarehouse();
        var trackedProduct = _dataBuilder.CreateProduct("Physical Product");
        var untrackedProduct = _dataBuilder.CreateProduct("Digital Product");

        var trackedPW = new ProductWarehouse
        {
            ProductId = trackedProduct.Id,
            Product = trackedProduct,
            WarehouseId = warehouse.Id,
            Warehouse = warehouse,
            Stock = 100,
            TrackStock = true
        };

        var untrackedPW = new ProductWarehouse
        {
            ProductId = untrackedProduct.Id,
            Product = untrackedProduct,
            WarehouseId = warehouse.Id,
            Warehouse = warehouse,
            Stock = 0,
            TrackStock = false
        };

        _dbContext.ProductWarehouses.AddRange(trackedPW, untrackedPW);
        await _dataBuilder.SaveChangesAsync();

        // Act
        var trackedResult = await _inventoryService.IsStockTrackedAsync(trackedProduct.Id, warehouse.Id);
        var untrackedResult = await _inventoryService.IsStockTrackedAsync(untrackedProduct.Id, warehouse.Id);

        // Assert
        trackedResult.ShouldBeTrue();
        untrackedResult.ShouldBeFalse();
    }

}


using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services;
using Merchello.Core.Checkout.Models;
using Merchello.Core.Data;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services;
using Merchello.Core.Warehouses.Models;
using Merchello.Core.Warehouses.Services;
using Merchello.Tests.TestInfrastructure;
using Microsoft.Extensions.Logging;
using Moq;
using Shouldly;

namespace Merchello.Tests.Products;

/// <summary>
/// Tests for concurrent inventory operations to ensure no over-allocation
/// </summary>
public class InventoryConcurrencyTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly IMerchDbContext _dbContext;
    private readonly TestDataBuilder _dataBuilder;

    public InventoryConcurrencyTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _dbContext = fixture.DbContext;
        _dataBuilder = new TestDataBuilder(_dbContext);
    }

    [Fact]
    public async Task ConcurrentReservations_ShouldNotOverAllocateStock()
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
            Stock = 10, // Only 10 units available
            TrackStock = true,
            ReservedStock = 0
        };

        _dbContext.ProductWarehouses.Add(productWarehouse);
        await _dataBuilder.SaveChangesAsync();

        var inventoryService = new InventoryService(_dbContext, new Mock<ILogger<InventoryService>>().Object);

        // Act - Try to reserve 5 units concurrently 3 times (total 15, but only 10 available)
        var tasks = Enumerable.Range(0, 3).Select(async i =>
        {
            try
            {
                var result = await inventoryService.ReserveStockAsync(product.Id, warehouse.Id, 5);
                return result.ResultObject;
            }
            catch
            {
                return false;
            }
        });

        var results = await Task.WhenAll(tasks);

        // Assert
        await _dbContext.Entry(productWarehouse).ReloadAsync();

        // Only 2 reservations should succeed (5 + 5 = 10 units)
        var successfulReservations = results.Count(r => r);
        successfulReservations.ShouldBe(2);

        // Reserved stock should be exactly 10 (all available stock)
        productWarehouse.ReservedStock.ShouldBe(10);

        // Available stock should be 0
        var availableStock = productWarehouse.Stock - productWarehouse.ReservedStock;
        availableStock.ShouldBe(0);
    }

    [Fact]
    public async Task ReservationAndCancellation_ShouldMaintainConsistency()
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

        var inventoryService = new InventoryService(_dbContext, new Mock<ILogger<InventoryService>>().Object);

        // Act - Reserve and release multiple times
        await inventoryService.ReserveStockAsync(product.Id, warehouse.Id, 20);
        await inventoryService.ReserveStockAsync(product.Id, warehouse.Id, 30);
        await inventoryService.ReleaseReservationAsync(product.Id, warehouse.Id, 10);
        await inventoryService.ReserveStockAsync(product.Id, warehouse.Id, 10);

        // Assert
        await _dbContext.Entry(productWarehouse).ReloadAsync();
        productWarehouse.ReservedStock.ShouldBe(50); // 20 + 30 - 10 + 10 = 50

        var available = await inventoryService.GetAvailableStockAsync(product.Id, warehouse.Id);
        available.ShouldBe(50); // 100 - 50
    }
}


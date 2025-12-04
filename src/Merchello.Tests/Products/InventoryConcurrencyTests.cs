using Merchello.Core.Data;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Tests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Products;

[Collection("Integration Tests")]
public class InventoryConcurrencyTests
{
    private readonly ServiceTestFixture _fixture;

    public InventoryConcurrencyTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
    }

    [Fact]
    public async Task ConcurrentReservations_ShouldNotOverAllocateStock()
    {
        _fixture.ResetDatabase();

        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct();
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 10, trackStock: true);
        await dataBuilder.SaveChangesAsync();

        // Act - try to reserve 5 units concurrently 3 times (total requested 15, only 10 available)
        var results = await ConcurrentTestHelper.RunConcurrentlyAsync(3, async _ =>
        {
            using var scope = _fixture.CreateScope();
            var inventoryService = scope.ServiceProvider.GetRequiredService<IInventoryService>();

            var result = await inventoryService.ReserveStockAsync(product.Id, warehouse.Id, 5);
            return result.ResultObject;
        });

        // Assert
        var successfulReservations = results.Count(r => r);
        successfulReservations.ShouldBe(2);

        // Verify final state
        using var verificationScope = _fixture.CreateScope();
        var verificationContext = verificationScope.ServiceProvider.GetRequiredService<MerchelloDbContext>();
        var finalState = await verificationContext.ProductWarehouses
            .AsNoTracking()
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse.Id);
        finalState.ShouldNotBeNull();
        finalState!.ReservedStock.ShouldBe(10);
        finalState.Stock.ShouldBe(10); // Physical stock unchanged
    }

    [Fact]
    public async Task ConcurrentReservations_FinalReservedStockMatchesSuccessful()
    {
        _fixture.ResetDatabase();

        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct();
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100, trackStock: true);
        await dataBuilder.SaveChangesAsync();

        // Act - 10 concurrent reservations of 5 each
        var reservationResults = await ConcurrentTestHelper.RunConcurrentlyAsync(10, async _ =>
        {
            using var scope = _fixture.CreateScope();
            var inventoryService = scope.ServiceProvider.GetRequiredService<IInventoryService>();
            return await inventoryService.ReserveStockAsync(product.Id, warehouse.Id, 5);
        });
        var successCount = reservationResults.Count(r => r.ResultObject);

        // Verify final state
        using var verificationScope = _fixture.CreateScope();
        var verificationContext = verificationScope.ServiceProvider.GetRequiredService<MerchelloDbContext>();
        var finalState = await verificationContext.ProductWarehouses
            .AsNoTracking()
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse.Id);

        // Assert
        finalState.ShouldNotBeNull();
        finalState!.ReservedStock.ShouldBe(successCount * 5);
        finalState.Stock.ShouldBe(100); // Physical stock unchanged
    }

    [Fact]
    public async Task ConcurrentAllocations_ReducesStockCorrectly()
    {
        _fixture.ResetDatabase();

        // Arrange - Start with 100 stock and 50 reserved
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct();
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100, trackStock: true, reservedStock: 50);
        await dataBuilder.SaveChangesAsync();

        // Act - 5 concurrent allocations of 10 each = 50 total
        var allocationResults = await ConcurrentTestHelper.RunConcurrentlyAsync(5, async _ =>
        {
            using var scope = _fixture.CreateScope();
            var inventoryService = scope.ServiceProvider.GetRequiredService<IInventoryService>();
            return await inventoryService.AllocateStockAsync(product.Id, warehouse.Id, 10);
        });
        var successCount = allocationResults.Count(r => r.ResultObject);

        // Verify final state
        using var verificationScope = _fixture.CreateScope();
        var verificationContext = verificationScope.ServiceProvider.GetRequiredService<MerchelloDbContext>();
        var finalState = await verificationContext.ProductWarehouses
            .AsNoTracking()
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse.Id);

        // Assert
        successCount.ShouldBe(5);
        finalState.ShouldNotBeNull();
        finalState!.Stock.ShouldBe(50); // 100 - 50 allocated
        finalState.ReservedStock.ShouldBe(0); // 50 - 50 allocated
    }

    #region Mixed Operations Tests

    [Fact]
    public async Task InterleavedReservationsAndReleases_MaintainsConsistency()
    {
        _fixture.ResetDatabase();

        // Arrange - Start with 100 stock, 50 reserved
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct();
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100, trackStock: true, reservedStock: 50);
        await dataBuilder.SaveChangesAsync();

        // Act - Interleave reservations and releases
        // Reserve 10, Release 5, Reserve 10, Release 5, Reserve 10, Release 5, Reserve 10, Release 5, Reserve 10, Release 5
        // Net: +50 reserve, -25 release = +25 net change
        for (int i = 0; i < 5; i++)
        {
            var reserveResult = await _fixture.GetService<IInventoryService>()
                .ReserveStockAsync(product.Id, warehouse.Id, 10);
            reserveResult.ResultObject.ShouldBeTrue();

            var releaseResult = await _fixture.GetService<IInventoryService>()
                .ReleaseReservationAsync(product.Id, warehouse.Id, 5);
            releaseResult.ResultObject.ShouldBeTrue();
        }

        // Verify final state
        using var verificationScope = _fixture.CreateScope();
        var verificationContext = verificationScope.ServiceProvider.GetRequiredService<MerchelloDbContext>();
        var finalState = await verificationContext.ProductWarehouses
            .AsNoTracking()
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse.Id);

        // Assert
        finalState.ShouldNotBeNull();
        finalState!.ReservedStock.ShouldBe(75); // 50 + 50 reserved - 25 released
        finalState.Stock.ShouldBe(100); // Physical stock unchanged
    }

    [Fact]
    public async Task ExhaustStockThenRelease_AllowsNewReservations()
    {
        _fixture.ResetDatabase();

        // Arrange - 10 items in stock
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct();
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 10, trackStock: true);
        await dataBuilder.SaveChangesAsync();

        // Act - Reserve all 10
        var inventoryService = _fixture.GetService<IInventoryService>();
        await inventoryService.ReserveStockAsync(product.Id, warehouse.Id, 10);

        // Verify can't reserve more
        var failResult = await inventoryService.ReserveStockAsync(product.Id, warehouse.Id, 1);
        failResult.ResultObject.ShouldBeFalse();

        // Release 5
        await inventoryService.ReleaseReservationAsync(product.Id, warehouse.Id, 5);

        // Now should be able to reserve 5 more
        var successResult = await inventoryService.ReserveStockAsync(product.Id, warehouse.Id, 5);
        successResult.ResultObject.ShouldBeTrue();

        // Verify final state
        using var verificationScope = _fixture.CreateScope();
        var verificationContext = verificationScope.ServiceProvider.GetRequiredService<MerchelloDbContext>();
        var finalState = await verificationContext.ProductWarehouses
            .AsNoTracking()
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse.Id);

        finalState.ShouldNotBeNull();
        finalState!.ReservedStock.ShouldBe(10); // Full capacity
    }

    #endregion

    #region Digital Product Tests

    [Fact]
    public async Task DigitalProduct_UnlimitedReservations_AllSucceed()
    {
        _fixture.ResetDatabase();

        // Arrange - Digital product with TrackStock = false
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct("Digital Download");
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 0, trackStock: false);
        await dataBuilder.SaveChangesAsync();

        // Act - Many sequential reservations
        int successCount = 0;
        for (int i = 0; i < 100; i++)
        {
            var result = await _fixture.GetService<IInventoryService>().ReserveStockAsync(product.Id, warehouse.Id, 1);
            if (result.ResultObject)
                successCount++;
        }

        // Assert - All should succeed for digital product
        successCount.ShouldBe(100);

        // Verify stock unchanged
        using var verificationScope = _fixture.CreateScope();
        var verificationContext = verificationScope.ServiceProvider.GetRequiredService<MerchelloDbContext>();
        var finalState = await verificationContext.ProductWarehouses
            .AsNoTracking()
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse.Id);
        finalState.ShouldNotBeNull();
        finalState!.ReservedStock.ShouldBe(0); // Never incremented
        finalState.Stock.ShouldBe(0);
    }

    #endregion
}

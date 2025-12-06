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

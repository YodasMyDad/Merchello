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

    #region True Parallel Concurrency Tests

    /// <summary>
    /// Tests that parallel reservation requests cannot oversell limited stock.
    /// This validates the database-level concurrency control (optimistic/pessimistic locking).
    /// </summary>
    [Fact]
    public async Task ParallelReservations_DoNotOversell_WithLimitedStock()
    {
        _fixture.ResetDatabase();

        // Arrange: 10 stock, 20 concurrent requests for 1 each
        // Expected: Exactly 10 succeed, 10 fail
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct();
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 10, trackStock: true);
        await dataBuilder.SaveChangesAsync();

        // Act: Fire 20 reservation requests in TRUE parallel
        var results = await ConcurrentTestHelper.RunWithResultTrackingAsync(
            20,
            async () => await _fixture.GetService<IInventoryService>()
                .ReserveStockAsync(product.Id, warehouse.Id, 1),
            result => result.ResultObject);

        // Assert: Exactly 10 should succeed (no overselling)
        results.SuccessCount.ShouldBe(10);
        results.FailureCount.ShouldBe(10);

        // Verify database state - reserved stock should equal available stock
        using var verificationScope = _fixture.CreateScope();
        var ctx = verificationScope.ServiceProvider.GetRequiredService<MerchelloDbContext>();
        var finalState = await ctx.ProductWarehouses
            .AsNoTracking()
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse.Id);

        finalState.ShouldNotBeNull();
        finalState!.ReservedStock.ShouldBe(10); // All stock reserved
        finalState.Stock.ShouldBe(10); // Physical stock unchanged
    }

    /// <summary>
    /// Tests high-volume concurrent reservations with partial stock availability.
    /// </summary>
    [Fact]
    public async Task HighVolumeConcurrentReservations_ExactlyAvailableStockReserved()
    {
        _fixture.ResetDatabase();

        // Arrange: 50 stock, 100 concurrent requests for 1 each
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct();
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 50, trackStock: true);
        await dataBuilder.SaveChangesAsync();

        // Act: Fire 100 concurrent requests
        var results = await ConcurrentTestHelper.RunWithResultTrackingAsync(
            100,
            async () => await _fixture.GetService<IInventoryService>()
                .ReserveStockAsync(product.Id, warehouse.Id, 1),
            result => result.ResultObject);

        // Assert: Exactly 50 should succeed
        results.SuccessCount.ShouldBe(50);
        results.FailureCount.ShouldBe(50);

        // Verify final state
        using var verificationScope = _fixture.CreateScope();
        var ctx = verificationScope.ServiceProvider.GetRequiredService<MerchelloDbContext>();
        var finalState = await ctx.ProductWarehouses
            .AsNoTracking()
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse.Id);

        finalState!.ReservedStock.ShouldBe(50);
    }

    /// <summary>
    /// Tests concurrent reserve and release operations happening simultaneously.
    /// Ensures data consistency when multiple operations modify the same record.
    /// </summary>
    [Fact]
    public async Task ConcurrentReserveAndRelease_MaintainsDataIntegrity()
    {
        _fixture.ResetDatabase();

        // Arrange: 100 stock, 50 already reserved
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct();
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100, trackStock: true, reservedStock: 50);
        await dataBuilder.SaveChangesAsync();

        // Act: Run 20 reserves and 20 releases in parallel
        // Each reserve: +5 reserved, Each release: -3 reserved
        // Net change: (20 * 5) - (20 * 3) = 100 - 60 = +40
        // Expected final: 50 + 40 = 90 reserved (if all succeed)
        // But some reserves may fail due to insufficient stock after +50 reserved
        var reserveTasks = Enumerable.Range(0, 20).Select(_ =>
            _fixture.GetService<IInventoryService>()
                .ReserveStockAsync(product.Id, warehouse.Id, 5));

        var releaseTasks = Enumerable.Range(0, 20).Select(_ =>
            _fixture.GetService<IInventoryService>()
                .ReleaseReservationAsync(product.Id, warehouse.Id, 3));

        var allResults = await Task.WhenAll(reserveTasks.Concat(releaseTasks));

        // Assert: Final state should be consistent (no negative values, no exceeding stock)
        using var verificationScope = _fixture.CreateScope();
        var ctx = verificationScope.ServiceProvider.GetRequiredService<MerchelloDbContext>();
        var finalState = await ctx.ProductWarehouses
            .AsNoTracking()
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse.Id);

        finalState.ShouldNotBeNull();
        finalState!.ReservedStock.ShouldBeGreaterThanOrEqualTo(0);
        finalState.ReservedStock.ShouldBeLessThanOrEqualTo(finalState.Stock);
        finalState.Stock.ShouldBe(100); // Physical stock never changes from reserve/release
    }

    /// <summary>
    /// Tests that concurrent allocations (which reduce physical stock) maintain data integrity.
    /// Under high concurrency, some allocations may fail due to optimistic locking, but the
    /// final state should be consistent (stock and reserved stock should remain in sync).
    /// </summary>
    [Fact]
    public async Task ConcurrentAllocations_MaintainDataIntegrity()
    {
        _fixture.ResetDatabase();

        // Arrange: 50 stock, 50 reserved (ready for allocation)
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct();
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 50, trackStock: true, reservedStock: 50);
        await dataBuilder.SaveChangesAsync();

        // Act: 10 concurrent allocations of 5 each
        // Under concurrency, not all may succeed due to optimistic locking
        var results = await ConcurrentTestHelper.RunWithResultTrackingAsync(
            10,
            async () => await _fixture.GetService<IInventoryService>()
                .AllocateStockAsync(product.Id, warehouse.Id, 5),
            result => result.ResultObject);

        // Assert: At least some should succeed
        results.SuccessCount.ShouldBeGreaterThan(0);

        // Verify data integrity - stock and reserved stock should remain in sync
        using var verificationScope = _fixture.CreateScope();
        var ctx = verificationScope.ServiceProvider.GetRequiredService<MerchelloDbContext>();
        var finalState = await ctx.ProductWarehouses
            .AsNoTracking()
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse.Id);

        finalState.ShouldNotBeNull();
        // Stock reduced by number of successful allocations * 5
        finalState!.Stock.ShouldBe(50 - (results.SuccessCount * 5));
        // Reserved stock reduced by same amount
        finalState.ReservedStock.ShouldBe(50 - (results.SuccessCount * 5));
        // Stock should never go negative
        finalState.Stock.ShouldBeGreaterThanOrEqualTo(0);
        finalState.ReservedStock.ShouldBeGreaterThanOrEqualTo(0);
    }

    /// <summary>
    /// Tests race condition scenario: multiple customers trying to reserve the last items.
    /// </summary>
    [Fact]
    public async Task LastItemRace_OnlyOneWins()
    {
        _fixture.ResetDatabase();

        // Arrange: Only 1 item left available (5 stock, 4 reserved)
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct();
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 5, trackStock: true, reservedStock: 4);
        await dataBuilder.SaveChangesAsync();

        // Act: 10 concurrent attempts to reserve the last item
        var results = await ConcurrentTestHelper.RunWithResultTrackingAsync(
            10,
            async () => await _fixture.GetService<IInventoryService>()
                .ReserveStockAsync(product.Id, warehouse.Id, 1),
            result => result.ResultObject);

        // Assert: Exactly 1 should win
        results.SuccessCount.ShouldBe(1);
        results.FailureCount.ShouldBe(9);

        // Verify final state
        using var verificationScope = _fixture.CreateScope();
        var ctx = verificationScope.ServiceProvider.GetRequiredService<MerchelloDbContext>();
        var finalState = await ctx.ProductWarehouses
            .AsNoTracking()
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse.Id);

        finalState!.ReservedStock.ShouldBe(5); // All stock now reserved
    }

    /// <summary>
    /// Tests concurrent bulk reservations where each request needs multiple units.
    /// </summary>
    [Fact]
    public async Task ConcurrentBulkReservations_CorrectPartialFulfillment()
    {
        _fixture.ResetDatabase();

        // Arrange: 25 stock, 5 concurrent requests for 10 each (only 2 can succeed)
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct();
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 25, trackStock: true);
        await dataBuilder.SaveChangesAsync();

        // Act: 5 concurrent attempts to reserve 10 each
        var results = await ConcurrentTestHelper.RunWithResultTrackingAsync(
            5,
            async () => await _fixture.GetService<IInventoryService>()
                .ReserveStockAsync(product.Id, warehouse.Id, 10),
            result => result.ResultObject);

        // Assert: At most 2 can succeed (25 / 10 = 2)
        results.SuccessCount.ShouldBeLessThanOrEqualTo(2);

        // Verify final state - reserved should be multiple of 10, max 20
        using var verificationScope = _fixture.CreateScope();
        var ctx = verificationScope.ServiceProvider.GetRequiredService<MerchelloDbContext>();
        var finalState = await ctx.ProductWarehouses
            .AsNoTracking()
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse.Id);

        finalState!.ReservedStock.ShouldBeOneOf(0, 10, 20);
        finalState.ReservedStock.ShouldBeLessThanOrEqualTo(25);
    }

    /// <summary>
    /// Stress test: Very high concurrency to validate no deadlocks or corruption.
    /// </summary>
    [Fact]
    public async Task StressTest_MassiveParallelReservations_NoDeadlocks()
    {
        _fixture.ResetDatabase();

        // Arrange: 500 stock, 1000 concurrent requests
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct();
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 500, trackStock: true);
        await dataBuilder.SaveChangesAsync();

        // Act: Fire 1000 concurrent reservations
        var results = await ConcurrentTestHelper.RunWithResultTrackingAsync(
            1000,
            async () => await _fixture.GetService<IInventoryService>()
                .ReserveStockAsync(product.Id, warehouse.Id, 1),
            result => result.ResultObject);

        // Assert: Total should equal concurrency level
        results.TotalCount.ShouldBe(1000);

        // Success + Failure should equal total requests
        (results.SuccessCount + results.FailureCount).ShouldBe(1000);

        // Success count should equal available stock
        results.SuccessCount.ShouldBe(500);

        // Verify final state
        using var verificationScope = _fixture.CreateScope();
        var ctx = verificationScope.ServiceProvider.GetRequiredService<MerchelloDbContext>();
        var finalState = await ctx.ProductWarehouses
            .AsNoTracking()
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse.Id);

        finalState!.ReservedStock.ShouldBe(500);
        finalState.Stock.ShouldBe(500);
    }

    /// <summary>
    /// Tests that digital products (TrackStock=false) handle unlimited concurrency.
    /// </summary>
    [Fact]
    public async Task DigitalProduct_ParallelReservations_AllSucceed()
    {
        _fixture.ResetDatabase();

        // Arrange: Digital product with TrackStock = false
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct("Digital Download");
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 0, trackStock: false);
        await dataBuilder.SaveChangesAsync();

        // Act: 100 concurrent reservations
        var results = await ConcurrentTestHelper.RunWithResultTrackingAsync(
            100,
            async () => await _fixture.GetService<IInventoryService>()
                .ReserveStockAsync(product.Id, warehouse.Id, 1),
            result => result.ResultObject);

        // Assert: ALL should succeed for digital product
        results.SuccessCount.ShouldBe(100);
        results.FailureCount.ShouldBe(0);

        // Verify stock unchanged
        using var verificationScope = _fixture.CreateScope();
        var ctx = verificationScope.ServiceProvider.GetRequiredService<MerchelloDbContext>();
        var finalState = await ctx.ProductWarehouses
            .AsNoTracking()
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id && pw.WarehouseId == warehouse.Id);

        finalState!.ReservedStock.ShouldBe(0); // Never incremented for digital
        finalState.Stock.ShouldBe(0);
    }

    #endregion
}

using Merchello.Core.Products.Models;
using Merchello.Core.Products.Services.Interfaces;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Products;

/// <summary>
/// Integration tests for InventoryService.
/// Tests stock reservation, release, and allocation logic.
/// </summary>
[Collection("Integration Tests")]
public class InventoryServiceTests
{
    private readonly ServiceTestFixture _fixture;
    private readonly IInventoryService _inventoryService;

    public InventoryServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _inventoryService = _fixture.GetService<IInventoryService>();
    }

    #region ReserveStock Tests

    [Fact]
    public async Task ReserveStock_WithSufficientStock_SucceedsAndUpdatesReserved()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct();
        var productWarehouse = dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100, trackStock: true);
        await dataBuilder.SaveChangesAsync();

        // Act
        var result = await _inventoryService.ReserveStockAsync(product.Id, warehouse.Id, 10);

        // Assert
        result.ResultObject.ShouldBeTrue();
        productWarehouse.ReservedStock.ShouldBe(10);
    }

    [Fact]
    public async Task ReserveStock_WithTrackStockFalse_SucceedsWithoutModifyingStock()
    {
        // Arrange - Digital product with TrackStock = false
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct("Digital Product");
        var productWarehouse = dataBuilder.CreateProductWarehouse(
            product, warehouse, stock: 0, trackStock: false);
        await dataBuilder.SaveChangesAsync();

        // Act
        var result = await _inventoryService.ReserveStockAsync(product.Id, warehouse.Id, 100);

        // Assert
        result.ResultObject.ShouldBeTrue();
        productWarehouse.ReservedStock.ShouldBe(0); // Should not change
        productWarehouse.Stock.ShouldBe(0); // Should not change
    }

    [Fact]
    public async Task ReserveStock_WithInsufficientStock_Fails()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct();
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 10, trackStock: true);
        await dataBuilder.SaveChangesAsync();

        // Act
        var result = await _inventoryService.ReserveStockAsync(product.Id, warehouse.Id, 20);

        // Assert
        result.ResultObject.ShouldBeFalse();
        result.Messages.ShouldNotBeEmpty();
        result.Messages.First().Message.ShouldContain("Insufficient stock");
    }

    [Fact]
    public async Task ReserveStock_WithZeroQuantity_Fails()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct();
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100, trackStock: true);
        await dataBuilder.SaveChangesAsync();

        // Act
        var result = await _inventoryService.ReserveStockAsync(product.Id, warehouse.Id, 0);

        // Assert
        result.ResultObject.ShouldBeFalse();
        result.Messages.ShouldNotBeEmpty();
        result.Messages.First().Message.ShouldContain("greater than zero");
    }

    [Fact]
    public async Task ReserveStock_WithNegativeQuantity_Fails()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct();
        dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100, trackStock: true);
        await dataBuilder.SaveChangesAsync();

        // Act
        var result = await _inventoryService.ReserveStockAsync(product.Id, warehouse.Id, -5);

        // Assert
        result.ResultObject.ShouldBeFalse();
        result.Messages.ShouldNotBeEmpty();
    }

    [Fact]
    public async Task ReserveStock_ProductNotInWarehouse_Fails()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct();
        // Note: NOT adding product to warehouse
        await dataBuilder.SaveChangesAsync();

        // Act
        var result = await _inventoryService.ReserveStockAsync(product.Id, warehouse.Id, 10);

        // Assert
        result.ResultObject.ShouldBeFalse();
        result.Messages.ShouldNotBeEmpty();
        result.Messages.First().Message.ShouldContain("not found");
    }

    [Fact]
    public async Task ReserveStock_ConsidersExistingReservations()
    {
        // Arrange - 100 stock, 90 already reserved = 10 available
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct();
        dataBuilder.CreateProductWarehouse(
            product, warehouse, stock: 100, trackStock: true, reservedStock: 90);
        await dataBuilder.SaveChangesAsync();

        // Act - Try to reserve 15 (only 10 available)
        var result = await _inventoryService.ReserveStockAsync(product.Id, warehouse.Id, 15);

        // Assert
        result.ResultObject.ShouldBeFalse();
        result.Messages.ShouldNotBeEmpty();
        result.Messages.First().Message.ShouldContain("Insufficient");
    }

    #endregion

    #region ReleaseReservation Tests

    [Fact]
    public async Task ReleaseReservation_WithExistingReservation_DecreasesReservedStock()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct();
        var productWarehouse = dataBuilder.CreateProductWarehouse(
            product, warehouse, stock: 100, trackStock: true, reservedStock: 30);
        await dataBuilder.SaveChangesAsync();

        // Act
        var result = await _inventoryService.ReleaseReservationAsync(product.Id, warehouse.Id, 10);

        // Assert
        result.ResultObject.ShouldBeTrue();
        productWarehouse.ReservedStock.ShouldBe(20); // 30 - 10
    }

    [Fact]
    public async Task ReleaseReservation_MoreThanReserved_DoesNotGoNegative()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct();
        var productWarehouse = dataBuilder.CreateProductWarehouse(
            product, warehouse, stock: 100, trackStock: true, reservedStock: 5);
        await dataBuilder.SaveChangesAsync();

        // Act - Release 10 when only 5 reserved
        var result = await _inventoryService.ReleaseReservationAsync(product.Id, warehouse.Id, 10);

        // Assert
        result.ResultObject.ShouldBeTrue();
        productWarehouse.ReservedStock.ShouldBe(0); // Clamped to 0
    }

    [Fact]
    public async Task ReleaseReservation_WithTrackStockFalse_SucceedsWithoutModifying()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct("Digital Product");
        var productWarehouse = dataBuilder.CreateProductWarehouse(
            product, warehouse, stock: 0, trackStock: false, reservedStock: 0);
        await dataBuilder.SaveChangesAsync();

        // Act
        var result = await _inventoryService.ReleaseReservationAsync(product.Id, warehouse.Id, 10);

        // Assert
        result.ResultObject.ShouldBeTrue();
        productWarehouse.ReservedStock.ShouldBe(0);
    }

    #endregion

    #region AllocateStock Tests

    [Fact]
    public async Task AllocateStock_DeductsFromBothStockAndReserved()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct();
        var productWarehouse = dataBuilder.CreateProductWarehouse(
            product, warehouse, stock: 100, trackStock: true, reservedStock: 30);
        await dataBuilder.SaveChangesAsync();

        // Act
        var result = await _inventoryService.AllocateStockAsync(product.Id, warehouse.Id, 20);

        // Assert
        result.ResultObject.ShouldBeTrue();
        productWarehouse.Stock.ShouldBe(80); // 100 - 20
        productWarehouse.ReservedStock.ShouldBe(10); // 30 - 20
    }

    [Fact]
    public async Task AllocateStock_WithTrackStockFalse_SucceedsWithoutModifying()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct("Digital Product");
        var productWarehouse = dataBuilder.CreateProductWarehouse(
            product, warehouse, stock: 0, trackStock: false);
        await dataBuilder.SaveChangesAsync();

        // Act
        var result = await _inventoryService.AllocateStockAsync(product.Id, warehouse.Id, 100);

        // Assert
        result.ResultObject.ShouldBeTrue();
        productWarehouse.Stock.ShouldBe(0); // Unchanged
    }

    [Fact]
    public async Task AllocateStock_DoesNotGoNegative()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct();
        var productWarehouse = dataBuilder.CreateProductWarehouse(
            product, warehouse, stock: 10, trackStock: true, reservedStock: 5);
        await dataBuilder.SaveChangesAsync();

        // Act - Allocate more than stock
        var result = await _inventoryService.AllocateStockAsync(product.Id, warehouse.Id, 20);

        // Assert
        result.ResultObject.ShouldBeTrue();
        productWarehouse.Stock.ShouldBe(0); // Clamped to 0
        productWarehouse.ReservedStock.ShouldBe(0); // Clamped to 0
    }

    #endregion

    #region GetAvailableStock Tests

    [Fact]
    public async Task GetAvailableStock_ReturnsStockMinusReserved()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct();
        dataBuilder.CreateProductWarehouse(
            product, warehouse, stock: 100, trackStock: true, reservedStock: 30);
        await dataBuilder.SaveChangesAsync();

        // Act
        var available = await _inventoryService.GetAvailableStockAsync(product.Id, warehouse.Id);

        // Assert
        available.ShouldBe(70); // 100 - 30
    }

    [Fact]
    public async Task GetAvailableStock_WithTrackStockFalse_ReturnsMaxValue()
    {
        // Arrange - Digital product
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct("Digital Product");
        dataBuilder.CreateProductWarehouse(
            product, warehouse, stock: 0, trackStock: false);
        await dataBuilder.SaveChangesAsync();

        // Act
        var available = await _inventoryService.GetAvailableStockAsync(product.Id, warehouse.Id);

        // Assert
        available.ShouldBe(int.MaxValue);
    }

    [Fact]
    public async Task GetAvailableStock_ProductNotInWarehouse_ReturnsZero()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct();
        // NOT adding to warehouse
        await dataBuilder.SaveChangesAsync();

        // Act
        var available = await _inventoryService.GetAvailableStockAsync(product.Id, warehouse.Id);

        // Assert
        available.ShouldBe(0);
    }

    #endregion

    #region IsStockTracked Tests

    [Fact]
    public async Task IsStockTracked_WithTrackStockTrue_ReturnsTrue()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct();
        dataBuilder.CreateProductWarehouse(product, warehouse, trackStock: true);
        await dataBuilder.SaveChangesAsync();

        // Act
        var isTracked = await _inventoryService.IsStockTrackedAsync(product.Id, warehouse.Id);

        // Assert
        isTracked.ShouldBeTrue();
    }

    [Fact]
    public async Task IsStockTracked_WithTrackStockFalse_ReturnsFalse()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct("Digital Product");
        dataBuilder.CreateProductWarehouse(product, warehouse, trackStock: false);
        await dataBuilder.SaveChangesAsync();

        // Act
        var isTracked = await _inventoryService.IsStockTrackedAsync(product.Id, warehouse.Id);

        // Assert
        isTracked.ShouldBeFalse();
    }

    [Fact]
    public async Task IsStockTracked_ProductNotInWarehouse_ReturnsTrue()
    {
        // Arrange - Default behavior when not found
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct();
        await dataBuilder.SaveChangesAsync();

        // Act
        var isTracked = await _inventoryService.IsStockTrackedAsync(product.Id, warehouse.Id);

        // Assert
        isTracked.ShouldBeTrue(); // Default is true (conservative approach)
    }

    #endregion

    #region Multiple Reservation Tests

    [Fact]
    public async Task ReserveStock_MultipleReservations_CumulativelyReduceAvailability()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct();
        var productWarehouse = dataBuilder.CreateProductWarehouse(
            product, warehouse, stock: 100, trackStock: true);
        await dataBuilder.SaveChangesAsync();

        // Act - Multiple reservations
        await _inventoryService.ReserveStockAsync(product.Id, warehouse.Id, 20);
        await _inventoryService.ReserveStockAsync(product.Id, warehouse.Id, 30);
        await _inventoryService.ReserveStockAsync(product.Id, warehouse.Id, 10);

        // Assert
        productWarehouse.ReservedStock.ShouldBe(60); // 20 + 30 + 10
        var available = await _inventoryService.GetAvailableStockAsync(product.Id, warehouse.Id);
        available.ShouldBe(40); // 100 - 60
    }

    [Fact]
    public async Task ReserveStock_ExactlyAvailableStock_Succeeds()
    {
        // Arrange
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse();
        var product = dataBuilder.CreateProduct();
        var productWarehouse = dataBuilder.CreateProductWarehouse(
            product, warehouse, stock: 50, trackStock: true, reservedStock: 30);
        await dataBuilder.SaveChangesAsync();

        // Act - Reserve exactly what's available (20)
        var result = await _inventoryService.ReserveStockAsync(product.Id, warehouse.Id, 20);

        // Assert
        result.ResultObject.ShouldBeTrue();
        productWarehouse.ReservedStock.ShouldBe(50);
        var available = await _inventoryService.GetAvailableStockAsync(product.Id, warehouse.Id);
        available.ShouldBe(0);
    }

    #endregion
}

using Merchello.Core.Fulfilment;
using Merchello.Core.Fulfilment.Providers.Interfaces;
using Merchello.Core.Fulfilment.Services;
using Merchello.Core.Fulfilment.Services.Interfaces;
using Merchello.Core.Shipping.Factories;
using Merchello.Tests.TestInfrastructure;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Fulfilment.Services;

/// <summary>
/// Integration tests for fulfilment provider resolution logic.
/// Tests the warehouse -> supplier hierarchy for provider assignment.
/// </summary>
[Collection("Integration Tests")]
public class ProviderResolutionTests
{
    private readonly ServiceTestFixture _fixture;
    private readonly TestDataBuilder _dataBuilder;

    public ProviderResolutionTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _dataBuilder = _fixture.CreateDataBuilder();
    }

    #region ResolveProviderForWarehouseAsync Tests

    [Fact]
    public async Task ResolveProviderForWarehouseAsync_WarehouseNotFound_ReturnsNull()
    {
        // Arrange
        var service = CreateFulfilmentService();

        // Act
        var result = await service.ResolveProviderForWarehouseAsync(Guid.NewGuid());

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public async Task ResolveProviderForWarehouseAsync_WarehouseWithNoProvider_ReturnsNull()
    {
        // Arrange
        var warehouse = _dataBuilder.CreateWarehouse("No Provider Warehouse");
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateFulfilmentService();

        // Act
        var result = await service.ResolveProviderForWarehouseAsync(warehouse.Id);

        // Assert - No provider configured
        result.ShouldBeNull();
    }

    [Fact]
    public async Task ResolveProviderForWarehouseAsync_WarehouseWithDirectProvider_ReturnsWarehouseProvider()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration(displayName: "Warehouse Direct Provider");
        var warehouse = _dataBuilder.CreateWarehouse("Warehouse With Provider");
        _dataBuilder.AssignFulfilmentProviderToWarehouse(warehouse, config);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateFulfilmentService();

        // Act
        var result = await service.ResolveProviderForWarehouseAsync(warehouse.Id);

        // Assert
        result.ShouldNotBeNull();
        result!.Id.ShouldBe(config.Id);
        result.DisplayName.ShouldBe("Warehouse Direct Provider");
    }

    [Fact]
    public async Task ResolveProviderForWarehouseAsync_SupplierWithDefaultProvider_ReturnsSupplierProvider()
    {
        // Arrange - Warehouse linked to supplier, supplier has default provider
        var supplierConfig = _dataBuilder.CreateFulfilmentProviderConfiguration(displayName: "Supplier Default Provider");
        var supplier = _dataBuilder.CreateSupplier("Test Supplier");
        _dataBuilder.AssignDefaultFulfilmentProviderToSupplier(supplier, supplierConfig);
        var warehouse = _dataBuilder.CreateWarehouse("Supplier Warehouse", supplier: supplier);
        // No direct provider on warehouse
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateFulfilmentService();

        // Act
        var result = await service.ResolveProviderForWarehouseAsync(warehouse.Id);

        // Assert - Falls back to supplier's default provider
        result.ShouldNotBeNull();
        result!.Id.ShouldBe(supplierConfig.Id);
        result.DisplayName.ShouldBe("Supplier Default Provider");
    }

    [Fact]
    public async Task ResolveProviderForWarehouseAsync_WarehouseOverridesSupplier_ReturnsWarehouseProvider()
    {
        // Arrange - Warehouse has own provider, supplier also has provider
        var supplierConfig = _dataBuilder.CreateFulfilmentProviderConfiguration(
            providerKey: "supplier-provider",
            displayName: "Supplier Default Provider");
        var warehouseConfig = _dataBuilder.CreateFulfilmentProviderConfiguration(
            providerKey: "warehouse-provider",
            displayName: "Warehouse Override Provider");

        var supplier = _dataBuilder.CreateSupplier("Test Supplier");
        _dataBuilder.AssignDefaultFulfilmentProviderToSupplier(supplier, supplierConfig);

        var warehouse = _dataBuilder.CreateWarehouse("Warehouse With Override", supplier: supplier);
        _dataBuilder.AssignFulfilmentProviderToWarehouse(warehouse, warehouseConfig);

        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateFulfilmentService();

        // Act
        var result = await service.ResolveProviderForWarehouseAsync(warehouse.Id);

        // Assert - Warehouse provider takes precedence over supplier
        result.ShouldNotBeNull();
        result!.Id.ShouldBe(warehouseConfig.Id);
        result.DisplayName.ShouldBe("Warehouse Override Provider");
    }

    [Fact]
    public async Task ResolveProviderForWarehouseAsync_SupplierWithoutProvider_ReturnsNull()
    {
        // Arrange - Warehouse linked to supplier, but supplier has no provider
        var supplier = _dataBuilder.CreateSupplier("No Provider Supplier");
        var warehouse = _dataBuilder.CreateWarehouse("Supplier Warehouse", supplier: supplier);
        // Neither warehouse nor supplier has a provider
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateFulfilmentService();

        // Act
        var result = await service.ResolveProviderForWarehouseAsync(warehouse.Id);

        // Assert - No provider found in hierarchy
        result.ShouldBeNull();
    }

    [Fact]
    public async Task ResolveProviderForWarehouseAsync_MultipleWarehousesSameSupplier_EachResolvesCorrectly()
    {
        // Arrange - Two warehouses from same supplier: one with override, one without
        var supplierConfig = _dataBuilder.CreateFulfilmentProviderConfiguration(
            providerKey: "supplier-provider",
            displayName: "Supplier Default");
        var warehouse1Config = _dataBuilder.CreateFulfilmentProviderConfiguration(
            providerKey: "warehouse-1-provider",
            displayName: "Warehouse 1 Override");

        var supplier = _dataBuilder.CreateSupplier("Multi Warehouse Supplier");
        _dataBuilder.AssignDefaultFulfilmentProviderToSupplier(supplier, supplierConfig);

        var warehouse1 = _dataBuilder.CreateWarehouse("Warehouse 1 (Override)", supplier: supplier);
        _dataBuilder.AssignFulfilmentProviderToWarehouse(warehouse1, warehouse1Config);

        var warehouse2 = _dataBuilder.CreateWarehouse("Warehouse 2 (Default)", supplier: supplier);
        // No override for warehouse2

        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateFulfilmentService();

        // Act
        var result1 = await service.ResolveProviderForWarehouseAsync(warehouse1.Id);
        var result2 = await service.ResolveProviderForWarehouseAsync(warehouse2.Id);

        // Assert
        result1.ShouldNotBeNull();
        result1!.DisplayName.ShouldBe("Warehouse 1 Override");

        result2.ShouldNotBeNull();
        result2!.DisplayName.ShouldBe("Supplier Default");
    }

    [Fact]
    public async Task ResolveProviderForWarehouseAsync_IndependentWarehouse_NotAffectedBySupplierChanges()
    {
        // Arrange - Warehouse without supplier has own provider
        var warehouseConfig = _dataBuilder.CreateFulfilmentProviderConfiguration(displayName: "Independent Provider");
        var warehouse = _dataBuilder.CreateWarehouse("Independent Warehouse"); // No supplier
        _dataBuilder.AssignFulfilmentProviderToWarehouse(warehouse, warehouseConfig);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateFulfilmentService();

        // Act
        var result = await service.ResolveProviderForWarehouseAsync(warehouse.Id);

        // Assert
        result.ShouldNotBeNull();
        result!.DisplayName.ShouldBe("Independent Provider");
    }

    #endregion

    #region Provider Configuration Tests

    [Fact]
    public async Task ResolveProviderForWarehouseAsync_DisabledProvider_StillReturnsConfiguration()
    {
        // Arrange - Provider is disabled but configuration still returned
        // (The check for enabled status happens at a higher level)
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration(
            displayName: "Disabled Provider",
            isEnabled: false);
        var warehouse = _dataBuilder.CreateWarehouse("Warehouse");
        _dataBuilder.AssignFulfilmentProviderToWarehouse(warehouse, config);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateFulfilmentService();

        // Act
        var result = await service.ResolveProviderForWarehouseAsync(warehouse.Id);

        // Assert - Configuration is returned (caller checks enabled status)
        result.ShouldNotBeNull();
        result!.IsEnabled.ShouldBeFalse();
    }

    [Fact]
    public async Task ResolveProviderForWarehouseAsync_ProviderWithSettings_ReturnsFullConfiguration()
    {
        // Arrange
        var settingsJson = """{"apiKey":"test-api-key","environment":"sandbox"}""";
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration(
            displayName: "Configured Provider",
            settingsJson: settingsJson);
        var warehouse = _dataBuilder.CreateWarehouse("Configured Warehouse");
        _dataBuilder.AssignFulfilmentProviderToWarehouse(warehouse, config);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateFulfilmentService();

        // Act
        var result = await service.ResolveProviderForWarehouseAsync(warehouse.Id);

        // Assert
        result.ShouldNotBeNull();
        result!.SettingsJson.ShouldBe(settingsJson);
    }

    #endregion

    #region Helper Methods

    private IFulfilmentService CreateFulfilmentService()
    {
        var providerManagerMock = new Mock<IFulfilmentProviderManager>();

        return new FulfilmentService(
            _fixture.DbContext,
            providerManagerMock.Object,
            new ShipmentFactory(),
            Options.Create(new FulfilmentSettings { MaxRetryAttempts = 5 }),
            NullLogger<FulfilmentService>.Instance);
    }

    #endregion
}

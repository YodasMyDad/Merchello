using Merchello.Core.Data;
using Merchello.Core.Fulfilment;
using Merchello.Core.Fulfilment.Models;
using Merchello.Core.Fulfilment.Providers;
using Merchello.Core.Fulfilment.Providers.Interfaces;
using Merchello.Core.Fulfilment.Services;
using Merchello.Core.Fulfilment.Services.Interfaces;
using Merchello.Core.Fulfilment.Services.Parameters;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Tests.Fulfilment.Providers;
using Merchello.Tests.TestInfrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Shouldly;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.Fulfilment.Services;

/// <summary>
/// Integration tests for FulfilmentSyncService.
/// Tests product sync, inventory sync, and sync history queries.
/// </summary>
[Collection("Integration Tests")]
public class FulfilmentSyncServiceTests
{
    private readonly ServiceTestFixture _fixture;
    private readonly TestDataBuilder _dataBuilder;
    private readonly TestFulfilmentProvider _testProvider;
    private readonly Mock<IMerchelloNotificationPublisher> _notificationPublisherMock;

    public FulfilmentSyncServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();
        _dataBuilder = _fixture.CreateDataBuilder();
        _testProvider = new TestFulfilmentProvider();
        _notificationPublisherMock = new Mock<IMerchelloNotificationPublisher>();
    }

    #region SyncProductsAsync Tests

    [Fact]
    public async Task SyncProductsAsync_ProviderNotFound_LogsFailure()
    {
        // Arrange - Create a config in the database so the FK constraint is satisfied,
        // but the mock returns null to simulate provider not being registered
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateSyncServiceWithoutProvider();

        // Act
        var result = await service.SyncProductsAsync(config.Id);

        // Assert
        result.Status.ShouldBe(FulfilmentSyncStatus.Failed);
        result.ErrorMessage!.ShouldContain("not found");
    }

    [Fact]
    public async Task SyncProductsAsync_ProviderDisabled_LogsFailure()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration(isEnabled: false);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateSyncServiceWithProvider(config, isEnabled: false);

        // Act
        var result = await service.SyncProductsAsync(config.Id);

        // Assert
        result.Status.ShouldBe(FulfilmentSyncStatus.Failed);
        result.ErrorMessage!.ShouldContain("disabled");
    }

    [Fact]
    public async Task SyncProductsAsync_NoProductsToSync_CompletesSuccessfully()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateSyncServiceWithProvider(config);

        // Act
        var result = await service.SyncProductsAsync(config.Id);

        // Assert
        result.Status.ShouldBe(FulfilmentSyncStatus.Completed);
        result.ItemsProcessed.ShouldBe(0);
    }

    [Fact]
    public async Task SyncProductsAsync_WithProducts_SyncsToProvider()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        var warehouse = _dataBuilder.CreateWarehouse();
        var product1 = _dataBuilder.CreateProduct("Physical Product 1", price: 29.99m);
        product1.CanPurchase = true;
        _dataBuilder.CreateProductWarehouse(product1, warehouse, stock: 100);
        var product2 = _dataBuilder.CreateProduct("Physical Product 2", price: 49.99m);
        product2.CanPurchase = true;
        _dataBuilder.CreateProductWarehouse(product2, warehouse, stock: 50);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateSyncServiceWithProvider(config);
        _testProvider.NextProductSyncResult = new FulfilmentSyncResult
        {
            Success = true,
            ItemsProcessed = 2,
            ItemsSucceeded = 2,
            ItemsFailed = 0
        };

        // Act
        var result = await service.SyncProductsAsync(config.Id);

        // Assert
        result.Status.ShouldBe(FulfilmentSyncStatus.Completed);
        result.ItemsProcessed.ShouldBe(2);
        result.ItemsSucceeded.ShouldBe(2);
        result.ItemsFailed.ShouldBe(0);

        // Verify provider was called with correct products
        _testProvider.SyncedProducts.ShouldNotBeEmpty();
        var syncedProducts = _testProvider.SyncedProducts.First().ToList();
        syncedProducts.Count.ShouldBe(2);
    }

    [Fact]
    public async Task SyncProductsAsync_ProviderFails_LogsFailure()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        var product = _dataBuilder.CreateProduct("Test Product", price: 29.99m);
        product.CanPurchase = true;
        var warehouse = _dataBuilder.CreateWarehouse();
        _dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateSyncServiceWithProvider(config);
        _testProvider.NextProductSyncResult = new FulfilmentSyncResult
        {
            Success = false,
            ItemsProcessed = 1,
            ItemsSucceeded = 0,
            ItemsFailed = 1,
            Errors = ["Failed to sync product: API error"]
        };

        // Act
        var result = await service.SyncProductsAsync(config.Id);

        // Assert
        result.Status.ShouldBe(FulfilmentSyncStatus.Failed);
        result.ErrorMessage!.ShouldContain("API error");
    }

    [Fact]
    public async Task SyncProductsAsync_ProviderThrowsException_LogsFailure()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        var product = _dataBuilder.CreateProduct("Test Product", price: 29.99m);
        product.CanPurchase = true;
        var warehouse = _dataBuilder.CreateWarehouse();
        _dataBuilder.CreateProductWarehouse(product, warehouse, stock: 100);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateSyncServiceWithProvider(config);
        _testProvider.ExceptionToThrow = new HttpRequestException("Network timeout");

        // Act
        var result = await service.SyncProductsAsync(config.Id);

        // Assert
        result.Status.ShouldBe(FulfilmentSyncStatus.Failed);
        result.ErrorMessage!.ShouldContain("Network timeout");
    }

    #endregion

    #region SyncInventoryAsync Tests

    [Fact]
    public async Task SyncInventoryAsync_ProviderReturnsLevels_UpdatesStock()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        var warehouse = _dataBuilder.CreateWarehouse();
        var product = _dataBuilder.CreateProduct("Test Product", price: 29.99m);
        product.Sku = "TEST-SKU-001";
        _dataBuilder.CreateProductWarehouse(product, warehouse, stock: 50, trackStock: true);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateSyncServiceWithProvider(config);
        _testProvider.NextInventoryLevels =
        [
            new FulfilmentInventoryLevel { Sku = "TEST-SKU-001", AvailableQuantity = 75 }
        ];

        // Act
        var result = await service.SyncInventoryAsync(config.Id);

        // Assert
        result.Status.ShouldBe(FulfilmentSyncStatus.Completed);
        result.ItemsSucceeded.ShouldBe(1);

        // Verify stock was updated
        var productWarehouse = await _fixture.DbContext.ProductWarehouses
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id);
        productWarehouse!.Stock.ShouldBe(75);
    }

    [Fact]
    public async Task SyncInventoryAsync_NoInventoryLevels_CompletesSuccessfully()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateSyncServiceWithProvider(config);
        _testProvider.NextInventoryLevels = [];

        // Act
        var result = await service.SyncInventoryAsync(config.Id);

        // Assert
        result.Status.ShouldBe(FulfilmentSyncStatus.Completed);
        result.ItemsProcessed.ShouldBe(0);
    }

    [Fact]
    public async Task SyncInventoryAsync_UnknownSku_SkipsWithoutError()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateSyncServiceWithProvider(config);
        _testProvider.NextInventoryLevels =
        [
            new FulfilmentInventoryLevel { Sku = "NON-EXISTENT-SKU", AvailableQuantity = 100 }
        ];

        // Act
        var result = await service.SyncInventoryAsync(config.Id);

        // Assert
        result.Status.ShouldBe(FulfilmentSyncStatus.Completed);
        result.ItemsProcessed.ShouldBe(1);
        result.ItemsSucceeded.ShouldBe(0); // SKU not found
        result.ItemsFailed.ShouldBe(0); // Not an error, just skipped
    }

    [Fact]
    public async Task SyncInventoryAsync_StockTrackingDisabled_SkipsUpdate()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        var warehouse = _dataBuilder.CreateWarehouse();
        var product = _dataBuilder.CreateProduct("Test Product", price: 29.99m);
        product.Sku = "NO-TRACK-SKU";
        _dataBuilder.CreateProductWarehouse(product, warehouse, stock: 50, trackStock: false); // Tracking disabled
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateSyncServiceWithProvider(config);
        _testProvider.NextInventoryLevels =
        [
            new FulfilmentInventoryLevel { Sku = "NO-TRACK-SKU", AvailableQuantity = 999 }
        ];

        // Act
        var result = await service.SyncInventoryAsync(config.Id);

        // Assert
        result.Status.ShouldBe(FulfilmentSyncStatus.Completed);
        result.ItemsSucceeded.ShouldBe(1); // Processed but didn't need to update

        // Verify stock was NOT updated
        var productWarehouse = await _fixture.DbContext.ProductWarehouses
            .FirstOrDefaultAsync(pw => pw.ProductId == product.Id);
        productWarehouse!.Stock.ShouldBe(50); // Unchanged
    }

    #endregion

    #region GetSyncHistoryAsync Tests

    [Fact]
    public async Task GetSyncHistoryAsync_ReturnsLogsForProvider()
    {
        // Arrange
        var config1 = _dataBuilder.CreateFulfilmentProviderConfiguration(providerKey: "provider-1");
        var config2 = _dataBuilder.CreateFulfilmentProviderConfiguration(providerKey: "provider-2");
        _dataBuilder.CreateFulfilmentSyncLog(config1, FulfilmentSyncType.ProductsOut);
        _dataBuilder.CreateFulfilmentSyncLog(config1, FulfilmentSyncType.InventoryIn);
        _dataBuilder.CreateFulfilmentSyncLog(config2, FulfilmentSyncType.ProductsOut);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateSyncServiceWithoutProvider();
        var parameters = new FulfilmentSyncLogQueryParameters
        {
            ProviderConfigurationId = config1.Id,
            Page = 1,
            PageSize = 10
        };

        // Act
        var result = await service.GetSyncHistoryAsync(parameters);

        // Assert
        result.TotalItems.ShouldBe(2);
        result.Items.ShouldAllBe(log => log.ProviderConfigurationId == config1.Id);
    }

    [Fact]
    public async Task GetSyncHistoryAsync_FiltersBySyncType()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        _dataBuilder.CreateFulfilmentSyncLog(config, FulfilmentSyncType.ProductsOut);
        _dataBuilder.CreateFulfilmentSyncLog(config, FulfilmentSyncType.InventoryIn);
        _dataBuilder.CreateFulfilmentSyncLog(config, FulfilmentSyncType.InventoryIn);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateSyncServiceWithoutProvider();
        var parameters = new FulfilmentSyncLogQueryParameters
        {
            SyncType = FulfilmentSyncType.InventoryIn,
            Page = 1,
            PageSize = 10
        };

        // Act
        var result = await service.GetSyncHistoryAsync(parameters);

        // Assert
        result.TotalItems.ShouldBe(2);
        result.Items.ShouldAllBe(log => log.SyncType == FulfilmentSyncType.InventoryIn);
    }

    [Fact]
    public async Task GetSyncHistoryAsync_FiltersByStatus()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        _dataBuilder.CreateFulfilmentSyncLog(config, status: FulfilmentSyncStatus.Completed);
        _dataBuilder.CreateFulfilmentSyncLog(config, status: FulfilmentSyncStatus.Failed, errorMessage: "Error");
        _dataBuilder.CreateFulfilmentSyncLog(config, status: FulfilmentSyncStatus.Completed);
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateSyncServiceWithoutProvider();
        var parameters = new FulfilmentSyncLogQueryParameters
        {
            Status = FulfilmentSyncStatus.Failed,
            Page = 1,
            PageSize = 10
        };

        // Act
        var result = await service.GetSyncHistoryAsync(parameters);

        // Assert
        result.TotalItems.ShouldBe(1);
        result.Items.First().Status.ShouldBe(FulfilmentSyncStatus.Failed);
    }

    [Fact]
    public async Task GetSyncHistoryAsync_PaginatesCorrectly()
    {
        // Arrange
        var config = _dataBuilder.CreateFulfilmentProviderConfiguration();
        for (int i = 0; i < 15; i++)
        {
            _dataBuilder.CreateFulfilmentSyncLog(config);
        }
        await _dataBuilder.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();

        var service = CreateSyncServiceWithoutProvider();
        var parameters = new FulfilmentSyncLogQueryParameters
        {
            Page = 2,
            PageSize = 10
        };

        // Act
        var result = await service.GetSyncHistoryAsync(parameters);

        // Assert
        result.TotalItems.ShouldBe(15);
        result.TotalPages.ShouldBe(2);
        result.Items.Count().ShouldBe(5); // Second page with 5 remaining items
    }

    #endregion

    #region Helper Methods

    private IFulfilmentSyncService CreateSyncServiceWithoutProvider()
    {
        var providerManagerMock = new Mock<IFulfilmentProviderManager>();
        providerManagerMock
            .Setup(x => x.GetConfiguredProviderAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((RegisteredFulfilmentProvider?)null);

        return new FulfilmentSyncService(
            _fixture.GetService<IEFCoreScopeProvider<MerchelloDbContext>>(),
            providerManagerMock.Object,
            _notificationPublisherMock.Object,
            Options.Create(new FulfilmentSettings()),
            NullLogger<FulfilmentSyncService>.Instance);
    }

    private IFulfilmentSyncService CreateSyncServiceWithProvider(
        FulfilmentProviderConfiguration config,
        bool isEnabled = true)
    {
        _testProvider.Reset();

        config.IsEnabled = isEnabled;
        var registeredProvider = new RegisteredFulfilmentProvider(_testProvider, config);

        var providerManagerMock = new Mock<IFulfilmentProviderManager>();
        providerManagerMock
            .Setup(x => x.GetConfiguredProviderAsync(config.Id, It.IsAny<CancellationToken>()))
            .ReturnsAsync(registeredProvider);

        return new FulfilmentSyncService(
            _fixture.GetService<IEFCoreScopeProvider<MerchelloDbContext>>(),
            providerManagerMock.Object,
            _notificationPublisherMock.Object,
            Options.Create(new FulfilmentSettings()),
            NullLogger<FulfilmentSyncService>.Instance);
    }

    #endregion
}

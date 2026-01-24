using Merchello.Core.Data;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Moq;
using Shouldly;
using Umbraco.Cms.Core.Scoping;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.Shipping.Services;

/// <summary>
/// Unit tests for WarehouseProviderConfigService using an in-memory SQLite database.
/// Each test creates a fresh database for isolation.
/// </summary>
public class WarehouseProviderConfigServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly MerchelloDbContext _dbContext;
    private readonly WarehouseProviderConfigService _service;

    public WarehouseProviderConfigServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<MerchelloDbContext>()
            .UseSqlite(_connection)
            .Options;

        _dbContext = new MerchelloDbContext(options);
        _dbContext.Database.EnsureCreated();

        var scopeProvider = CreateMockScopeProvider(() => _dbContext);
        _service = new WarehouseProviderConfigService(scopeProvider);
    }

    [Fact]
    public async Task CreateAsync_StoresNewConfig()
    {
        // Arrange
        var config = new WarehouseProviderConfig
        {
            WarehouseId = Guid.NewGuid(),
            ProviderKey = "fedex",
            IsEnabled = true,
            DefaultMarkupPercent = 10m
        };

        // Act
        var result = await _service.CreateAsync(config);

        // Assert
        result.ShouldNotBeNull();
        result.Id.ShouldNotBe(Guid.Empty);
        result.WarehouseId.ShouldBe(config.WarehouseId);
        result.ProviderKey.ShouldBe("fedex");
        result.IsEnabled.ShouldBeTrue();
        result.DefaultMarkupPercent.ShouldBe(10m);
        result.CreateDate.ShouldBeGreaterThan(DateTime.MinValue);
        result.UpdateDate.ShouldBeGreaterThan(DateTime.MinValue);
    }

    [Fact]
    public async Task CreateAsync_AssignsNewId_WhenIdIsEmpty()
    {
        // Arrange
        var config = new WarehouseProviderConfig
        {
            Id = Guid.Empty,
            WarehouseId = Guid.NewGuid(),
            ProviderKey = "ups"
        };

        // Act
        var result = await _service.CreateAsync(config);

        // Assert
        result.Id.ShouldNotBe(Guid.Empty);
    }

    [Fact]
    public async Task CreateAsync_PreservesExistingId_WhenProvided()
    {
        // Arrange
        var expectedId = Guid.NewGuid();
        var config = new WarehouseProviderConfig
        {
            Id = expectedId,
            WarehouseId = Guid.NewGuid(),
            ProviderKey = "ups"
        };

        // Act
        var result = await _service.CreateAsync(config);

        // Assert
        result.Id.ShouldBe(expectedId);
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsConfig_WhenExists()
    {
        // Arrange
        var config = await CreateTestConfig("fedex");

        // Act
        _dbContext.ChangeTracker.Clear();
        var result = await _service.GetByIdAsync(config.Id);

        // Assert
        result.ShouldNotBeNull();
        result.Id.ShouldBe(config.Id);
        result.ProviderKey.ShouldBe("fedex");
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsNull_WhenNotExists()
    {
        // Act
        var result = await _service.GetByIdAsync(Guid.NewGuid());

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public async Task GetByWarehouseAndProviderAsync_ReturnsCorrectConfig()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        await CreateTestConfig("fedex", warehouseId);
        await CreateTestConfig("ups", warehouseId);
        await CreateTestConfig("fedex", Guid.NewGuid()); // different warehouse

        // Act
        _dbContext.ChangeTracker.Clear();
        var result = await _service.GetByWarehouseAndProviderAsync(warehouseId, "fedex");

        // Assert
        result.ShouldNotBeNull();
        result.WarehouseId.ShouldBe(warehouseId);
        result.ProviderKey.ShouldBe("fedex");
    }

    [Fact]
    public async Task GetByWarehouseAndProviderAsync_ReturnsNull_WhenNoMatch()
    {
        // Arrange
        await CreateTestConfig("fedex");

        // Act
        var result = await _service.GetByWarehouseAndProviderAsync(Guid.NewGuid(), "ups");

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public async Task GetByWarehouseAsync_ReturnsAllConfigsForWarehouse()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        var otherWarehouseId = Guid.NewGuid();
        await CreateTestConfig("fedex", warehouseId);
        await CreateTestConfig("ups", warehouseId);
        await CreateTestConfig("fedex", otherWarehouseId);

        // Act
        _dbContext.ChangeTracker.Clear();
        var result = await _service.GetByWarehouseAsync(warehouseId);

        // Assert
        result.ShouldNotBeNull();
        result.Count.ShouldBe(2);
        result.ShouldAllBe(c => c.WarehouseId == warehouseId);
    }

    [Fact]
    public async Task GetByWarehouseAsync_ReturnsEmptyList_WhenNoConfigs()
    {
        // Act
        var result = await _service.GetByWarehouseAsync(Guid.NewGuid());

        // Assert
        result.ShouldNotBeNull();
        result.ShouldBeEmpty();
    }

    [Fact]
    public async Task GetByProviderAsync_ReturnsAllConfigsForProviderKey()
    {
        // Arrange
        await CreateTestConfig("fedex", Guid.NewGuid());
        await CreateTestConfig("fedex", Guid.NewGuid());
        await CreateTestConfig("ups", Guid.NewGuid());

        // Act
        _dbContext.ChangeTracker.Clear();
        var result = await _service.GetByProviderAsync("fedex");

        // Assert
        result.ShouldNotBeNull();
        result.Count.ShouldBe(2);
        result.ShouldAllBe(c => c.ProviderKey == "fedex");
    }

    [Fact]
    public async Task GetByProviderAsync_ReturnsEmptyList_WhenNoConfigs()
    {
        // Act
        var result = await _service.GetByProviderAsync("nonexistent");

        // Assert
        result.ShouldNotBeNull();
        result.ShouldBeEmpty();
    }

    [Fact]
    public async Task GetAllEnabledAsync_ReturnsOnlyEnabledConfigs()
    {
        // Arrange
        await CreateTestConfig("fedex", isEnabled: true);
        await CreateTestConfig("ups", isEnabled: true);
        await CreateTestConfig("dhl", isEnabled: false);

        // Act
        _dbContext.ChangeTracker.Clear();
        var result = await _service.GetAllEnabledAsync();

        // Assert
        result.ShouldNotBeNull();
        result.Count.ShouldBe(2);
        result.ShouldAllBe(c => c.IsEnabled);
    }

    [Fact]
    public async Task GetAllEnabledAsync_ReturnsEmptyList_WhenNoneEnabled()
    {
        // Arrange
        await CreateTestConfig("fedex", isEnabled: false);
        await CreateTestConfig("ups", isEnabled: false);

        // Act
        _dbContext.ChangeTracker.Clear();
        var result = await _service.GetAllEnabledAsync();

        // Assert
        result.ShouldNotBeNull();
        result.ShouldBeEmpty();
    }

    [Fact]
    public async Task UpdateAsync_ModifiesExistingConfig()
    {
        // Arrange
        var config = await CreateTestConfig("fedex", isEnabled: true);
        var originalUpdateDate = config.UpdateDate;

        // Small delay to ensure UpdateDate changes
        await Task.Delay(10);

        // Act
        _dbContext.ChangeTracker.Clear();
        config.IsEnabled = false;
        config.DefaultMarkupPercent = 25m;
        config.DefaultDaysFromOverride = 3;
        config.DefaultDaysToOverride = 7;
        var result = await _service.UpdateAsync(config);

        // Assert
        result.IsEnabled.ShouldBeFalse();
        result.DefaultMarkupPercent.ShouldBe(25m);
        result.DefaultDaysFromOverride.ShouldBe(3);
        result.DefaultDaysToOverride.ShouldBe(7);
        result.UpdateDate.ShouldBeGreaterThanOrEqualTo(originalUpdateDate);

        // Verify persisted
        _dbContext.ChangeTracker.Clear();
        var persisted = await _service.GetByIdAsync(config.Id);
        persisted.ShouldNotBeNull();
        persisted.IsEnabled.ShouldBeFalse();
        persisted.DefaultMarkupPercent.ShouldBe(25m);
    }

    [Fact]
    public async Task UpdateAsync_UpdatesServiceMarkupsJson()
    {
        // Arrange
        var config = await CreateTestConfig("fedex");

        // Act
        _dbContext.ChangeTracker.Clear();
        config.ServiceMarkupsJson = """{"FEDEX_GROUND": 5, "FEDEX_2_DAY": 15}""";
        await _service.UpdateAsync(config);

        // Assert
        _dbContext.ChangeTracker.Clear();
        var persisted = await _service.GetByIdAsync(config.Id);
        persisted.ShouldNotBeNull();
        persisted.ServiceMarkupsJson.ShouldBe("""{"FEDEX_GROUND": 5, "FEDEX_2_DAY": 15}""");
        persisted.GetMarkupForService("FEDEX_GROUND").ShouldBe(5m);
        persisted.GetMarkupForService("FEDEX_2_DAY").ShouldBe(15m);
    }

    [Fact]
    public async Task UpdateAsync_UpdatesExcludedServiceTypesJson()
    {
        // Arrange
        var config = await CreateTestConfig("ups");

        // Act
        _dbContext.ChangeTracker.Clear();
        config.ExcludedServiceTypesJson = """["FIRST_OVERNIGHT", "PRIORITY_OVERNIGHT"]""";
        await _service.UpdateAsync(config);

        // Assert
        _dbContext.ChangeTracker.Clear();
        var persisted = await _service.GetByIdAsync(config.Id);
        persisted.ShouldNotBeNull();
        persisted.IsServiceExcluded("FIRST_OVERNIGHT").ShouldBeTrue();
        persisted.IsServiceExcluded("PRIORITY_OVERNIGHT").ShouldBeTrue();
        persisted.IsServiceExcluded("GROUND").ShouldBeFalse();
    }

    [Fact]
    public async Task DeleteAsync_RemovesConfig()
    {
        // Arrange
        var config = await CreateTestConfig("fedex");

        // Act
        _dbContext.ChangeTracker.Clear();
        await _service.DeleteAsync(config.Id);

        // Assert
        _dbContext.ChangeTracker.Clear();
        var result = await _service.GetByIdAsync(config.Id);
        result.ShouldBeNull();
    }

    [Fact]
    public async Task DeleteAsync_DoesNotThrow_WhenIdNotFound()
    {
        // Act & Assert - should not throw
        await Should.NotThrowAsync(() => _service.DeleteAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task ExistsAsync_ReturnsTrue_WhenConfigExists()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        await CreateTestConfig("fedex", warehouseId);

        // Act
        _dbContext.ChangeTracker.Clear();
        var result = await _service.ExistsAsync(warehouseId, "fedex");

        // Assert
        result.ShouldBeTrue();
    }

    [Fact]
    public async Task ExistsAsync_ReturnsFalse_WhenWarehouseIdDoesNotMatch()
    {
        // Arrange
        await CreateTestConfig("fedex", Guid.NewGuid());

        // Act
        var result = await _service.ExistsAsync(Guid.NewGuid(), "fedex");

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public async Task ExistsAsync_ReturnsFalse_WhenProviderKeyDoesNotMatch()
    {
        // Arrange
        var warehouseId = Guid.NewGuid();
        await CreateTestConfig("fedex", warehouseId);

        // Act
        var result = await _service.ExistsAsync(warehouseId, "ups");

        // Assert
        result.ShouldBeFalse();
    }

    [Fact]
    public async Task ExistsAsync_ReturnsFalse_WhenNoConfigs()
    {
        // Act
        var result = await _service.ExistsAsync(Guid.NewGuid(), "fedex");

        // Assert
        result.ShouldBeFalse();
    }

    #region Helpers

    private async Task<WarehouseProviderConfig> CreateTestConfig(
        string providerKey,
        Guid? warehouseId = null,
        bool isEnabled = true,
        decimal markupPercent = 0m)
    {
        var config = new WarehouseProviderConfig
        {
            WarehouseId = warehouseId ?? Guid.NewGuid(),
            ProviderKey = providerKey,
            IsEnabled = isEnabled,
            DefaultMarkupPercent = markupPercent
        };

        return await _service.CreateAsync(config);
    }

    private static IEFCoreScopeProvider<MerchelloDbContext> CreateMockScopeProvider(
        Func<MerchelloDbContext> dbContextFactory)
    {
        var scopeProviderMock = new Mock<IEFCoreScopeProvider<MerchelloDbContext>>();
        scopeProviderMock
            .Setup(p => p.CreateScope(It.IsAny<RepositoryCacheMode>(), It.IsAny<bool?>()))
            .Returns(() =>
            {
                var dbContext = dbContextFactory();
                var scopeMock = new Mock<IEfCoreScope<MerchelloDbContext>>();

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync<Task>(It.IsAny<Func<MerchelloDbContext, Task>>()))
                    .Returns((Func<MerchelloDbContext, Task> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<bool>>>()))
                    .Returns((Func<MerchelloDbContext, Task<bool>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<WarehouseProviderConfig?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<WarehouseProviderConfig?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<WarehouseProviderConfig>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<WarehouseProviderConfig>>> func) => func(dbContext));

                scopeMock.Setup(s => s.Complete()).Returns(true);
                scopeMock.Setup(s => s.Dispose());

                return scopeMock.Object;
            });

        return scopeProviderMock.Object;
    }

    #endregion

    public void Dispose()
    {
        _dbContext.Dispose();
        _connection.Dispose();
        GC.SuppressFinalize(this);
    }
}

using Merchello.Core.Data;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Services;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.Shipping.Services;

/// <summary>
/// Integration tests for WarehouseProviderConfigService using the shared ServiceTestFixture
/// with a real SQLite database.
/// </summary>
[Collection("Integration Tests")]
public class WarehouseProviderConfigServiceTests
{
    private readonly ServiceTestFixture _fixture;
    private readonly WarehouseProviderConfigService _service;

    public WarehouseProviderConfigServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();

        _service = new WarehouseProviderConfigService(
            _fixture.GetService<IEFCoreScopeProvider<MerchelloDbContext>>());
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
        _fixture.DbContext.ChangeTracker.Clear();
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
        _fixture.DbContext.ChangeTracker.Clear();
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
        _fixture.DbContext.ChangeTracker.Clear();
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
        _fixture.DbContext.ChangeTracker.Clear();
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
        _fixture.DbContext.ChangeTracker.Clear();
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
        _fixture.DbContext.ChangeTracker.Clear();
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
        _fixture.DbContext.ChangeTracker.Clear();
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
        _fixture.DbContext.ChangeTracker.Clear();
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
        _fixture.DbContext.ChangeTracker.Clear();
        config.ServiceMarkupsJson = """{"FEDEX_GROUND": 5, "FEDEX_2_DAY": 15}""";
        await _service.UpdateAsync(config);

        // Assert
        _fixture.DbContext.ChangeTracker.Clear();
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
        _fixture.DbContext.ChangeTracker.Clear();
        config.ExcludedServiceTypesJson = """["FIRST_OVERNIGHT", "PRIORITY_OVERNIGHT"]""";
        await _service.UpdateAsync(config);

        // Assert
        _fixture.DbContext.ChangeTracker.Clear();
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
        _fixture.DbContext.ChangeTracker.Clear();
        await _service.DeleteAsync(config.Id);

        // Assert
        _fixture.DbContext.ChangeTracker.Clear();
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
        _fixture.DbContext.ChangeTracker.Clear();
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

    #endregion
}

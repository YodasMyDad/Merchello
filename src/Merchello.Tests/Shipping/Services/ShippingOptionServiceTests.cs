using Merchello.Core.Data;
using Merchello.Core.Locality.Models;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Shipping.Dtos;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shipping.Providers.Interfaces;
using Merchello.Core.Shipping.Services;
using Merchello.Core.Warehouses.Models;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Shouldly;
using Umbraco.Cms.Core.Notifications;
using Umbraco.Cms.Core.Scoping;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.Shipping.Services;

/// <summary>
/// Unit tests for ShippingOptionService using an in-memory SQLite database.
/// Each test creates a fresh database for isolation.
/// </summary>
public class ShippingOptionServiceTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly MerchelloDbContext _dbContext;
    private readonly ShippingOptionService _service;
    private readonly Mock<IShippingProviderManager> _providerManagerMock;
    private readonly Guid _warehouseId;

    public ShippingOptionServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<MerchelloDbContext>()
            .UseSqlite(_connection)
            .Options;

        _dbContext = new MerchelloDbContext(options);
        _dbContext.Database.EnsureCreated();

        // Seed a warehouse for FK references
        _warehouseId = Guid.NewGuid();
        _dbContext.Warehouses.Add(new Warehouse
        {
            Id = _warehouseId,
            Name = "Test Warehouse",
            Address = new Address { CountryCode = "GB" }
        });
        _dbContext.SaveChanges();
        _dbContext.ChangeTracker.Clear();

        var scopeProvider = CreateMockScopeProvider(() => _dbContext);

        _providerManagerMock = new Mock<IShippingProviderManager>();
        _providerManagerMock
            .Setup(m => m.GetProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<RegisteredShippingProvider>());
        _providerManagerMock
            .Setup(m => m.GetProviderAsync(It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((RegisteredShippingProvider?)null);

        var notificationPublisherMock = new Mock<IMerchelloNotificationPublisher>();
        notificationPublisherMock
            .Setup(p => p.PublishCancelableAsync(It.IsAny<ICancelableNotification>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        notificationPublisherMock
            .Setup(p => p.PublishAsync(It.IsAny<INotification>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var loggerMock = new Mock<ILogger<ShippingOptionService>>();

        _service = new ShippingOptionService(
            scopeProvider,
            _providerManagerMock.Object,
            notificationPublisherMock.Object,
            loggerMock.Object);
    }

    #region GetAllAsync Tests

    [Fact]
    public async Task GetAllAsync_ReturnsEmptyList_WhenNoOptionsExist()
    {
        // Act
        var result = await _service.GetAllAsync();

        // Assert
        result.ShouldNotBeNull();
        result.ShouldBeEmpty();
    }

    [Fact]
    public async Task GetAllAsync_ReturnsOptions_WhenOptionsExist()
    {
        // Arrange
        await CreateShippingOptionInDb("Standard Delivery");
        await CreateShippingOptionInDb("Express Delivery");

        // Act
        var result = await _service.GetAllAsync();

        // Assert
        result.ShouldNotBeNull();
        result.Count.ShouldBe(2);
        result.ShouldContain(o => o.Name == "Standard Delivery");
        result.ShouldContain(o => o.Name == "Express Delivery");
    }

    #endregion

    #region CreateAsync Tests

    [Fact]
    public async Task CreateAsync_CreatesShippingOption_Successfully()
    {
        // Arrange
        var dto = new CreateShippingOptionDto
        {
            Name = "Standard Delivery",
            WarehouseId = _warehouseId,
            ProviderKey = "flat-rate",
            IsEnabled = true,
            FixedCost = 5.99m,
            DaysFrom = 3,
            DaysTo = 5
        };

        // Act
        var result = await _service.CreateAsync(dto);

        // Assert
        result.Successful.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.Name.ShouldBe("Standard Delivery");
        result.ResultObject.WarehouseId.ShouldBe(_warehouseId);
        result.ResultObject.ProviderKey.ShouldBe("flat-rate");
        result.ResultObject.IsEnabled.ShouldBeTrue();
        result.ResultObject.FixedCost.ShouldBe(5.99m);
        result.ResultObject.DaysFrom.ShouldBe(3);
        result.ResultObject.DaysTo.ShouldBe(5);
        result.ResultObject.Id.ShouldNotBe(Guid.Empty);
    }

    [Fact]
    public async Task CreateAsync_PersistsToDatabase()
    {
        // Arrange
        var dto = new CreateShippingOptionDto
        {
            Name = "Next Day",
            WarehouseId = _warehouseId,
            IsNextDay = true,
            DaysFrom = 1,
            DaysTo = 1
        };

        // Act
        var result = await _service.CreateAsync(dto);
        _dbContext.ChangeTracker.Clear();

        // Assert
        var persisted = await _dbContext.ShippingOptions.FindAsync(result.ResultObject!.Id);
        persisted.ShouldNotBeNull();
        persisted.Name.ShouldBe("Next Day");
        persisted.IsNextDay.ShouldBeTrue();
    }

    [Fact]
    public async Task CreateAsync_SerializesProviderSettings()
    {
        // Arrange
        var dto = new CreateShippingOptionDto
        {
            Name = "FedEx Ground",
            WarehouseId = _warehouseId,
            ProviderKey = "fedex",
            ServiceType = "FEDEX_GROUND",
            ProviderSettings = new Dictionary<string, string>
            {
                { "markupPercent", "10" },
                { "accountNumber", "123456" }
            }
        };

        // Act
        var result = await _service.CreateAsync(dto);
        _dbContext.ChangeTracker.Clear();

        // Assert
        result.Successful.ShouldBeTrue();
        var persisted = await _dbContext.ShippingOptions.FindAsync(result.ResultObject!.Id);
        persisted.ShouldNotBeNull();
        persisted.ProviderSettings.ShouldNotBeNullOrEmpty();
        persisted.ProviderSettings.ShouldContain("markupPercent");
        persisted.ProviderSettings.ShouldContain("accountNumber");
    }

    #endregion

    #region GetByIdAsync Tests

    [Fact]
    public async Task GetByIdAsync_ReturnsOption_WhenExists()
    {
        // Arrange
        var createDto = new CreateShippingOptionDto
        {
            Name = "Standard Delivery",
            WarehouseId = _warehouseId,
            FixedCost = 5.99m,
            DaysFrom = 3,
            DaysTo = 5,
            IsEnabled = true
        };
        var created = await _service.CreateAsync(createDto);
        _dbContext.ChangeTracker.Clear();

        // Act
        var result = await _service.GetByIdAsync(created.ResultObject!.Id);

        // Assert
        result.ShouldNotBeNull();
        result.Id.ShouldBe(created.ResultObject.Id);
        result.Name.ShouldBe("Standard Delivery");
        result.WarehouseId.ShouldBe(_warehouseId);
        result.WarehouseName.ShouldBe("Test Warehouse");
        result.FixedCost.ShouldBe(5.99m);
        result.DaysFrom.ShouldBe(3);
        result.DaysTo.ShouldBe(5);
        result.IsEnabled.ShouldBeTrue();
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
    public async Task GetByIdAsync_IncludesCostsAndWeightTiers()
    {
        // Arrange
        var createDto = new CreateShippingOptionDto
        {
            Name = "Full Option",
            WarehouseId = _warehouseId
        };
        var created = await _service.CreateAsync(createDto);
        var optionId = created.ResultObject!.Id;

        await _service.AddCostAsync(optionId, new CreateShippingCostDto
        {
            CountryCode = "GB",
            Cost = 5.99m
        });

        await _service.AddWeightTierAsync(optionId, new CreateShippingWeightTierDto
        {
            CountryCode = "GB",
            MinWeightKg = 0,
            MaxWeightKg = 5,
            Surcharge = 2.00m
        });

        _dbContext.ChangeTracker.Clear();

        // Act
        var result = await _service.GetByIdAsync(optionId);

        // Assert
        result.ShouldNotBeNull();
        result.Costs.Count.ShouldBe(1);
        result.Costs[0].CountryCode.ShouldBe("GB");
        result.Costs[0].Cost.ShouldBe(5.99m);
        result.WeightTiers.Count.ShouldBe(1);
        result.WeightTiers[0].CountryCode.ShouldBe("GB");
        result.WeightTiers[0].MinWeightKg.ShouldBe(0m);
        result.WeightTiers[0].MaxWeightKg.ShouldBe(5m);
        result.WeightTiers[0].Surcharge.ShouldBe(2.00m);
    }

    #endregion

    #region UpdateAsync Tests

    [Fact]
    public async Task UpdateAsync_ModifiesExistingOption()
    {
        // Arrange
        var createDto = new CreateShippingOptionDto
        {
            Name = "Original Name",
            WarehouseId = _warehouseId,
            DaysFrom = 3,
            DaysTo = 5
        };
        var created = await _service.CreateAsync(createDto);
        _dbContext.ChangeTracker.Clear();

        var updateDto = new CreateShippingOptionDto
        {
            Name = "Updated Name",
            WarehouseId = _warehouseId,
            DaysFrom = 1,
            DaysTo = 2,
            IsNextDay = true,
            FixedCost = 12.99m
        };

        // Act
        var result = await _service.UpdateAsync(created.ResultObject!.Id, updateDto);

        // Assert
        result.Successful.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.Name.ShouldBe("Updated Name");
        result.ResultObject.DaysFrom.ShouldBe(1);
        result.ResultObject.DaysTo.ShouldBe(2);
        result.ResultObject.IsNextDay.ShouldBeTrue();
        result.ResultObject.FixedCost.ShouldBe(12.99m);
    }

    [Fact]
    public async Task UpdateAsync_ReturnsError_WhenOptionNotFound()
    {
        // Arrange
        var updateDto = new CreateShippingOptionDto
        {
            Name = "Nonexistent",
            WarehouseId = _warehouseId
        };

        // Act
        var result = await _service.UpdateAsync(Guid.NewGuid(), updateDto);

        // Assert
        result.Successful.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message == "Shipping option not found");
    }

    #endregion

    #region DeleteAsync Tests

    [Fact]
    public async Task DeleteAsync_RemovesOption_WhenExists()
    {
        // Arrange
        var createDto = new CreateShippingOptionDto
        {
            Name = "To Delete",
            WarehouseId = _warehouseId
        };
        var created = await _service.CreateAsync(createDto);
        _dbContext.ChangeTracker.Clear();

        // Act
        var result = await _service.DeleteAsync(created.ResultObject!.Id);

        // Assert
        result.Successful.ShouldBeTrue();
        result.ResultObject.ShouldBeTrue();

        _dbContext.ChangeTracker.Clear();
        var persisted = await _dbContext.ShippingOptions.FindAsync(created.ResultObject.Id);
        persisted.ShouldBeNull();
    }

    [Fact]
    public async Task DeleteAsync_ReturnsError_WhenOptionNotFound()
    {
        // Act
        var result = await _service.DeleteAsync(Guid.NewGuid());

        // Assert
        result.Successful.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message == "Shipping option not found");
    }

    #endregion

    #region AddCostAsync Tests

    [Fact]
    public async Task AddCostAsync_AddsCostToOption()
    {
        // Arrange
        var option = await CreateShippingOptionViaService();
        var costDto = new CreateShippingCostDto
        {
            CountryCode = "us",
            StateOrProvinceCode = "ca",
            Cost = 9.99m
        };

        // Act
        var result = await _service.AddCostAsync(option.Id, costDto);

        // Assert
        result.Successful.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.CountryCode.ShouldBe("US");
        result.ResultObject.StateOrProvinceCode.ShouldBe("CA");
        result.ResultObject.Cost.ShouldBe(9.99m);
        result.ResultObject.ShippingOptionId.ShouldBe(option.Id);
    }

    [Fact]
    public async Task AddCostAsync_ReturnsError_WhenDuplicateExists()
    {
        // Arrange
        var option = await CreateShippingOptionViaService();
        var costDto = new CreateShippingCostDto
        {
            CountryCode = "GB",
            Cost = 5.00m
        };

        await _service.AddCostAsync(option.Id, costDto);

        // Act - try adding same country again
        var result = await _service.AddCostAsync(option.Id, costDto);

        // Assert
        result.Successful.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message == "A cost for this country/state already exists");
    }

    #endregion

    #region DeleteCostAsync Tests

    [Fact]
    public async Task DeleteCostAsync_RemovesCost()
    {
        // Arrange
        var option = await CreateShippingOptionViaService();
        var addResult = await _service.AddCostAsync(option.Id, new CreateShippingCostDto
        {
            CountryCode = "GB",
            Cost = 5.00m
        });
        _dbContext.ChangeTracker.Clear();

        // Act
        var result = await _service.DeleteCostAsync(addResult.ResultObject!.Id);

        // Assert
        result.Successful.ShouldBeTrue();
        result.ResultObject.ShouldBeTrue();

        _dbContext.ChangeTracker.Clear();
        var persisted = await _dbContext.Set<ShippingCost>().FindAsync(addResult.ResultObject.Id);
        persisted.ShouldBeNull();
    }

    [Fact]
    public async Task DeleteCostAsync_ReturnsError_WhenCostNotFound()
    {
        // Act
        var result = await _service.DeleteCostAsync(Guid.NewGuid());

        // Assert
        result.Successful.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message == "Shipping cost not found");
    }

    #endregion

    #region AddWeightTierAsync Tests

    [Fact]
    public async Task AddWeightTierAsync_AddsWeightTierToOption()
    {
        // Arrange
        var option = await CreateShippingOptionViaService();
        var tierDto = new CreateShippingWeightTierDto
        {
            CountryCode = "gb",
            MinWeightKg = 0,
            MaxWeightKg = 10,
            Surcharge = 3.50m
        };

        // Act
        var result = await _service.AddWeightTierAsync(option.Id, tierDto);

        // Assert
        result.Successful.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.CountryCode.ShouldBe("GB");
        result.ResultObject.MinWeightKg.ShouldBe(0m);
        result.ResultObject.MaxWeightKg.ShouldBe(10m);
        result.ResultObject.Surcharge.ShouldBe(3.50m);
        result.ResultObject.ShippingOptionId.ShouldBe(option.Id);
    }

    [Fact]
    public async Task AddWeightTierAsync_ReturnsError_WhenMaxWeightLessThanMin()
    {
        // Arrange
        var option = await CreateShippingOptionViaService();
        var tierDto = new CreateShippingWeightTierDto
        {
            CountryCode = "GB",
            MinWeightKg = 10,
            MaxWeightKg = 5,
            Surcharge = 2.00m
        };

        // Act
        var result = await _service.AddWeightTierAsync(option.Id, tierDto);

        // Assert
        result.Successful.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message == "Max weight must be greater than min weight");
    }

    [Fact]
    public async Task AddWeightTierAsync_AllowsNullMaxWeight()
    {
        // Arrange
        var option = await CreateShippingOptionViaService();
        var tierDto = new CreateShippingWeightTierDto
        {
            CountryCode = "GB",
            MinWeightKg = 20,
            MaxWeightKg = null,
            Surcharge = 10.00m
        };

        // Act
        var result = await _service.AddWeightTierAsync(option.Id, tierDto);

        // Assert
        result.Successful.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.MaxWeightKg.ShouldBeNull();
        result.ResultObject.MinWeightKg.ShouldBe(20m);
    }

    #endregion

    #region DeleteWeightTierAsync Tests

    [Fact]
    public async Task DeleteWeightTierAsync_RemovesWeightTier()
    {
        // Arrange
        var option = await CreateShippingOptionViaService();
        var addResult = await _service.AddWeightTierAsync(option.Id, new CreateShippingWeightTierDto
        {
            CountryCode = "GB",
            MinWeightKg = 0,
            MaxWeightKg = 5,
            Surcharge = 2.00m
        });
        _dbContext.ChangeTracker.Clear();

        // Act
        var result = await _service.DeleteWeightTierAsync(addResult.ResultObject!.Id);

        // Assert
        result.Successful.ShouldBeTrue();
        result.ResultObject.ShouldBeTrue();

        _dbContext.ChangeTracker.Clear();
        var persisted = await _dbContext.ShippingWeightTiers.FindAsync(addResult.ResultObject.Id);
        persisted.ShouldBeNull();
    }

    [Fact]
    public async Task DeleteWeightTierAsync_ReturnsError_WhenTierNotFound()
    {
        // Act
        var result = await _service.DeleteWeightTierAsync(Guid.NewGuid());

        // Assert
        result.Successful.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message == "Weight tier not found");
    }

    #endregion

    #region Helpers

    private async Task<ShippingOption> CreateShippingOptionViaService()
    {
        var dto = new CreateShippingOptionDto
        {
            Name = "Test Option",
            WarehouseId = _warehouseId,
            ProviderKey = "flat-rate",
            IsEnabled = true,
            DaysFrom = 3,
            DaysTo = 5
        };

        var result = await _service.CreateAsync(dto);
        _dbContext.ChangeTracker.Clear();
        return result.ResultObject!;
    }

    private async Task CreateShippingOptionInDb(string name)
    {
        _dbContext.ShippingOptions.Add(new ShippingOption
        {
            Name = name,
            WarehouseId = _warehouseId,
            ProviderKey = "flat-rate",
            IsEnabled = true,
            DaysFrom = 3,
            DaysTo = 5
        });
        await _dbContext.SaveChangesAsync();
        _dbContext.ChangeTracker.Clear();
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

                // Void-returning overload (used by Create, Update, Delete operations)
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync<Task>(It.IsAny<Func<MerchelloDbContext, Task>>()))
                    .Returns((Func<MerchelloDbContext, Task> func) => func(dbContext));

                // Value-returning overloads used by ShippingOptionService
                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<ShippingOptionListItemDto>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<ShippingOptionListItemDto>>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<ShippingOption?>>>()))
                    .Returns((Func<MerchelloDbContext, Task<ShippingOption?>> func) => func(dbContext));

                scopeMock
                    .Setup(s => s.ExecuteWithContextAsync(It.IsAny<Func<MerchelloDbContext, Task<List<string>>>>()))
                    .Returns((Func<MerchelloDbContext, Task<List<string>>> func) => func(dbContext));

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

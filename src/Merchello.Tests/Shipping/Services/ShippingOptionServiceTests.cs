using Merchello.Core.Data;
using Merchello.Core.Notifications.Interfaces;
using Merchello.Core.Shipping.Dtos;
using Merchello.Core.Shipping.Factories;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Shipping.Providers;
using Merchello.Core.Shipping.Providers.Interfaces;
using Merchello.Core.Shipping.Services;
using Merchello.Tests.TestInfrastructure;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Shouldly;
using Umbraco.Cms.Persistence.EFCore.Scoping;
using Xunit;

namespace Merchello.Tests.Shipping.Services;

/// <summary>
/// Integration tests for ShippingOptionService using the shared ServiceTestFixture
/// with a real SQLite database.
/// </summary>
[Collection("Integration Tests")]
public class ShippingOptionServiceTests
{
    private readonly ServiceTestFixture _fixture;
    private readonly ShippingOptionService _service;
    private readonly Mock<IShippingProviderManager> _providerManagerMock;
    private readonly Guid _warehouseId;

    public ShippingOptionServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _fixture.ResetDatabase();

        // Seed a warehouse for FK references
        var dataBuilder = _fixture.CreateDataBuilder();
        var warehouse = dataBuilder.CreateWarehouse("Test Warehouse");
        _warehouseId = warehouse.Id;
        dataBuilder.SaveChanges();
        _fixture.DbContext.ChangeTracker.Clear();

        _providerManagerMock = new Mock<IShippingProviderManager>();
        _providerManagerMock
            .Setup(m => m.GetProvidersAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<RegisteredShippingProvider>());
        _providerManagerMock
            .Setup(m => m.GetProviderAsync(It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((RegisteredShippingProvider?)null);

        _service = new ShippingOptionService(
            _fixture.GetService<IEFCoreScopeProvider<MerchelloDbContext>>(),
            _providerManagerMock.Object,
            new ShippingOptionFactory(),
            _fixture.GetService<IMerchelloNotificationPublisher>(),
            NullLogger<ShippingOptionService>.Instance);
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
        result.Success.ShouldBeTrue();
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
        _fixture.DbContext.ChangeTracker.Clear();

        // Assert
        var persisted = await _fixture.DbContext.ShippingOptions.FindAsync(result.ResultObject!.Id);
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
        _fixture.DbContext.ChangeTracker.Clear();

        // Assert
        result.Success.ShouldBeTrue();
        var persisted = await _fixture.DbContext.ShippingOptions.FindAsync(result.ResultObject!.Id);
        persisted.ShouldNotBeNull();
        persisted.ProviderSettings.ShouldNotBeNullOrEmpty();
        persisted.ProviderSettings.ShouldContain("markupPercent");
        persisted.ProviderSettings.ShouldContain("accountNumber");
    }

    [Fact]
    public async Task CreateAsync_PersistsExcludedRegions()
    {
        // Arrange
        var dto = new CreateShippingOptionDto
        {
            Name = "Domestic Only",
            WarehouseId = _warehouseId,
            ExcludedRegions =
            [
                new CreateShippingDestinationExclusionDto
                {
                    CountryCode = "us"
                },
                new CreateShippingDestinationExclusionDto
                {
                    CountryCode = "gb",
                    RegionCode = "nir"
                }
            ]
        };

        // Act
        var result = await _service.CreateAsync(dto);
        _fixture.DbContext.ChangeTracker.Clear();

        // Assert
        result.Success.ShouldBeTrue();
        var persisted = await _fixture.DbContext.ShippingOptions.FindAsync(result.ResultObject!.Id);
        persisted.ShouldNotBeNull();
        persisted.ExcludedRegions.Count.ShouldBe(2);
        persisted.ExcludedRegions.ShouldContain(x => x.CountryCode == "US" && x.RegionCode == null);
        persisted.ExcludedRegions.ShouldContain(x => x.CountryCode == "GB" && x.RegionCode == "NIR");
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
        _fixture.DbContext.ChangeTracker.Clear();

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

        _fixture.DbContext.ChangeTracker.Clear();

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

    [Fact]
    public async Task GetByIdAsync_IncludesExcludedRegions()
    {
        // Arrange
        var createDto = new CreateShippingOptionDto
        {
            Name = "Domestic",
            WarehouseId = _warehouseId,
            ExcludedRegions =
            [
                new CreateShippingDestinationExclusionDto
                {
                    CountryCode = "US"
                }
            ]
        };

        var created = await _service.CreateAsync(createDto);
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _service.GetByIdAsync(created.ResultObject!.Id);

        // Assert
        result.ShouldNotBeNull();
        result.ExclusionCount.ShouldBe(1);
        result.ExcludedRegions.Count.ShouldBe(1);
        result.ExcludedRegions[0].CountryCode.ShouldBe("US");
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
        _fixture.DbContext.ChangeTracker.Clear();

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
        result.Success.ShouldBeTrue();
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
        result.Success.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message == "Shipping option not found");
    }

    [Fact]
    public async Task UpdateAsync_PreservesExcludedRegions_WhenExcludedRegionsNotProvided()
    {
        // Arrange
        var createDto = new CreateShippingOptionDto
        {
            Name = "Original",
            WarehouseId = _warehouseId,
            ExcludedRegions =
            [
                new CreateShippingDestinationExclusionDto
                {
                    CountryCode = "US"
                }
            ]
        };
        var created = await _service.CreateAsync(createDto);
        _fixture.DbContext.ChangeTracker.Clear();

        var updateDto = new CreateShippingOptionDto
        {
            Name = "Updated",
            WarehouseId = _warehouseId
            // ExcludedRegions intentionally null to test backward compatibility
        };

        // Act
        var result = await _service.UpdateAsync(created.ResultObject!.Id, updateDto);
        _fixture.DbContext.ChangeTracker.Clear();

        // Assert
        result.Success.ShouldBeTrue();
        var persisted = await _fixture.DbContext.ShippingOptions.FindAsync(created.ResultObject!.Id);
        persisted.ShouldNotBeNull();
        persisted.ExcludedRegions.Count.ShouldBe(1);
        persisted.ExcludedRegions[0].CountryCode.ShouldBe("US");
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
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _service.DeleteAsync(created.ResultObject!.Id);

        // Assert
        result.Success.ShouldBeTrue();
        result.ResultObject.ShouldBeTrue();

        _fixture.DbContext.ChangeTracker.Clear();
        var persisted = await _fixture.DbContext.ShippingOptions.FindAsync(created.ResultObject.Id);
        persisted.ShouldBeNull();
    }

    [Fact]
    public async Task DeleteAsync_ReturnsError_WhenOptionNotFound()
    {
        // Act
        var result = await _service.DeleteAsync(Guid.NewGuid());

        // Assert
        result.Success.ShouldBeFalse();
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
            RegionCode = "ca",
            Cost = 9.99m
        };

        // Act
        var result = await _service.AddCostAsync(option.Id, costDto);

        // Assert
        result.Success.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.CountryCode.ShouldBe("US");
        result.ResultObject.RegionCode.ShouldBe("CA");
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
        result.Success.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message == "A cost for this country/state already exists");
    }

    #endregion

    #region UpdateCostAsync Tests

    [Fact]
    public async Task UpdateCostAsync_PersistsChangesToSerializedList()
    {
        // Arrange
        var option = await CreateShippingOptionViaService();
        var addResult = await _service.AddCostAsync(option.Id, new CreateShippingCostDto
        {
            CountryCode = "GB",
            Cost = 5.00m
        });
        _fixture.DbContext.ChangeTracker.Clear();

        var updateDto = new CreateShippingCostDto
        {
            CountryCode = "us",
            RegionCode = "ny",
            Cost = 7.25m
        };

        // Act
        var result = await _service.UpdateCostAsync(addResult.ResultObject!.Id, updateDto);

        // Assert
        result.Success.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.CountryCode.ShouldBe("US");
        result.ResultObject.RegionCode.ShouldBe("NY");
        result.ResultObject.Cost.ShouldBe(7.25m);

        _fixture.DbContext.ChangeTracker.Clear();
        var persistedOption = await _fixture.DbContext.ShippingOptions.FindAsync(option.Id);
        persistedOption.ShouldNotBeNull();
        var persistedCost = persistedOption!.ShippingCosts.First(c => c.Id == addResult.ResultObject.Id);
        persistedCost.CountryCode.ShouldBe("US");
        persistedCost.RegionCode.ShouldBe("NY");
        persistedCost.Cost.ShouldBe(7.25m);
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
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _service.DeleteCostAsync(addResult.ResultObject!.Id);

        // Assert
        result.Success.ShouldBeTrue();
        result.ResultObject.ShouldBeTrue();

        _fixture.DbContext.ChangeTracker.Clear();
        var persistedOption = await _fixture.DbContext.ShippingOptions.FindAsync(option.Id);
        persistedOption.ShouldNotBeNull();
        persistedOption!.ShippingCosts.Any(c => c.Id == addResult.ResultObject.Id).ShouldBeFalse();
    }

    [Fact]
    public async Task DeleteCostAsync_ReturnsError_WhenCostNotFound()
    {
        // Act
        var result = await _service.DeleteCostAsync(Guid.NewGuid());

        // Assert
        result.Success.ShouldBeFalse();
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
        result.Success.ShouldBeTrue();
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
        result.Success.ShouldBeFalse();
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
        result.Success.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.MaxWeightKg.ShouldBeNull();
        result.ResultObject.MinWeightKg.ShouldBe(20m);
    }

    #endregion

    #region UpdateWeightTierAsync Tests

    [Fact]
    public async Task UpdateWeightTierAsync_PersistsChangesToSerializedList()
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
        _fixture.DbContext.ChangeTracker.Clear();

        var updateDto = new CreateShippingWeightTierDto
        {
            CountryCode = "us",
            RegionCode = "ca",
            MinWeightKg = 1,
            MaxWeightKg = 10,
            Surcharge = 3.50m
        };

        // Act
        var result = await _service.UpdateWeightTierAsync(addResult.ResultObject!.Id, updateDto);

        // Assert
        result.Success.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.CountryCode.ShouldBe("US");
        result.ResultObject.RegionCode.ShouldBe("CA");
        result.ResultObject.MinWeightKg.ShouldBe(1m);
        result.ResultObject.MaxWeightKg.ShouldBe(10m);
        result.ResultObject.Surcharge.ShouldBe(3.50m);

        _fixture.DbContext.ChangeTracker.Clear();
        var persistedOption = await _fixture.DbContext.ShippingOptions.FindAsync(option.Id);
        persistedOption.ShouldNotBeNull();
        var persistedTier = persistedOption!.WeightTiers.First(t => t.Id == addResult.ResultObject.Id);
        persistedTier.CountryCode.ShouldBe("US");
        persistedTier.RegionCode.ShouldBe("CA");
        persistedTier.MinWeightKg.ShouldBe(1m);
        persistedTier.MaxWeightKg.ShouldBe(10m);
        persistedTier.Surcharge.ShouldBe(3.50m);
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
        _fixture.DbContext.ChangeTracker.Clear();

        // Act
        var result = await _service.DeleteWeightTierAsync(addResult.ResultObject!.Id);

        // Assert
        result.Success.ShouldBeTrue();
        result.ResultObject.ShouldBeTrue();

        _fixture.DbContext.ChangeTracker.Clear();
        var persistedOption = await _fixture.DbContext.ShippingOptions.FindAsync(option.Id);
        persistedOption.ShouldNotBeNull();
        persistedOption!.WeightTiers.Any(t => t.Id == addResult.ResultObject.Id).ShouldBeFalse();
    }

    [Fact]
    public async Task DeleteWeightTierAsync_ReturnsError_WhenTierNotFound()
    {
        // Act
        var result = await _service.DeleteWeightTierAsync(Guid.NewGuid());

        // Assert
        result.Success.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message == "Weight tier not found");
    }

    #endregion

    #region PostcodeRuleAsync Tests

    [Fact]
    public async Task UpdatePostcodeRuleAsync_PersistsChangesToSerializedList()
    {
        // Arrange
        var option = await CreateShippingOptionViaService();
        var addResult = await _service.AddPostcodeRuleAsync(option.Id, new CreateShippingPostcodeRuleDto
        {
            CountryCode = "GB",
            Pattern = "SW",
            MatchType = "Prefix",
            Action = "Block",
            Surcharge = 0m,
            Description = "Block SW postcodes"
        });
        _fixture.DbContext.ChangeTracker.Clear();

        var updateDto = new CreateShippingPostcodeRuleDto
        {
            CountryCode = "us",
            Pattern = "90210",
            MatchType = "Exact",
            Action = "Surcharge",
            Surcharge = 4.50m,
            Description = "Surcharge premium zone"
        };

        // Act
        var result = await _service.UpdatePostcodeRuleAsync(addResult.ResultObject!.Id, updateDto);

        // Assert
        result.Success.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.CountryCode.ShouldBe("US");
        result.ResultObject.Pattern.ShouldBe("90210");
        result.ResultObject.MatchType.ShouldBe("Exact");
        result.ResultObject.Action.ShouldBe("Surcharge");
        result.ResultObject.Surcharge.ShouldBe(4.50m);
        result.ResultObject.Description.ShouldBe("Surcharge premium zone");

        _fixture.DbContext.ChangeTracker.Clear();
        var persistedOption = await _fixture.DbContext.ShippingOptions.FindAsync(option.Id);
        persistedOption.ShouldNotBeNull();
        var persistedRule = persistedOption!.PostcodeRules.First(r => r.Id == addResult.ResultObject.Id);
        persistedRule.CountryCode.ShouldBe("US");
        persistedRule.Pattern.ShouldBe("90210");
        persistedRule.MatchType.ShouldBe(PostcodeMatchType.Exact);
        persistedRule.Action.ShouldBe(PostcodeRuleAction.Surcharge);
        persistedRule.Surcharge.ShouldBe(4.50m);
        persistedRule.Description.ShouldBe("Surcharge premium zone");
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
        _fixture.DbContext.ChangeTracker.Clear();
        return result.ResultObject!;
    }

    private async Task CreateShippingOptionInDb(string name)
    {
        _fixture.DbContext.ShippingOptions.Add(new ShippingOption
        {
            Name = name,
            WarehouseId = _warehouseId,
            ProviderKey = "flat-rate",
            IsEnabled = true,
            DaysFrom = 3,
            DaysTo = 5
        });
        await _fixture.DbContext.SaveChangesAsync();
        _fixture.DbContext.ChangeTracker.Clear();
    }

    #endregion
}

using Merchello.Core.Accounting.Dtos;
using Merchello.Core.Accounting.Models;
using Merchello.Core.Accounting.Services.Interfaces;
using Merchello.Tests.TestInfrastructure;
using Shouldly;
using Xunit;

namespace Merchello.Tests.Tax.Services;

/// <summary>
/// Integration tests for shipping tax override functionality in TaxService.
/// Tests CRUD operations, geographic lookup priority, and database interactions.
/// </summary>
[Collection("Integration")]
public class ShippingTaxOverrideServiceTests : IClassFixture<ServiceTestFixture>
{
    private readonly ServiceTestFixture _fixture;
    private readonly ITaxService _taxService;

    public ShippingTaxOverrideServiceTests(ServiceTestFixture fixture)
    {
        _fixture = fixture;
        _taxService = fixture.GetService<ITaxService>();
        fixture.ResetDatabase();
    }

    #region Create Tests

    [Fact]
    public async Task CreateShippingTaxOverrideAsync_WithValidData_CreatesOverride()
    {
        // Arrange
        var dto = new CreateShippingTaxOverrideDto
        {
            CountryCode = "US",
            StateOrProvinceCode = "CA",
            ShippingTaxGroupId = null // No shipping tax in California
        };

        // Act
        var result = await _taxService.CreateShippingTaxOverrideAsync(dto);

        // Assert
        result.Successful.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.CountryCode.ShouldBe("US");
        result.ResultObject.StateOrProvinceCode.ShouldBe("CA");
        result.ResultObject.ShippingTaxGroupId.ShouldBeNull();
        result.ResultObject.Id.ShouldNotBe(Guid.Empty);
    }

    [Fact]
    public async Task CreateShippingTaxOverrideAsync_WithTaxGroup_CreatesOverrideWithTaxGroup()
    {
        // Arrange - Create a tax group first
        var taxGroupResult = await _taxService.CreateTaxGroup("Shipping Tax", 8.25m);
        taxGroupResult.Successful.ShouldBeTrue();
        var taxGroupId = taxGroupResult.ResultObject!.Id;

        var dto = new CreateShippingTaxOverrideDto
        {
            CountryCode = "US",
            StateOrProvinceCode = "TX",
            ShippingTaxGroupId = taxGroupId
        };

        // Act
        var result = await _taxService.CreateShippingTaxOverrideAsync(dto);

        // Assert
        result.Successful.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.ShippingTaxGroupId.ShouldBe(taxGroupId);
    }

    [Fact]
    public async Task CreateShippingTaxOverrideAsync_CountryLevelOverride_CreatesWithNullState()
    {
        // Arrange
        var dto = new CreateShippingTaxOverrideDto
        {
            CountryCode = "GB",
            StateOrProvinceCode = null, // Country-wide override
            ShippingTaxGroupId = null
        };

        // Act
        var result = await _taxService.CreateShippingTaxOverrideAsync(dto);

        // Assert
        result.Successful.ShouldBeTrue();
        result.ResultObject.ShouldNotBeNull();
        result.ResultObject.CountryCode.ShouldBe("GB");
        result.ResultObject.StateOrProvinceCode.ShouldBeNull();
    }

    [Fact]
    public async Task CreateShippingTaxOverrideAsync_DuplicateLocation_FailsWithError()
    {
        // Arrange - Create first override
        var dto1 = new CreateShippingTaxOverrideDto
        {
            CountryCode = "US",
            StateOrProvinceCode = "NY",
            ShippingTaxGroupId = null
        };
        var result1 = await _taxService.CreateShippingTaxOverrideAsync(dto1);
        result1.Successful.ShouldBeTrue();

        // Try to create duplicate
        var dto2 = new CreateShippingTaxOverrideDto
        {
            CountryCode = "US",
            StateOrProvinceCode = "NY",
            ShippingTaxGroupId = null
        };

        // Act
        var result2 = await _taxService.CreateShippingTaxOverrideAsync(dto2);

        // Assert
        result2.Successful.ShouldBeFalse();
        result2.Messages.ShouldContain(m => m.Message!.Contains("already exists", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task CreateShippingTaxOverrideAsync_EmptyCountryCode_FailsWithError()
    {
        // Arrange
        var dto = new CreateShippingTaxOverrideDto
        {
            CountryCode = "",
            StateOrProvinceCode = "CA",
            ShippingTaxGroupId = null
        };

        // Act
        var result = await _taxService.CreateShippingTaxOverrideAsync(dto);

        // Assert
        result.Successful.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message!.Contains("Country", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task CreateShippingTaxOverrideAsync_NormalizesEmptyStateToNull()
    {
        // Arrange - Empty string should be treated as null (country-wide)
        var dto = new CreateShippingTaxOverrideDto
        {
            CountryCode = "DE",
            StateOrProvinceCode = "   ", // Whitespace should be normalized to null
            ShippingTaxGroupId = null
        };

        // Act
        var result = await _taxService.CreateShippingTaxOverrideAsync(dto);

        // Assert
        result.Successful.ShouldBeTrue();
        result.ResultObject!.StateOrProvinceCode.ShouldBeNull();
    }

    #endregion

    #region Read Tests

    [Fact]
    public async Task GetShippingTaxOverrideByIdAsync_ExistingOverride_ReturnsOverride()
    {
        // Arrange
        var createResult = await _taxService.CreateShippingTaxOverrideAsync(new CreateShippingTaxOverrideDto
        {
            CountryCode = "FR",
            StateOrProvinceCode = null,
            ShippingTaxGroupId = null
        });
        createResult.Successful.ShouldBeTrue();
        var id = createResult.ResultObject!.Id;

        // Act
        var result = await _taxService.GetShippingTaxOverrideByIdAsync(id);

        // Assert
        result.ShouldNotBeNull();
        result.Id.ShouldBe(id);
        result.CountryCode.ShouldBe("FR");
    }

    [Fact]
    public async Task GetShippingTaxOverrideByIdAsync_NonExistentId_ReturnsNull()
    {
        // Act
        var result = await _taxService.GetShippingTaxOverrideByIdAsync(Guid.NewGuid());

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public async Task GetAllShippingTaxOverridesAsync_MultipleOverrides_ReturnsAllOrderedByLocation()
    {
        // Arrange - Create overrides in different locations
        await _taxService.CreateShippingTaxOverrideAsync(new CreateShippingTaxOverrideDto
        {
            CountryCode = "US",
            StateOrProvinceCode = "WA"
        });
        await _taxService.CreateShippingTaxOverrideAsync(new CreateShippingTaxOverrideDto
        {
            CountryCode = "US",
            StateOrProvinceCode = "AL"
        });
        await _taxService.CreateShippingTaxOverrideAsync(new CreateShippingTaxOverrideDto
        {
            CountryCode = "CA",
            StateOrProvinceCode = "ON"
        });

        // Act
        var result = await _taxService.GetAllShippingTaxOverridesAsync();

        // Assert
        result.Count.ShouldBe(3);
        // Should be ordered by country, then state
        result[0].CountryCode.ShouldBe("CA");
        result[1].CountryCode.ShouldBe("US");
        result[1].StateOrProvinceCode.ShouldBe("AL");
        result[2].CountryCode.ShouldBe("US");
        result[2].StateOrProvinceCode.ShouldBe("WA");
    }

    [Fact]
    public async Task GetAllShippingTaxOverridesAsync_Empty_ReturnsEmptyList()
    {
        // Act
        var result = await _taxService.GetAllShippingTaxOverridesAsync();

        // Assert
        result.ShouldNotBeNull();
        result.ShouldBeEmpty();
    }

    #endregion

    #region Geographic Lookup Tests

    [Fact]
    public async Task GetShippingTaxOverrideAsync_StateSpecificOverride_ReturnsStateOverride()
    {
        // Arrange
        await _taxService.CreateShippingTaxOverrideAsync(new CreateShippingTaxOverrideDto
        {
            CountryCode = "US",
            StateOrProvinceCode = "CA",
            ShippingTaxGroupId = null
        });

        // Act
        var result = await _taxService.GetShippingTaxOverrideAsync("US", "CA");

        // Assert
        result.ShouldNotBeNull();
        result.CountryCode.ShouldBe("US");
        result.StateOrProvinceCode.ShouldBe("CA");
    }

    [Fact]
    public async Task GetShippingTaxOverrideAsync_CountryFallback_ReturnsCountryOverrideWhenNoState()
    {
        // Arrange - Only country-level override exists
        await _taxService.CreateShippingTaxOverrideAsync(new CreateShippingTaxOverrideDto
        {
            CountryCode = "GB",
            StateOrProvinceCode = null, // Country-wide
            ShippingTaxGroupId = null
        });

        // Act - Query with a state that doesn't have its own override
        var result = await _taxService.GetShippingTaxOverrideAsync("GB", "ENG");

        // Assert - Should fall back to country-level override
        result.ShouldNotBeNull();
        result.CountryCode.ShouldBe("GB");
        result.StateOrProvinceCode.ShouldBeNull();
    }

    [Fact]
    public async Task GetShippingTaxOverrideAsync_StateTakesPrecedenceOverCountry()
    {
        // Arrange - Create both country and state overrides
        var countryTaxGroup = await _taxService.CreateTaxGroup("Country Rate", 20m);
        var stateTaxGroup = await _taxService.CreateTaxGroup("State Rate", 5m);

        await _taxService.CreateShippingTaxOverrideAsync(new CreateShippingTaxOverrideDto
        {
            CountryCode = "US",
            StateOrProvinceCode = null, // Country-wide
            ShippingTaxGroupId = countryTaxGroup.ResultObject!.Id
        });
        await _taxService.CreateShippingTaxOverrideAsync(new CreateShippingTaxOverrideDto
        {
            CountryCode = "US",
            StateOrProvinceCode = "TX",
            ShippingTaxGroupId = stateTaxGroup.ResultObject!.Id
        });

        // Act
        var result = await _taxService.GetShippingTaxOverrideAsync("US", "TX");

        // Assert - State override should take precedence
        result.ShouldNotBeNull();
        result.StateOrProvinceCode.ShouldBe("TX");
        result.ShippingTaxGroupId.ShouldBe(stateTaxGroup.ResultObject!.Id);
    }

    [Fact]
    public async Task GetShippingTaxOverrideAsync_NoOverrideExists_ReturnsNull()
    {
        // Act
        var result = await _taxService.GetShippingTaxOverrideAsync("XX", "YY");

        // Assert
        result.ShouldBeNull();
    }

    [Fact]
    public async Task GetShippingTaxOverrideAsync_NullStateParameter_QueriesCountryLevel()
    {
        // Arrange
        await _taxService.CreateShippingTaxOverrideAsync(new CreateShippingTaxOverrideDto
        {
            CountryCode = "DE",
            StateOrProvinceCode = null,
            ShippingTaxGroupId = null
        });

        // Act
        var result = await _taxService.GetShippingTaxOverrideAsync("DE", null);

        // Assert
        result.ShouldNotBeNull();
        result.CountryCode.ShouldBe("DE");
    }

    [Fact]
    public async Task GetShippingTaxOverrideAsync_EmptyCountryCode_ReturnsNull()
    {
        // Act
        var result = await _taxService.GetShippingTaxOverrideAsync("", "CA");

        // Assert
        result.ShouldBeNull();
    }

    #endregion

    #region Update Tests

    [Fact]
    public async Task UpdateShippingTaxOverrideAsync_ChangeTaxGroup_UpdatesSuccessfully()
    {
        // Arrange
        var createResult = await _taxService.CreateShippingTaxOverrideAsync(new CreateShippingTaxOverrideDto
        {
            CountryCode = "US",
            StateOrProvinceCode = "FL",
            ShippingTaxGroupId = null
        });
        createResult.Successful.ShouldBeTrue();
        var id = createResult.ResultObject!.Id;

        var taxGroupResult = await _taxService.CreateTaxGroup("Florida Shipping Tax", 6m);
        var newTaxGroupId = taxGroupResult.ResultObject!.Id;

        // Act
        var updateResult = await _taxService.UpdateShippingTaxOverrideAsync(id, new UpdateShippingTaxOverrideDto
        {
            ShippingTaxGroupId = newTaxGroupId
        });

        // Assert
        updateResult.Successful.ShouldBeTrue();
        updateResult.ResultObject!.ShippingTaxGroupId.ShouldBe(newTaxGroupId);

        // Verify persisted
        var fetched = await _taxService.GetShippingTaxOverrideByIdAsync(id);
        fetched!.ShippingTaxGroupId.ShouldBe(newTaxGroupId);
    }

    [Fact]
    public async Task UpdateShippingTaxOverrideAsync_SetTaxGroupToNull_UpdatesSuccessfully()
    {
        // Arrange
        var taxGroupResult = await _taxService.CreateTaxGroup("Initial Tax", 5m);
        var createResult = await _taxService.CreateShippingTaxOverrideAsync(new CreateShippingTaxOverrideDto
        {
            CountryCode = "US",
            StateOrProvinceCode = "GA",
            ShippingTaxGroupId = taxGroupResult.ResultObject!.Id
        });
        createResult.Successful.ShouldBeTrue();
        var id = createResult.ResultObject!.Id;

        // Act - Set to null (no shipping tax)
        var updateResult = await _taxService.UpdateShippingTaxOverrideAsync(id, new UpdateShippingTaxOverrideDto
        {
            ShippingTaxGroupId = null
        });

        // Assert
        updateResult.Successful.ShouldBeTrue();
        updateResult.ResultObject!.ShippingTaxGroupId.ShouldBeNull();
    }

    [Fact]
    public async Task UpdateShippingTaxOverrideAsync_NonExistentId_ReturnsError()
    {
        // Act
        var result = await _taxService.UpdateShippingTaxOverrideAsync(Guid.NewGuid(), new UpdateShippingTaxOverrideDto
        {
            ShippingTaxGroupId = null
        });

        // Assert
        result.Successful.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message!.Contains("not found", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task UpdateShippingTaxOverrideAsync_UpdatesDateUpdated()
    {
        // Arrange
        var createResult = await _taxService.CreateShippingTaxOverrideAsync(new CreateShippingTaxOverrideDto
        {
            CountryCode = "US",
            StateOrProvinceCode = "NC"
        });
        var originalDateUpdated = createResult.ResultObject!.DateUpdated;
        var id = createResult.ResultObject!.Id;

        // Wait a bit to ensure timestamp difference
        await Task.Delay(50);

        // Act
        var updateResult = await _taxService.UpdateShippingTaxOverrideAsync(id, new UpdateShippingTaxOverrideDto
        {
            ShippingTaxGroupId = null
        });

        // Assert
        updateResult.ResultObject!.DateUpdated.ShouldBeGreaterThan(originalDateUpdated);
    }

    #endregion

    #region Delete Tests

    [Fact]
    public async Task DeleteShippingTaxOverrideAsync_ExistingOverride_DeletesSuccessfully()
    {
        // Arrange
        var createResult = await _taxService.CreateShippingTaxOverrideAsync(new CreateShippingTaxOverrideDto
        {
            CountryCode = "US",
            StateOrProvinceCode = "SC"
        });
        var id = createResult.ResultObject!.Id;

        // Act
        var deleteResult = await _taxService.DeleteShippingTaxOverrideAsync(id);

        // Assert
        deleteResult.Successful.ShouldBeTrue();

        // Verify deleted
        var fetched = await _taxService.GetShippingTaxOverrideByIdAsync(id);
        fetched.ShouldBeNull();
    }

    [Fact]
    public async Task DeleteShippingTaxOverrideAsync_NonExistentId_ReturnsError()
    {
        // Act
        var result = await _taxService.DeleteShippingTaxOverrideAsync(Guid.NewGuid());

        // Assert
        result.Successful.ShouldBeFalse();
        result.Messages.ShouldContain(m => m.Message!.Contains("not found", StringComparison.OrdinalIgnoreCase));
    }

    #endregion

    #region Tax Group Relationship Tests

    [Fact]
    public async Task GetShippingTaxOverrideAsync_IncludesRelatedTaxGroup()
    {
        // Arrange
        var taxGroupResult = await _taxService.CreateTaxGroup("Standard Shipping", 7.5m);
        var taxGroupId = taxGroupResult.ResultObject!.Id;

        await _taxService.CreateShippingTaxOverrideAsync(new CreateShippingTaxOverrideDto
        {
            CountryCode = "US",
            StateOrProvinceCode = "PA",
            ShippingTaxGroupId = taxGroupId
        });

        // Act
        var result = await _taxService.GetShippingTaxOverrideAsync("US", "PA");

        // Assert
        result.ShouldNotBeNull();
        result.ShippingTaxGroup.ShouldNotBeNull();
        result.ShippingTaxGroup.Name.ShouldBe("Standard Shipping");
        result.ShippingTaxGroup.TaxPercentage.ShouldBe(7.5m);
    }

    [Fact]
    public async Task GetAllShippingTaxOverridesAsync_IncludesRelatedTaxGroups()
    {
        // Arrange
        var taxGroupResult = await _taxService.CreateTaxGroup("Test Tax", 10m);
        await _taxService.CreateShippingTaxOverrideAsync(new CreateShippingTaxOverrideDto
        {
            CountryCode = "US",
            StateOrProvinceCode = "OH",
            ShippingTaxGroupId = taxGroupResult.ResultObject!.Id
        });
        await _taxService.CreateShippingTaxOverrideAsync(new CreateShippingTaxOverrideDto
        {
            CountryCode = "US",
            StateOrProvinceCode = "MI",
            ShippingTaxGroupId = null // No tax group
        });

        // Act
        var result = await _taxService.GetAllShippingTaxOverridesAsync();

        // Assert
        result.Count.ShouldBe(2);
        var withTaxGroup = result.First(r => r.StateOrProvinceCode == "OH");
        var withoutTaxGroup = result.First(r => r.StateOrProvinceCode == "MI");

        withTaxGroup.ShippingTaxGroup.ShouldNotBeNull();
        withoutTaxGroup.ShippingTaxGroup.ShouldBeNull();
    }

    #endregion
}

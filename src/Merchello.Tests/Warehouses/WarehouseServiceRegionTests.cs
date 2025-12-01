using Merchello.Core.Locality.Models;
using Merchello.Core.Warehouses.Models;

namespace Merchello.Tests.Warehouses;

public class WarehouseServiceRegionTests
{
    [Fact]
    public void CanServeRegion_WithCountryIncludeAndStateExclude_ShouldAllowOtherStates()
    {
        // Arrange
        var warehouse = new Warehouse
        {
            Name = "UK Warehouse",
            Address = new Address { CountryCode = "GB" },
            ServiceRegions =
            [
                new WarehouseServiceRegion
                {
                    CountryCode = "GB",
                    StateOrProvinceCode = null,
                    IsExcluded = false  // Serve all of GB
                },
                new WarehouseServiceRegion
                {
                    CountryCode = "GB",
                    StateOrProvinceCode = "NIR",
                    IsExcluded = true   // Except Northern Ireland
                }
            ]
        };

        // Act & Assert - General GB without specific region should work
        warehouse.CanServeRegion("GB", null).ShouldBeTrue();

        // England should work
        warehouse.CanServeRegion("GB", "ENG").ShouldBeTrue();

        // Scotland should work
        warehouse.CanServeRegion("GB", "SCT").ShouldBeTrue();

        // Wales should work
        warehouse.CanServeRegion("GB", "WLS").ShouldBeTrue();

        // Northern Ireland should be excluded
        warehouse.CanServeRegion("GB", "NIR").ShouldBeFalse();
    }

    [Fact]
    public void CanServeRegion_WithUSIncludeAndHawaiiExclude_ShouldAllowOtherStates()
    {
        // Arrange
        var warehouse = new Warehouse
        {
            Name = "US Warehouse",
            Address = new Address { CountryCode = "US" },
            ServiceRegions =
            [
                new WarehouseServiceRegion
                {
                    CountryCode = "US",
                    StateOrProvinceCode = null,
                    IsExcluded = false  // Serve all of US
                },
                new WarehouseServiceRegion
                {
                    CountryCode = "US",
                    StateOrProvinceCode = "HI",
                    IsExcluded = true   // Except Hawaii
                }
            ]
        };

        // Act & Assert
        warehouse.CanServeRegion("US", null).ShouldBeTrue();
        warehouse.CanServeRegion("US", "CA").ShouldBeTrue();
        warehouse.CanServeRegion("US", "NY").ShouldBeTrue();
        warehouse.CanServeRegion("US", "HI").ShouldBeFalse();  // Excluded
    }

    [Fact]
    public void CanServeRegion_WithOnlyStateSpecificInclude_ShouldOnlyAllowThatState()
    {
        // Arrange
        var warehouse = new Warehouse
        {
            Name = "Quebec Only Warehouse",
            Address = new Address { CountryCode = "CA" },
            ServiceRegions =
            [
                new WarehouseServiceRegion
                {
                    CountryCode = "CA",
                    StateOrProvinceCode = "QC",
                    IsExcluded = false  // Only serve Quebec
                }
            ]
        };

        // Act & Assert
        warehouse.CanServeRegion("CA", null).ShouldBeFalse();  // No general CA rule
        warehouse.CanServeRegion("CA", "QC").ShouldBeTrue();   // Quebec allowed
        warehouse.CanServeRegion("CA", "ON").ShouldBeFalse();  // Ontario not allowed
    }

    [Fact]
    public void CanServeRegion_WithNoServiceRegions_ShouldAllowAll()
    {
        // Arrange
        var warehouse = new Warehouse
        {
            Name = "Unrestricted Warehouse",
            Address = new Address { CountryCode = "US" },
            ServiceRegions = []
        };

        // Act & Assert
        warehouse.CanServeRegion("GB", null).ShouldBeTrue();
        warehouse.CanServeRegion("US", "CA").ShouldBeTrue();
        warehouse.CanServeRegion("FR", null).ShouldBeTrue();
    }

    [Fact]
    public void CanServeRegion_WithWildcardInclude_ShouldAllowAll()
    {
        // Arrange
        var warehouse = new Warehouse
        {
            Name = "Global Warehouse",
            Address = new Address { CountryCode = "US" },
            ServiceRegions =
            [
                new WarehouseServiceRegion
                {
                    CountryCode = "*",
                    StateOrProvinceCode = null,
                    IsExcluded = false
                }
            ]
        };

        // Act & Assert
        warehouse.CanServeRegion("GB", null).ShouldBeTrue();
        warehouse.CanServeRegion("US", "CA").ShouldBeTrue();
        warehouse.CanServeRegion("FR", null).ShouldBeTrue();
    }

    [Fact]
    public void CanServeRegion_WithMultipleCountries_ShouldRespectEachRule()
    {
        // Arrange
        var warehouse = new Warehouse
        {
            Name = "Multi-Country Warehouse",
            Address = new Address { CountryCode = "GB" },
            ServiceRegions =
            [
                new WarehouseServiceRegion
                {
                    CountryCode = "GB",
                    StateOrProvinceCode = null,
                    IsExcluded = false
                },
                new WarehouseServiceRegion
                {
                    CountryCode = "FR",
                    StateOrProvinceCode = null,
                    IsExcluded = false
                },
                new WarehouseServiceRegion
                {
                    CountryCode = "DE",
                    StateOrProvinceCode = null,
                    IsExcluded = false
                }
            ]
        };

        // Act & Assert
        warehouse.CanServeRegion("GB", null).ShouldBeTrue();
        warehouse.CanServeRegion("FR", null).ShouldBeTrue();
        warehouse.CanServeRegion("DE", null).ShouldBeTrue();
        warehouse.CanServeRegion("US", null).ShouldBeFalse();  // Not in list
    }

    [Fact]
    public void CanServeRegion_CaseInsensitiveCountryAndStateCodes_ShouldWork()
    {
        // Arrange
        var warehouse = new Warehouse
        {
            Name = "UK Warehouse",
            Address = new Address { CountryCode = "GB" },
            ServiceRegions =
            [
                new WarehouseServiceRegion
                {
                    CountryCode = "GB",
                    StateOrProvinceCode = null,
                    IsExcluded = false
                },
                new WarehouseServiceRegion
                {
                    CountryCode = "GB",
                    StateOrProvinceCode = "NIR",
                    IsExcluded = true
                }
            ]
        };

        // Act & Assert - Different case variations should work
        warehouse.CanServeRegion("gb", null).ShouldBeTrue();
        warehouse.CanServeRegion("Gb", "eng").ShouldBeTrue();
        warehouse.CanServeRegion("GB", "nir").ShouldBeFalse();
        warehouse.CanServeRegion("gb", "Nir").ShouldBeFalse();
    }
}

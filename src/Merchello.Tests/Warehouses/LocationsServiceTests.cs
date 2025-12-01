using Merchello.Core.Data;
using Merchello.Core.Locality.Models;
using Merchello.Core.Locality.Services.Interfaces;
using Merchello.Core.Warehouses.Models;
using Merchello.Core.Warehouses.Services;
using Moq;

namespace Merchello.Tests.Warehouses;

public class LocationsServiceTests
{
    private readonly IMerchDbContext _context;
    private readonly Mock<ILocalityCatalog> _catalogMock;
    private readonly LocationsService _service;

    public LocationsServiceTests()
    {
        var fixture = new ServiceTestFixture();
        _context = fixture.DbContext;

        _catalogMock = new Mock<ILocalityCatalog>();

        // Setup mock catalog to return countries
        _catalogMock.Setup(c => c.GetCountriesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new CountryInfo("GB", "United Kingdom"),
                new CountryInfo("US", "United States"),
                new CountryInfo("CA", "Canada"),
                new CountryInfo("FR", "France"),
                new CountryInfo("DE", "Germany")
            });

        // Setup mock catalog to return GB regions
        _catalogMock.Setup(c => c.GetRegionsAsync("GB", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new SubdivisionInfo("GB", "ENG", "England"),
                new SubdivisionInfo("GB", "SCT", "Scotland"),
                new SubdivisionInfo("GB", "WLS", "Wales"),
                new SubdivisionInfo("GB", "NIR", "Northern Ireland")
            });

        // Setup mock catalog to return US states
        _catalogMock.Setup(c => c.GetRegionsAsync("US", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Enumerable.Range(0, 51).Select(i =>
                new SubdivisionInfo("US", $"S{i:D2}", $"State {i}")).ToArray());

        // Setup mock catalog to return CA provinces
        _catalogMock.Setup(c => c.GetRegionsAsync("CA", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new SubdivisionInfo("CA", "QC", "Quebec"),
                new SubdivisionInfo("CA", "ON", "Ontario"),
                new SubdivisionInfo("CA", "BC", "British Columbia")
            });

        _service = new LocationsService(_context, _catalogMock.Object);
    }

    [Fact]
    public async Task GetAvailableRegionsAsync_WithCountryIncludeAndStateExclude_ShouldReturnOnlyNonExcludedRegions()
    {
        // Arrange - Create warehouse that serves all of GB except NIR
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

        _context.Warehouses.Add(warehouse);
        await _context.SaveChangesAsync();

        // Act
        var regions = await _service.GetAvailableRegionsAsync("GB");

        // Assert
        regions.Count.ShouldBe(3); // Should have 3 regions (not 4)

        // Should include these
        regions.ShouldContain(r => r.RegionCode == "ENG", "Should include England");
        regions.ShouldContain(r => r.RegionCode == "SCT", "Should include Scotland");
        regions.ShouldContain(r => r.RegionCode == "WLS", "Should include Wales");

        // Should NOT include Northern Ireland
        regions.ShouldNotContain(r => r.RegionCode == "NIR", "Should NOT include Northern Ireland");
    }

    [Fact]
    public async Task GetAvailableRegionsAsync_WithUSIncludeAndStateExclude_ShouldReturnAllStatesExceptExcluded()
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
                    StateOrProvinceCode = "S10",
                    IsExcluded = true   // Except State 10
                }
            ]
        };

        _context.Warehouses.Add(warehouse);
        await _context.SaveChangesAsync();

        // Act
        var regions = await _service.GetAvailableRegionsAsync("US");

        // Assert
        regions.Count.ShouldBe(50); // 51 states - 1 excluded = 50
        regions.ShouldContain(r => r.RegionCode == "S00", "Should include State 0");
        regions.ShouldContain(r => r.RegionCode == "S20", "Should include State 20");
        regions.ShouldNotContain(r => r.RegionCode == "S10", "Should NOT include excluded State 10");
    }

    [Fact]
    public async Task GetAvailableRegionsAsync_WithOnlySpecificStateInclude_ShouldReturnOnlyThatState()
    {
        // Arrange - Warehouse that only serves Quebec
        var warehouse = new Warehouse
        {
            Name = "Quebec Warehouse",
            Address = new Address { CountryCode = "CA" },
            ServiceRegions =
            [
                new WarehouseServiceRegion
                {
                    CountryCode = "CA",
                    StateOrProvinceCode = "QC",
                    IsExcluded = false  // Only Quebec
                }
            ]
        };

        _context.Warehouses.Add(warehouse);
        await _context.SaveChangesAsync();

        // Act
        var regions = await _service.GetAvailableRegionsAsync("CA");

        // Assert
        regions.Count.ShouldBe(1);
        regions.ShouldContain(r => r.RegionCode == "QC", "Should include Quebec");
        regions.ShouldNotContain(r => r.RegionCode == "ON", "Should NOT include Ontario");
    }

    [Fact]
    public async Task GetAvailableCountriesAsync_WithCountryLevelRules_ShouldReturnCorrectCountries()
    {
        // Arrange
        var warehouse1 = new Warehouse
        {
            Name = "UK Warehouse",
            Address = new Address { CountryCode = "GB" },
            ServiceRegions =
            [
                new WarehouseServiceRegion { CountryCode = "GB", IsExcluded = false }
            ]
        };

        var warehouse2 = new Warehouse
        {
            Name = "EU Warehouse",
            Address = new Address { CountryCode = "DE" },
            ServiceRegions =
            [
                new WarehouseServiceRegion { CountryCode = "FR", IsExcluded = false },
                new WarehouseServiceRegion { CountryCode = "DE", IsExcluded = false }
            ]
        };

        _context.Warehouses.AddRange(warehouse1, warehouse2);
        await _context.SaveChangesAsync();

        // Act
        var countries = await _service.GetAvailableCountriesAsync();

        // Assert
        countries.ShouldContain(c => c.Code == "GB", "Should include GB");
        countries.ShouldContain(c => c.Code == "FR", "Should include FR");
        countries.ShouldContain(c => c.Code == "DE", "Should include DE");
        countries.ShouldNotContain(c => c.Code == "US", "Should NOT include US");
    }
}


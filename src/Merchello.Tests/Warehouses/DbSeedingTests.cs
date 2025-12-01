using Merchello.Core.Warehouses.Extensions;
using Merchello.Core.Warehouses.Factories;
using Merchello.Core.Locality.Models;
using Microsoft.EntityFrameworkCore;

namespace Merchello.Tests.Warehouses;

public class DbSeedingTests
{
    [Fact]
    public async Task CreateWarehouseWithOptions_ShouldSaveServiceRegionsToDatabase()
    {
        // Arrange
        var fixture = new ServiceTestFixture();
        var context = fixture.DbContext;
        var warehouseFactory = new WarehouseFactory();

        // Act - Create warehouse with service regions
        var result = context.CreateWarehouseWithOptions(
            warehouseFactory,
            "Test Warehouse",
            code: "TEST-01",
            address: new Address { CountryCode = "GB" },
            serviceRegions:
            [
                ("GB", null, false),
                ("GB", "NIR", true)
            ]);

        await context.SaveChangesAsync();

        // Assert - Reload from database
        var warehouseId = result.ResultObject!.Id;
        var reloadedWarehouse = await context.Warehouses
            .Include(w => w.ServiceRegions)
            .FirstOrDefaultAsync(w => w.Id == warehouseId);

        reloadedWarehouse.ShouldNotBeNull();
        reloadedWarehouse.ServiceRegions.ShouldNotBeNull();
        reloadedWarehouse.ServiceRegions.Count.ShouldBe(2);

        var gbInclude = reloadedWarehouse.ServiceRegions.FirstOrDefault(sr => sr.StateOrProvinceCode == null);
        gbInclude.ShouldNotBeNull();
        gbInclude.CountryCode.ShouldBe("GB");
        gbInclude.IsExcluded.ShouldBeFalse();

        var nirExclude = reloadedWarehouse.ServiceRegions.FirstOrDefault(sr => sr.StateOrProvinceCode == "NIR");
        nirExclude.ShouldNotBeNull();
        nirExclude.CountryCode.ShouldBe("GB");
        nirExclude.IsExcluded.ShouldBeTrue();
    }

    [Fact]
    public async Task CanServeRegion_WithDatabaseLoadedServiceRegions_ShouldWorkCorrectly()
    {
        // Arrange
        var fixture = new ServiceTestFixture();
        var context = fixture.DbContext;
        var warehouseFactory = new WarehouseFactory();

        var result = context.CreateWarehouseWithOptions(
            warehouseFactory,
            "Test Warehouse",
            address: new Address { CountryCode = "GB" },
            serviceRegions:
            [
                ("GB", null, false),
                ("GB", "NIR", true)
            ]);

        await context.SaveChangesAsync();

        // Act - Reload from database and test CanServeRegion
        var warehouseId = result.ResultObject!.Id;
        var reloadedWarehouse = await context.Warehouses
            .Include(w => w.ServiceRegions)
            .FirstOrDefaultAsync(w => w.Id == warehouseId);

        // Assert
        reloadedWarehouse.ShouldNotBeNull();
        reloadedWarehouse.CanServeRegion("GB", null).ShouldBeTrue("Should serve GB without specific region");
        reloadedWarehouse.CanServeRegion("GB", "ENG").ShouldBeTrue("Should serve England");
        reloadedWarehouse.CanServeRegion("GB", "SCT").ShouldBeTrue("Should serve Scotland");
        reloadedWarehouse.CanServeRegion("GB", "NIR").ShouldBeFalse("Should NOT serve Northern Ireland");
    }
}


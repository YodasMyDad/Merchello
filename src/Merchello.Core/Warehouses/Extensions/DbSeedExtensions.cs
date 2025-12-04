using Merchello.Core.Data;
using Merchello.Core.Locality.Models;
using Merchello.Core.Shared.Models;
using Merchello.Core.Shipping.Models;
using Merchello.Core.Warehouses.Factories;
using Merchello.Core.Warehouses.Models;

namespace Merchello.Core.Warehouses.Extensions;

/// <summary>
/// Extension methods for database seeding - helps create warehouses with options
/// </summary>
public static class WarehouseServiceDbSeedExtensions
{
    /// <summary>
    /// Creates a warehouse with service regions and shipping options.
    /// This is a helper method specifically for database seeding scenarios.
    /// Adds the warehouse to the context but does NOT save - caller must call SaveChangesAsync.
    /// </summary>
    public static CrudResult<Warehouse> CreateWarehouseWithOptions(
        this MerchelloDbContext context,
        WarehouseFactory warehouseFactory,
        string name,
        string? code = null,
        Address? address = null,
        string? automationMethod = null,
        Dictionary<string, object>? extendedData = null,
        List<(string countryCode, string? stateOrProvinceCode, bool isExcluded)>? serviceRegions = null,
        List<ShippingOptionConfig>? shippingOptions = null)
    {
        var result = new CrudResult<Warehouse>();

        var warehouse = warehouseFactory.Create(name, address);
        warehouse.Code = code;
        warehouse.AutomationMethod = automationMethod;
        warehouse.ExtendedData = extendedData ?? new Dictionary<string, object>();

        // Add service regions
        if (serviceRegions != null)
        {
            foreach (var (countryCode, stateOrProvinceCode, isExcluded) in serviceRegions)
            {
                warehouse.ServiceRegions.Add(new WarehouseServiceRegion
                {
                    WarehouseId = warehouse.Id,
                    CountryCode = countryCode,
                    StateOrProvinceCode = stateOrProvinceCode,
                    IsExcluded = isExcluded
                });
            }
        }

        // Add shipping options
        if (shippingOptions != null)
        {
            foreach (var shippingConfig in shippingOptions)
            {
                var shippingOption = new ShippingOption
                {
                    Name = shippingConfig.Name,
                    WarehouseId = warehouse.Id,
                    DaysFrom = shippingConfig.DaysFrom,
                    DaysTo = shippingConfig.DaysTo,
                    FixedCost = shippingConfig.Cost,
                    IsNextDay = shippingConfig.IsNextDay,
                    NextDayCutOffTime = shippingConfig.NextDayCutOffTime,
                    CreateDate = DateTime.UtcNow,
                    UpdateDate = DateTime.UtcNow
                };

                // Add country-specific costs if specified
                if (shippingConfig.CountrySpecificCosts != null)
                {
                    foreach (var (countryCode, cost) in shippingConfig.CountrySpecificCosts)
                    {
                        shippingOption.ShippingCosts.Add(new ShippingCost
                        {
                            CountryCode = countryCode,
                            Cost = cost,
                            ShippingOptionId = shippingOption.Id
                        });
                    }
                }
                else
                {
                    // Add default wildcard cost
                    shippingOption.ShippingCosts.Add(new ShippingCost
                    {
                        CountryCode = "*",
                        Cost = shippingConfig.Cost,
                        ShippingOptionId = shippingOption.Id
                    });
                }

                warehouse.ShippingOptions.Add(shippingOption);
            }
        }

        // Add to context (caller must call SaveChangesAsync)
        context.Warehouses.Add(warehouse);

        result.ResultObject = warehouse;

        return result;
    }
}


using Merchello.Core.Shipping.Models;
using Merchello.Core.Warehouses.Models;

namespace Merchello.Core.Shipping.Factories;

public class ShippingOptionFactory
{
    /// <summary>
    /// Creates a shipping option with warehouse reference.
    /// </summary>
    public ShippingOption Create(string name, decimal? cost,
        Warehouse warehouse, int daysFrom, int daysTo, bool isNextDay,
        TimeSpan? nextDayCutOffTime, Dictionary<string, decimal>? countryShippingCosts)
    {
        var shippingOption = new ShippingOption
        {
            Name = name,
            FixedCost = cost,
            Warehouse = warehouse,
            DaysFrom = daysFrom,
            DaysTo = daysTo,
            IsNextDay = isNextDay,
            NextDayCutOffTime = nextDayCutOffTime
        };

        return shippingOption;
    }

    /// <summary>
    /// Creates a shipping option with warehouse reference (simplified).
    /// </summary>
    public ShippingOption Create(string name, decimal? cost,
        Warehouse warehouse, int daysFrom, int daysTo, bool isNextDay,
        TimeSpan? nextDayCutOffTime)
    {
        return Create(name, cost, warehouse, daysFrom, daysTo, isNextDay, nextDayCutOffTime, []);
    }

    /// <summary>
    /// Creates a shipping option with warehouse ID and provider settings.
    /// Used by ShippingOptionService for full creation.
    /// </summary>
    public ShippingOption Create(
        string name,
        Guid warehouseId,
        string? providerKey = null,
        string? serviceType = null,
        string? providerSettings = null,
        bool isEnabled = true,
        decimal? fixedCost = null,
        int daysFrom = 0,
        int daysTo = 0,
        bool isNextDay = false,
        TimeSpan? nextDayCutOffTime = null,
        bool allowsDeliveryDateSelection = false,
        int? minDeliveryDays = null,
        int? maxDeliveryDays = null,
        string? allowedDaysOfWeek = null,
        bool isDeliveryDateGuaranteed = false)
    {
        return new ShippingOption
        {
            Name = name,
            WarehouseId = warehouseId,
            ProviderKey = providerKey ?? "flat-rate",
            ServiceType = serviceType,
            ProviderSettings = providerSettings,
            IsEnabled = isEnabled,
            FixedCost = fixedCost,
            DaysFrom = daysFrom,
            DaysTo = daysTo,
            IsNextDay = isNextDay,
            NextDayCutOffTime = nextDayCutOffTime,
            AllowsDeliveryDateSelection = allowsDeliveryDateSelection,
            MinDeliveryDays = minDeliveryDays,
            MaxDeliveryDays = maxDeliveryDays,
            AllowedDaysOfWeek = allowedDaysOfWeek,
            IsDeliveryDateGuaranteed = isDeliveryDateGuaranteed,
            CreateDate = DateTime.UtcNow,
            UpdateDate = DateTime.UtcNow
        };
    }
}

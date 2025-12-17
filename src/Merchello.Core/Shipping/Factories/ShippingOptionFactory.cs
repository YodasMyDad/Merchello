using Merchello.Core.Shipping.Models;
using Merchello.Core.Warehouses.Models;

namespace Merchello.Core.Shipping.Factories;

public class ShippingOptionFactory
{
    /// <summary>
    /// Creates a shipping option
    /// </summary>
    /// <param name="name"></param>
    /// <param name="cost"></param>
    /// <param name="warehouse"></param>
    /// <param name="nextDayCutOffTime"></param>
    /// <param name="countryShippingCosts"></param>
    /// <param name="daysFrom"></param>
    /// <param name="daysTo"></param>
    /// <param name="isNextDay"></param>
    /// <returns></returns>
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
        /*if (countryShippingCosts?.Any() == true)
        {
            shippingOption.CountryCosts = countryShippingCosts;
        }*/

        return shippingOption;
    }

    public ShippingOption Create(string name, decimal? cost,
        Warehouse warehouse, int daysFrom, int daysTo, bool isNextDay,
        TimeSpan? nextDayCutOffTime)
    {
        return Create(name, cost, warehouse, daysFrom, daysTo, isNextDay, nextDayCutOffTime, []);
    }
}

namespace Merchello.Core.Warehouses.Models;

/// <summary>
/// Configuration for a shipping option (used in seeding)
/// </summary>
public class ShippingOptionConfig
{
    public required string Name { get; set; }
    public int DaysFrom { get; set; }
    public int DaysTo { get; set; }
    public decimal Cost { get; set; }
    public bool IsNextDay { get; set; }
    public TimeSpan? NextDayCutOffTime { get; set; }
    public Dictionary<string, decimal>? CountrySpecificCosts { get; set; }
}


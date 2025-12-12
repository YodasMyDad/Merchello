namespace Merchello.Core.Shipping.Models;

public class ShippingOptionInfo
{
    public Guid ShippingOptionId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int DaysFrom { get; set; }
    public int DaysTo { get; set; }
    public bool IsNextDay { get; set; }
    public decimal Cost { get; set; }

    /// <summary>
    /// The provider key (e.g., "flat-rate", "fedex", "ups").
    /// </summary>
    public string ProviderKey { get; set; } = "flat-rate";

    public string DeliveryTimeDescription => IsNextDay
        ? "Next Day Delivery"
        : $"{DaysFrom}-{DaysTo} days";
}


using Merchello.Core.Products.Models;
using Merchello.Core.Shared.Extensions;
using Merchello.Core.Warehouses.Models;

namespace Merchello.Core.Shipping.Models;

public class ShippingOption
{
    /// <summary>
    /// Item Id
    /// </summary>
    public Guid Id { get; set; } = GuidExtensions.NewSequentialGuid;

    /// <summary>
    /// Name of this shipping option
    /// </summary>
    public string? Name { get; set; }

    /// <summary>
    /// The provider key (e.g., "flat-rate", "ups", "fedex").
    /// Defaults to "flat-rate" for backward compatibility.
    /// </summary>
    public string ProviderKey { get; set; } = "flat-rate";

    /// <summary>
    /// JSON-serialized provider-specific settings.
    /// Used by real-time providers for service level, markup, etc.
    /// FlatRate uses the existing Costs/WeightTiers tables instead.
    /// </summary>
    public string? ProviderSettings { get; set; }

    /// <summary>
    /// Whether this shipping method is enabled.
    /// </summary>
    public bool IsEnabled { get; set; } = true;

    /// <summary>
    /// Optional fixed cost for everything in this shipping option
    /// </summary>
    public decimal? FixedCost { get; set; }

    /// <summary>
    /// The fully qualified namespace to the calculation class for this shipping option
    /// If this has a value it will be used by default to get the price for the shipment
    /// Note: This is a placeholder for future extensibility via pluggable shipping providers
    /// </summary>
    public string? CalculationMethod { get; set; }

    /// <summary>
    /// Warehouse of this shipping option
    /// </summary>
    public virtual Warehouse Warehouse { get; set; } = null!;

    /// <summary>
    /// Warehouse Id
    /// </summary>
    public Guid WarehouseId { get; set; }

    /// <summary>
    /// Minimum days to take
    /// </summary>
    public int DaysFrom { get; set; }

    /// <summary>
    /// Maximum days to take
    /// </summary>
    public int DaysTo { get; set; }

    /// <summary>
    /// Is this a next day shipment
    /// </summary>
    public bool IsNextDay { get; set; }

    /// <summary>
    /// The cut off time
    /// </summary>
    public TimeSpan? NextDayCutOffTime { get; set; }

    /// <summary>
    /// All products using this shipping option
    /// </summary>
    public virtual ICollection<Product> Products { get; set; } = new HashSet<Product>();

    /// <summary>
    /// Collection of country-specific shipping options associated with the shipping method.
    /// </summary>
    public virtual ICollection<ShippingOptionCountry> ShippingOptionCountries { get; set; } = new HashSet<ShippingOptionCountry>();

    /// <summary>
    /// The country shipping costs for this shipping option (What about states and provinces)
    /// </summary>
    public virtual ICollection<ShippingCost> ShippingCosts { get; set; } = new HashSet<ShippingCost>();

    /// <summary>
    /// Weight-based surcharge tiers for this shipping option
    /// </summary>
    public virtual ICollection<ShippingWeightTier> WeightTiers { get; set; } = new HashSet<ShippingWeightTier>();

    /// <summary>
    /// Whether this shipping option allows customers to select a specific delivery date
    /// </summary>
    public bool AllowsDeliveryDateSelection { get; set; }

    /// <summary>
    /// Minimum days from order date for delivery (null = no minimum)
    /// </summary>
    public int? MinDeliveryDays { get; set; }

    /// <summary>
    /// Maximum days from order date for delivery (null = no maximum)
    /// </summary>
    public int? MaxDeliveryDays { get; set; }

    /// <summary>
    /// Comma-separated list of allowed days of week (0=Sunday, 6=Saturday)
    /// Example: "1,2,3,4,5" for weekdays only. Null = all days allowed
    /// </summary>
    public string? AllowedDaysOfWeek { get; set; }

    /// <summary>
    /// Whether the selected delivery date is guaranteed (hard requirement) or best effort (preference)
    /// </summary>
    public bool IsDeliveryDateGuaranteed { get; set; }

    /// <summary>
    /// Fully qualified namespace to the delivery date provider plugin
    /// Used for custom available date calculation and pricing logic
    /// Example: "MyApp.Shipping.CustomDeliveryDateProvider"
    /// </summary>
    public string? DeliveryDatePricingMethod { get; set; }

    /// <summary>
    /// Update date
    /// </summary>
    public DateTime UpdateDate { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Create date
    /// </summary>
    public DateTime CreateDate { get; set; } = DateTime.UtcNow;
}

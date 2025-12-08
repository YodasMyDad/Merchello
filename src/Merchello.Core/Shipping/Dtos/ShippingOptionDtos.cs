namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Summary DTO for shipping option list views.
/// </summary>
public class ShippingOptionDto
{
    public Guid Id { get; set; }
    public string? Name { get; set; }
    public Guid WarehouseId { get; set; }
    public string? WarehouseName { get; set; }
    public string ProviderKey { get; set; } = "flat-rate";
    public string? ProviderDisplayName { get; set; }
    public bool IsEnabled { get; set; } = true;
    public decimal? FixedCost { get; set; }
    public int DaysFrom { get; set; }
    public int DaysTo { get; set; }
    public bool IsNextDay { get; set; }
    public bool AllowsDeliveryDateSelection { get; set; }
    public int CostCount { get; set; }
    public int WeightTierCount { get; set; }
    public DateTime UpdateDate { get; set; }
}

/// <summary>
/// Full detail DTO including nested costs and weight tiers.
/// </summary>
public class ShippingOptionDetailDto : ShippingOptionDto
{
    public Dictionary<string, string>? ProviderSettings { get; set; }
    public TimeSpan? NextDayCutOffTime { get; set; }
    public int? MinDeliveryDays { get; set; }
    public int? MaxDeliveryDays { get; set; }
    public string? AllowedDaysOfWeek { get; set; }
    public bool IsDeliveryDateGuaranteed { get; set; }
    public List<ShippingCostDto> Costs { get; set; } = [];
    public List<ShippingWeightTierDto> WeightTiers { get; set; } = [];
}

/// <summary>
/// DTO for shipping cost entries.
/// </summary>
public class ShippingCostDto
{
    public Guid Id { get; set; }
    public string CountryCode { get; set; } = null!;
    public string? StateOrProvinceCode { get; set; }
    public decimal Cost { get; set; }

    /// <summary>
    /// Display-friendly region name (e.g., "United Kingdom" or "California, US").
    /// </summary>
    public string? RegionDisplay { get; set; }
}

/// <summary>
/// DTO for weight tier entries.
/// </summary>
public class ShippingWeightTierDto
{
    public Guid Id { get; set; }
    public string CountryCode { get; set; } = null!;
    public string? StateOrProvinceCode { get; set; }
    public decimal MinWeightKg { get; set; }
    public decimal? MaxWeightKg { get; set; }
    public decimal Surcharge { get; set; }

    /// <summary>
    /// Display-friendly weight range (e.g., "5-10 kg" or "20+ kg").
    /// </summary>
    public string? WeightRangeDisplay { get; set; }

    /// <summary>
    /// Display-friendly region name.
    /// </summary>
    public string? RegionDisplay { get; set; }
}

/// <summary>
/// DTO for creating/updating a shipping option.
/// </summary>
public class CreateShippingOptionDto
{
    public required string Name { get; set; }
    public required Guid WarehouseId { get; set; }
    public string ProviderKey { get; set; } = "flat-rate";
    public Dictionary<string, string>? ProviderSettings { get; set; }
    public bool IsEnabled { get; set; } = true;
    public decimal? FixedCost { get; set; }
    public int DaysFrom { get; set; } = 3;
    public int DaysTo { get; set; } = 5;
    public bool IsNextDay { get; set; }
    public TimeSpan? NextDayCutOffTime { get; set; }
    public bool AllowsDeliveryDateSelection { get; set; }
    public int? MinDeliveryDays { get; set; }
    public int? MaxDeliveryDays { get; set; }
    public string? AllowedDaysOfWeek { get; set; }
    public bool IsDeliveryDateGuaranteed { get; set; }
}

/// <summary>
/// DTO for creating/updating a shipping cost.
/// </summary>
public class CreateShippingCostDto
{
    public required string CountryCode { get; set; }
    public string? StateOrProvinceCode { get; set; }
    public required decimal Cost { get; set; }
}

/// <summary>
/// DTO for creating/updating a weight tier.
/// </summary>
public class CreateShippingWeightTierDto
{
    public required string CountryCode { get; set; }
    public string? StateOrProvinceCode { get; set; }
    public required decimal MinWeightKg { get; set; }
    public decimal? MaxWeightKg { get; set; }
    public required decimal Surcharge { get; set; }
}

/// <summary>
/// Lightweight DTO for warehouse dropdown selection.
/// </summary>
public class WarehouseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Code { get; set; }
}

namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// DTO for creating/updating a shipping option.
/// </summary>
public class CreateShippingOptionDto
{
    public required string Name { get; set; }
    public required Guid WarehouseId { get; set; }
    public string ProviderKey { get; set; } = "flat-rate";

    /// <summary>
    /// Service type code for external providers (e.g., "FEDEX_GROUND", "UPS_NEXT_DAY_AIR").
    /// Required for external providers, null for flat-rate.
    /// </summary>
    public string? ServiceType { get; set; }

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
    public List<CreateShippingDestinationExclusionDto>? ExcludedRegions { get; set; }
}

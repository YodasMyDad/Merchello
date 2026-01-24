namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Full detail DTO including nested costs and weight tiers.
/// </summary>
public class ShippingOptionDetailDto : ShippingOptionListItemDto
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

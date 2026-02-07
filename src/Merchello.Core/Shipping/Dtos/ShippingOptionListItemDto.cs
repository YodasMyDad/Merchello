namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Summary DTO for shipping option list views.
/// </summary>
public class ShippingOptionListItemDto : ShippingOptionBaseDto
{
    public Guid WarehouseId { get; set; }
    public string? WarehouseName { get; set; }
    public string? ProviderDisplayName { get; set; }
    public bool IsEnabled { get; set; } = true;
    public decimal? FixedCost { get; set; }
    public bool AllowsDeliveryDateSelection { get; set; }
    public int CostCount { get; set; }
    public int WeightTierCount { get; set; }
    public int ExclusionCount { get; set; }
    public DateTime UpdateDate { get; set; }

    /// <summary>
    /// Whether this provider uses live rates from an external API.
    /// False for flat-rate and other locally-configured providers.
    /// </summary>
    public bool UsesLiveRates { get; set; }
}

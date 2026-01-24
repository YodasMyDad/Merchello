namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Summary DTO for shipping option list views.
/// </summary>
public class ShippingOptionListItemDto
{
    public Guid Id { get; set; }
    public string? Name { get; set; }
    public Guid WarehouseId { get; set; }
    public string? WarehouseName { get; set; }
    public string ProviderKey { get; set; } = "flat-rate";
    public string? ProviderDisplayName { get; set; }

    /// <summary>
    /// Service type code for external providers (e.g., "FEDEX_GROUND", "UPS_NEXT_DAY_AIR").
    /// Null for flat-rate provider.
    /// </summary>
    public string? ServiceType { get; set; }

    public bool IsEnabled { get; set; } = true;
    public decimal? FixedCost { get; set; }
    public int DaysFrom { get; set; }
    public int DaysTo { get; set; }
    public bool IsNextDay { get; set; }
    public bool AllowsDeliveryDateSelection { get; set; }
    public int CostCount { get; set; }
    public int WeightTierCount { get; set; }
    public DateTime UpdateDate { get; set; }

    /// <summary>
    /// Whether this provider uses live rates from an external API.
    /// False for flat-rate and other locally-configured providers.
    /// </summary>
    public bool UsesLiveRates { get; set; }
}

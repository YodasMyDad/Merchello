using System;
using System.Collections.Generic;

namespace Merchello.Core.Shipping.Providers;

/// <summary>
/// Snapshot of a shipping option tied to a product.
/// </summary>
public class ShippingOptionSnapshot
{
    public Guid Id { get; init; }
    public string? Name { get; init; }
    public Guid? WarehouseId { get; init; }
    public int DaysFrom { get; init; }
    public int DaysTo { get; init; }
    public bool IsNextDay { get; init; }
    public decimal? FixedCost { get; init; }
    public TimeSpan? NextDayCutOffTime { get; init; }
    public bool CanShipToDestination { get; init; }
    public decimal? DestinationCost { get; init; }
    public IReadOnlyCollection<ShippingCostSnapshot> Costs { get; init; } = Array.Empty<ShippingCostSnapshot>();
    public IReadOnlyCollection<ShippingWeightTierSnapshot> WeightTiers { get; init; } = Array.Empty<ShippingWeightTierSnapshot>();
    public bool AllowsDeliveryDateSelection { get; init; }
    public int? MinDeliveryDays { get; init; }
    public int? MaxDeliveryDays { get; init; }
    public string? AllowedDaysOfWeek { get; init; }
    public bool IsDeliveryDateGuaranteed { get; init; }
}

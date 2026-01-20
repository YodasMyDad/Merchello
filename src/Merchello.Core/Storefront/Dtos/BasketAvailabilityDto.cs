namespace Merchello.Core.Storefront.Dtos;

/// <summary>
/// Availability status for all basket items
/// </summary>
public class BasketAvailabilityDto
{
    public bool AllItemsAvailable { get; set; }
    public required List<BasketItemAvailabilityDetailDto> Items { get; set; }
}

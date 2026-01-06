namespace Merchello.Core.Storefront.Dtos;

/// <summary>
/// Product availability for a specific location
/// </summary>
public class ProductAvailabilityDto
{
    public bool CanShipToCountry { get; set; }
    public bool HasStock { get; set; }
    public int AvailableStock { get; set; }
    public string? Message { get; set; }
    public bool ShowStockLevels { get; set; }
}

/// <summary>
/// Availability status for all basket items
/// </summary>
public class BasketAvailabilityDto
{
    public bool AllItemsAvailable { get; set; }
    public required List<BasketItemAvailabilityDetailDto> Items { get; set; }
}

/// <summary>
/// Detailed availability for a single basket item
/// </summary>
public class BasketItemAvailabilityDetailDto
{
    public Guid LineItemId { get; set; }
    public Guid ProductId { get; set; }
    public bool CanShipToCountry { get; set; }
    public bool HasStock { get; set; }
    public string? Message { get; set; }
}

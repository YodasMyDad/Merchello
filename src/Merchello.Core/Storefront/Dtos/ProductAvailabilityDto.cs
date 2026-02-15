namespace Merchello.Core.Storefront.Dtos;

/// <summary>
/// Product availability for a specific location
/// </summary>
public class ProductAvailabilityDto
{
    public bool CanShipToLocation { get; set; }
    public bool HasStock { get; set; }
    public int AvailableStock { get; set; }
    public string? Message { get; set; }
    public bool ShowStockLevels { get; set; }
}

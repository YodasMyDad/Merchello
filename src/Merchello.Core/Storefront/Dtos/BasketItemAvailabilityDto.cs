namespace Merchello.Core.Storefront.Dtos;

/// <summary>
/// Availability status for a basket item
/// </summary>
public class BasketItemAvailabilityDto
{
    public bool CanShipToCountry { get; set; }
    public bool HasStock { get; set; }
    public string? Message { get; set; }
}

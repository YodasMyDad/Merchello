namespace Merchello.Core.Storefront.Dtos;

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

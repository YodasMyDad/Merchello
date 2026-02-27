namespace Merchello.Core.Checkout.Dtos;

/// <summary>
/// DTO for basket errors returned in checkout API responses.
/// </summary>
public class BasketErrorDto
{
    public string? Message { get; set; }
    public Guid? RelatedLineItemId { get; set; }
    public bool IsShippingError { get; set; }
    public bool IsStockError { get; set; }
}

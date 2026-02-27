namespace Merchello.Core.Checkout.Models;

public class BasketError
{
    public string? Message { get; set; }
    public Guid? RelatedLineItemId { get; set; }
    public bool IsShippingError { get; set; }
    public bool IsStockError { get; set; }
}

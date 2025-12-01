namespace Merchello.Core.Shipping.Models;

public class ShippingLineItem
{
    public Guid LineItemId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Sku { get; set; }
    public int Quantity { get; set; }
    public decimal Amount { get; set; }
}


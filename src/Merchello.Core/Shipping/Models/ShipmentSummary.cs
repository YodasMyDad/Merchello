namespace Merchello.Core.Shipping.Models;

public class ShipmentSummary
{
    public string ShippingMethodName { get; set; } = string.Empty;
    public string DeliveryTimeDescription { get; set; } = string.Empty;
    public List<ShipmentLineItemSummary> LineItems { get; set; } = [];
    public decimal ShippingCost { get; set; }
}


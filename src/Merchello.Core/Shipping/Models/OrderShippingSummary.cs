namespace Merchello.Core.Shipping.Models;

public class OrderShippingSummary
{
    public List<ShipmentSummary> Shipments { get; set; } = [];
    public decimal TotalShippingCost { get; set; }
}


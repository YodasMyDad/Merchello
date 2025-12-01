namespace Merchello.Core.Shipping.Models;

public class ShippingSelectionResult
{
    public List<WarehouseShippingGroup> WarehouseGroups { get; set; } = [];
    public decimal SubTotal { get; set; }
    public decimal Tax { get; set; }
    public decimal Total { get; set; }
}


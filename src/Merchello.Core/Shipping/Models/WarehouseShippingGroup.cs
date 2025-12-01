namespace Merchello.Core.Shipping.Models;

public class WarehouseShippingGroup
{
    public Guid GroupId { get; set; }
    public Guid WarehouseId { get; set; }
    public List<ShippingLineItem> LineItems { get; set; } = [];
    public List<ShippingOptionInfo> AvailableShippingOptions { get; set; } = [];
    public Guid? SelectedShippingOptionId { get; set; }
}


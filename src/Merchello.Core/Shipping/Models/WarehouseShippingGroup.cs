namespace Merchello.Core.Shipping.Models;

public class WarehouseShippingGroup
{
    public Guid GroupId { get; set; }
    public Guid WarehouseId { get; set; }
    public List<ShippingLineItem> LineItems { get; set; } = [];
    public List<ShippingOptionInfo> AvailableShippingOptions { get; set; } = [];

    /// <summary>
    /// Currently selected shipping option SelectionKey (null if not yet selected).
    /// Format: "so:{guid}" for flat-rate, "dyn:{provider}:{serviceCode}" for dynamic.
    /// </summary>
    public string? SelectedShippingOptionId { get; set; }
}


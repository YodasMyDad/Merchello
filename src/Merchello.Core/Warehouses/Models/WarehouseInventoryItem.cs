namespace Merchello.Core.Warehouses.Models;

/// <summary>
/// Inventory item information for a warehouse
/// </summary>
public class WarehouseInventoryItem
{
    public Guid ProductId { get; set; }
    public string? ProductName { get; set; }
    public string? Sku { get; set; }
    public int Stock { get; set; }
    public int ReservedStock { get; set; }
    public int AvailableStock => TrackStock ? Math.Max(0, Stock - ReservedStock) : int.MaxValue;
    public bool TrackStock { get; set; }
    public int? ReorderPoint { get; set; }
    public int? ReorderQuantity { get; set; }
    public bool IsLowStock => ReorderPoint.HasValue && AvailableStock <= ReorderPoint.Value;
}


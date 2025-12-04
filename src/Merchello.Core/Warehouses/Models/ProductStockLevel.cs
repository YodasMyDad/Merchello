namespace Merchello.Core.Warehouses.Models;

/// <summary>
/// Stock information for a product at a specific warehouse
/// </summary>
public class ProductStockLevel
{
    public Guid WarehouseId { get; set; }
    public string? WarehouseName { get; set; }
    public string? WarehouseCode { get; set; }
    public int Stock { get; set; }
    public int ReservedStock { get; set; }
    public int AvailableStock => TrackStock ? Math.Max(0, Stock - ReservedStock) : int.MaxValue;
    public bool TrackStock { get; set; }
    public int? ReorderPoint { get; set; }
    public int? ReorderQuantity { get; set; }
    public bool IsLowStock => ReorderPoint.HasValue && AvailableStock <= ReorderPoint.Value;
}


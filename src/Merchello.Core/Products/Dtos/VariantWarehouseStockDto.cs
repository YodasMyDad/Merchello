namespace Merchello.Core.Products.Dtos;

/// <summary>
/// Warehouse stock information for a variant
/// </summary>
public class VariantWarehouseStockDto
{
    public Guid WarehouseId { get; set; }
    public string? WarehouseName { get; set; }
    public int Stock { get; set; }
    public int? ReorderPoint { get; set; }
    public int? ReorderQuantity { get; set; }
    public bool TrackStock { get; set; }
}

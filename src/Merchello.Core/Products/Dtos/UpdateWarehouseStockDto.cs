namespace Merchello.Core.Products.Dtos;

/// <summary>
/// DTO to update warehouse stock for a variant
/// </summary>
public class UpdateWarehouseStockDto
{
    public Guid WarehouseId { get; set; }
    public int Stock { get; set; }
    public int? ReorderPoint { get; set; }
    public int? ReorderQuantity { get; set; }
    public bool TrackStock { get; set; } = true;
}

namespace Merchello.Core.Warehouses.Dtos;

/// <summary>
/// Request to remove products from a warehouse.
/// </summary>
public class RemoveProductsFromWarehouseDto
{
    public List<Guid> ProductRootIds { get; set; } = [];
}

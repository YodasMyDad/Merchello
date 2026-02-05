namespace Merchello.Core.Warehouses.Dtos;

/// <summary>
/// Request to add products to a warehouse.
/// </summary>
public class AddProductsToWarehouseDto
{
    public List<Guid> ProductRootIds { get; set; } = [];
}

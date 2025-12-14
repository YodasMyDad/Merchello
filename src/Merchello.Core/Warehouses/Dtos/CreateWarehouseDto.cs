namespace Merchello.Core.Warehouses.Dtos;

/// <summary>
/// DTO for creating a new warehouse.
/// </summary>
public class CreateWarehouseDto
{
    public required string Name { get; set; }
    public string? Code { get; set; }
    public Guid? SupplierId { get; set; }
    public WarehouseAddressDto? Address { get; set; }
}

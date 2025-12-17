namespace Merchello.Core.Warehouses.Dtos;

/// <summary>
/// DTO for updating an existing warehouse.
/// </summary>
public class UpdateWarehouseDto
{
    public string? Name { get; set; }
    public string? Code { get; set; }
    public Guid? SupplierId { get; set; }

    /// <summary>
    /// If true, clears the SupplierId (sets it to null).
    /// </summary>
    public bool ShouldClearSupplierId { get; set; }

    public WarehouseAddressDto? Address { get; set; }
}

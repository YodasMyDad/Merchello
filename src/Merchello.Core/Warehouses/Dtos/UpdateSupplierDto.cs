namespace Merchello.Core.Warehouses.Dtos;

/// <summary>
/// DTO for updating an existing supplier.
/// </summary>
public class UpdateSupplierDto
{
    public required string Name { get; set; }
    public string? Code { get; set; }
}

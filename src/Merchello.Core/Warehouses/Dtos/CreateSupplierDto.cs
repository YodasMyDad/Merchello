namespace Merchello.Core.Warehouses.Dtos;

/// <summary>
/// DTO for creating a supplier (quick create from warehouse form).
/// </summary>
public class CreateSupplierDto
{
    public required string Name { get; set; }
    public string? Code { get; set; }
}

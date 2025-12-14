namespace Merchello.Core.Warehouses.Dtos;

/// <summary>
/// Lightweight DTO for supplier list and dropdown selection.
/// </summary>
public class SupplierListDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Code { get; set; }

    /// <summary>
    /// Number of warehouses linked to this supplier.
    /// </summary>
    public int WarehouseCount { get; set; }
}

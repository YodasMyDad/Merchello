namespace Merchello.Core.Warehouses.Dtos;

/// <summary>
/// Summary DTO for warehouse list views.
/// </summary>
public class WarehouseListDto
{
    public Guid Id { get; set; }
    public string? Name { get; set; }
    public string? Code { get; set; }
    public string? SupplierName { get; set; }
    public Guid? SupplierId { get; set; }
    public int ServiceRegionCount { get; set; }
    public int ShippingOptionCount { get; set; }

    /// <summary>
    /// Display-friendly address summary (e.g., "London, UK").
    /// </summary>
    public string? AddressSummary { get; set; }

    public DateTime DateUpdated { get; set; }
}

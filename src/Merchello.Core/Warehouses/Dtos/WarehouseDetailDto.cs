namespace Merchello.Core.Warehouses.Dtos;

/// <summary>
/// Full detail DTO for warehouse editing including nested service regions.
/// </summary>
public class WarehouseDetailDto
{
    public Guid Id { get; set; }
    public string? Name { get; set; }
    public string? Code { get; set; }
    public Guid? SupplierId { get; set; }
    public string? SupplierName { get; set; }
    public WarehouseAddressDto Address { get; set; } = new();
    public List<ServiceRegionDto> ServiceRegions { get; set; } = [];
    public int ShippingOptionCount { get; set; }
    public DateTime DateCreated { get; set; }
    public DateTime DateUpdated { get; set; }
}

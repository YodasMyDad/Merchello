using Merchello.Core.Locality.Dtos;

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

    /// <summary>
    /// Optional fulfilment provider override for this warehouse.
    /// If set, overrides the supplier's default fulfilment provider.
    /// </summary>
    public Guid? FulfilmentProviderConfigurationId { get; set; }

    /// <summary>
    /// Display name of the fulfilment provider override (if set).
    /// </summary>
    public string? FulfilmentProviderName { get; set; }

    public AddressDto Address { get; set; } = new();
    public List<ServiceRegionDto> ServiceRegions { get; set; } = [];
    public int ShippingOptionCount { get; set; }
    public DateTime DateCreated { get; set; }
    public DateTime DateUpdated { get; set; }
}

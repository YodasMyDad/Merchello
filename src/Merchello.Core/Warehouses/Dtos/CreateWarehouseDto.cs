using Merchello.Core.Locality.Dtos;

namespace Merchello.Core.Warehouses.Dtos;

/// <summary>
/// DTO for creating a new warehouse.
/// </summary>
public class CreateWarehouseDto
{
    public required string Name { get; set; }
    public string? Code { get; set; }
    public Guid? SupplierId { get; set; }

    /// <summary>
    /// Optional fulfilment provider override for this warehouse.
    /// </summary>
    public Guid? FulfilmentProviderConfigurationId { get; set; }

    public AddressDto? Address { get; set; }
}

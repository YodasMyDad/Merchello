using Merchello.Core.Locality.Dtos;

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

    /// <summary>
    /// Optional fulfilment provider override for this warehouse.
    /// </summary>
    public Guid? FulfilmentProviderConfigurationId { get; set; }

    /// <summary>
    /// If true, clears the FulfilmentProviderConfigurationId (sets it to null).
    /// </summary>
    public bool ShouldClearFulfilmentProviderId { get; set; }

    public AddressDto? Address { get; set; }
}

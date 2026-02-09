namespace Merchello.Core.Warehouses.Dtos;

/// <summary>
/// DTO for updating an existing supplier.
/// </summary>
public class UpdateSupplierDto
{
    public required string Name { get; set; }
    public string? Code { get; set; }

    /// <summary>
    /// The default fulfilment provider configuration ID for this supplier.
    /// </summary>
    public Guid? FulfilmentProviderConfigurationId { get; set; }

    /// <summary>
    /// If true, clears the FulfilmentProviderConfigurationId (sets it to null).
    /// </summary>
    public bool ShouldClearFulfilmentProviderId { get; set; }
}

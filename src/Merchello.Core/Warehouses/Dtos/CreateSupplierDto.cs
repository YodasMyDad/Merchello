namespace Merchello.Core.Warehouses.Dtos;

/// <summary>
/// DTO for creating a supplier (quick create from warehouse form).
/// </summary>
public class CreateSupplierDto
{
    public required string Name { get; set; }
    public string? Code { get; set; }

    /// <summary>
    /// The default fulfilment provider configuration ID for this supplier.
    /// </summary>
    public Guid? FulfilmentProviderConfigurationId { get; set; }
}

namespace Merchello.Core.Warehouses.Dtos;

/// <summary>
/// DTO for updating an existing supplier.
/// </summary>
public class UpdateSupplierDto
{
    public required string Name { get; set; }
    public string? Code { get; set; }

    /// <summary>
    /// Contact name for the supplier.
    /// </summary>
    public string? ContactName { get; set; }

    /// <summary>
    /// Contact email for the supplier.
    /// </summary>
    public string? ContactEmail { get; set; }

    /// <summary>
    /// Contact phone for the supplier.
    /// </summary>
    public string? ContactPhone { get; set; }

    /// <summary>
    /// The default fulfilment provider configuration ID for this supplier.
    /// </summary>
    public Guid? FulfilmentProviderConfigurationId { get; set; }

    /// <summary>
    /// If true, clears the FulfilmentProviderConfigurationId (sets it to null).
    /// </summary>
    public bool ShouldClearFulfilmentProviderId { get; set; }

    /// <summary>
    /// Supplier Direct delivery profile configuration.
    /// </summary>
    public SupplierDirectProfileDto? SupplierDirectProfile { get; set; }

    /// <summary>
    /// If true, clears the Supplier Direct profile (removes the configuration).
    /// </summary>
    public bool ShouldClearSupplierDirectProfile { get; set; }
}

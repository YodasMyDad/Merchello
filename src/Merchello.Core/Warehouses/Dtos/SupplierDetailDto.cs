namespace Merchello.Core.Warehouses.Dtos;

/// <summary>
/// Detailed DTO for supplier with full profile information.
/// Used when editing a supplier in the backoffice.
/// </summary>
public class SupplierDetailDto
{
    /// <summary>
    /// Unique identifier for the supplier.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Supplier name.
    /// </summary>
    public string Name { get; set; } = null!;

    /// <summary>
    /// Optional supplier code for reference.
    /// </summary>
    public string? Code { get; set; }

    /// <summary>
    /// Number of warehouses linked to this supplier.
    /// </summary>
    public int WarehouseCount { get; set; }

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
    /// Display name of the fulfilment provider (if set).
    /// </summary>
    public string? FulfilmentProviderName { get; set; }

    /// <summary>
    /// Supplier Direct delivery profile configuration.
    /// Only populated when the supplier has a profile configured.
    /// </summary>
    public SupplierDirectProfileDto? SupplierDirectProfile { get; set; }

    /// <summary>
    /// Date the supplier was created.
    /// </summary>
    public DateTime DateCreated { get; set; }

    /// <summary>
    /// Date the supplier was last updated.
    /// </summary>
    public DateTime DateUpdated { get; set; }
}

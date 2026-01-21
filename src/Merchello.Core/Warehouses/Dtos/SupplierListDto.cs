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

    /// <summary>
    /// The default fulfilment provider configuration ID for this supplier.
    /// </summary>
    public Guid? FulfilmentProviderConfigurationId { get; set; }

    /// <summary>
    /// Display name of the fulfilment provider (if set).
    /// </summary>
    public string? FulfilmentProviderName { get; set; }
}

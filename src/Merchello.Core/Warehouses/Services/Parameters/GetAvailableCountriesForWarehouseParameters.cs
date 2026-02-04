namespace Merchello.Core.Warehouses.Services.Parameters;

/// <summary>
/// Parameters for loading available countries for a specific warehouse.
/// </summary>
public class GetAvailableCountriesForWarehouseParameters
{
    /// <summary>
    /// Warehouse identifier.
    /// </summary>
    public required Guid WarehouseId { get; init; }
}

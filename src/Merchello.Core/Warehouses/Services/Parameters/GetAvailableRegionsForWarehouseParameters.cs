namespace Merchello.Core.Warehouses.Services.Parameters;

/// <summary>
/// Parameters for loading available regions for a specific warehouse and country.
/// </summary>
public class GetAvailableRegionsForWarehouseParameters
{
    /// <summary>
    /// Warehouse identifier.
    /// </summary>
    public required Guid WarehouseId { get; init; }

    /// <summary>
    /// ISO country code.
    /// </summary>
    public required string CountryCode { get; init; }
}

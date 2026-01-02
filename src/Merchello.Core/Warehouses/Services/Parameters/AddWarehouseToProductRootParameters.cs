namespace Merchello.Core.Warehouses.Services.Parameters;

/// <summary>
/// Parameters for adding a warehouse to a product root
/// </summary>
public class AddWarehouseToProductRootParameters
{
    /// <summary>
    /// The product root ID
    /// </summary>
    public required Guid ProductRootId { get; init; }

    /// <summary>
    /// The warehouse ID
    /// </summary>
    public required Guid WarehouseId { get; init; }

    /// <summary>
    /// The priority order (lower = higher priority)
    /// </summary>
    public required int PriorityOrder { get; init; }
}

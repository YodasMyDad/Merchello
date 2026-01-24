namespace Merchello.Core.Warehouses.Services.Parameters;

/// <summary>
/// Parameters for updating warehouse priority order on a product.
/// </summary>
public class UpdateWarehousePriorityParameters
{
    /// <summary>
    /// The product root ID.
    /// </summary>
    public required Guid ProductRootId { get; set; }

    /// <summary>
    /// The warehouse to reorder.
    /// </summary>
    public required Guid WarehouseId { get; set; }

    /// <summary>
    /// The new priority order value.
    /// </summary>
    public int NewPriorityOrder { get; set; }
}

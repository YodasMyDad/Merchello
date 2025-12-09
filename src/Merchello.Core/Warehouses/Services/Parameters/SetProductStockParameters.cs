namespace Merchello.Core.Warehouses.Services.Parameters;

/// <summary>
/// Parameters for setting product stock levels
/// </summary>
public class SetProductStockParameters
{
    /// <summary>
    /// The product ID
    /// </summary>
    public required Guid ProductId { get; init; }

    /// <summary>
    /// The warehouse ID
    /// </summary>
    public required Guid WarehouseId { get; init; }

    /// <summary>
    /// The stock quantity
    /// </summary>
    public required int Stock { get; init; }

    /// <summary>
    /// Optional reorder point threshold
    /// </summary>
    public int? ReorderPoint { get; init; }

    /// <summary>
    /// Optional reorder quantity
    /// </summary>
    public int? ReorderQuantity { get; init; }
}

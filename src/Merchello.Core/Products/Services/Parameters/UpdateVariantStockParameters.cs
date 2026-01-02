namespace Merchello.Core.Products.Services.Parameters;

/// <summary>
/// Parameters for updating variant stock levels
/// </summary>
public class UpdateVariantStockParameters
{
    /// <summary>
    /// The variant (product) ID to update stock for
    /// </summary>
    public required Guid VariantId { get; init; }

    /// <summary>
    /// The warehouse ID where stock is held
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
    /// Whether to track stock for this variant
    /// </summary>
    public bool TrackStock { get; init; } = true;
}

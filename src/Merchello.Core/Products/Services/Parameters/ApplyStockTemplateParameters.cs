namespace Merchello.Core.Products.Services.Parameters;

/// <summary>
/// Parameters for applying a stock template to all variants of a product
/// </summary>
public class ApplyStockTemplateParameters
{
    /// <summary>
    /// Product root ID
    /// </summary>
    public required Guid ProductRootId { get; init; }

    /// <summary>
    /// Warehouse ID to apply stock to
    /// </summary>
    public required Guid WarehouseId { get; init; }

    /// <summary>
    /// Default stock quantity for all variants
    /// </summary>
    public required int DefaultStock { get; init; }

    /// <summary>
    /// Default reorder point threshold
    /// </summary>
    public int? DefaultReorderPoint { get; init; }

    /// <summary>
    /// Whether to track stock for these variants
    /// </summary>
    public bool TrackStock { get; init; } = true;
}

namespace Merchello.Core.Products.Models;

/// <summary>
/// Stock status classification for products and variants.
/// Calculated centrally by the backend to ensure consistency.
/// </summary>
public enum StockStatus
{
    /// <summary>
    /// Stock is above the low stock threshold
    /// </summary>
    InStock,

    /// <summary>
    /// Stock is at or below the low stock threshold but greater than zero
    /// </summary>
    LowStock,

    /// <summary>
    /// Stock is zero or less
    /// </summary>
    OutOfStock,

    /// <summary>
    /// Stock tracking is disabled (unlimited availability)
    /// </summary>
    Untracked
}

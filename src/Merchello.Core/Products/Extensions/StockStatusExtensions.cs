using Merchello.Core.Products.Models;

namespace Merchello.Core.Products.Extensions;

/// <summary>
/// Extension methods for StockStatus enum to provide display values.
/// Centralizes status-to-display logic to avoid frontend duplication.
/// </summary>
public static class StockStatusExtensions
{
    /// <summary>
    /// Gets the human-readable label for a stock status.
    /// </summary>
    public static string ToLabel(this StockStatus status) => status switch
    {
        StockStatus.InStock => "In Stock",
        StockStatus.LowStock => "Low Stock",
        StockStatus.OutOfStock => "Out of Stock",
        StockStatus.Untracked => "Untracked",
        _ => "Unknown"
    };

    /// <summary>
    /// Gets the CSS class for stock status badges.
    /// </summary>
    public static string ToCssClass(this StockStatus status) => status switch
    {
        StockStatus.InStock => "badge-positive",
        StockStatus.LowStock => "badge-warning",
        StockStatus.OutOfStock => "badge-danger",
        StockStatus.Untracked => "badge-default",
        _ => "badge-default"
    };
}

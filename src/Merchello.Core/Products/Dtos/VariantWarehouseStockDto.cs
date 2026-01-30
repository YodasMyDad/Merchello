using Merchello.Core.Products.Models;

namespace Merchello.Core.Products.Dtos;

/// <summary>
/// Warehouse stock information for a variant
/// </summary>
public class VariantWarehouseStockDto
{
    public Guid WarehouseId { get; set; }
    public string? WarehouseName { get; set; }

    /// <summary>
    /// Total stock in this warehouse (raw value).
    /// </summary>
    public int Stock { get; set; }

    /// <summary>
    /// Stock reserved for pending orders.
    /// </summary>
    public int ReservedStock { get; set; }

    /// <summary>
    /// Available stock for new orders (Stock - ReservedStock).
    /// This is the value that should be used for display and validation.
    /// </summary>
    public int AvailableStock { get; set; }

    public int? ReorderPoint { get; set; }
    public int? ReorderQuantity { get; set; }
    public bool TrackStock { get; set; }

    /// <summary>
    /// Stock status classification calculated by the backend.
    /// Use this instead of comparing AvailableStock to threshold locally.
    /// </summary>
    public StockStatus StockStatus { get; set; }

    /// <summary>
    /// Display label for the stock status (backend source of truth).
    /// </summary>
    public string StockStatusLabel { get; set; } = string.Empty;

    /// <summary>
    /// CSS class for stock status badges (backend source of truth).
    /// </summary>
    public string StockStatusCssClass { get; set; } = string.Empty;
}

using Merchello.Core.Warehouses.Models;

namespace Merchello.Core.Products.Models;

/// <summary>
/// Junction table tracking stock for each product variant at each warehouse.
/// Enables multi-warehouse inventory management with per-variant, per-location stock levels.
/// </summary>
public class ProductWarehouse
{
    /// <summary>
    /// The product variant ID
    /// </summary>
    public Guid ProductId { get; set; }

    /// <summary>
    /// Navigation property to the product variant
    /// </summary>
    public virtual Product Product { get; set; } = null!;

    /// <summary>
    /// The warehouse ID
    /// </summary>
    public Guid WarehouseId { get; set; }

    /// <summary>
    /// Navigation property to the warehouse
    /// </summary>
    public virtual Warehouse Warehouse { get; set; } = null!;

    /// <summary>
    /// Current stock quantity for this variant at this warehouse
    /// </summary>
    public int Stock { get; set; }

    /// <summary>
    /// Optional: Stock level that triggers reorder notification
    /// </summary>
    public int? ReorderPoint { get; set; }

    /// <summary>
    /// Optional: Quantity to reorder when stock hits reorder point
    /// </summary>
    public int? ReorderQuantity { get; set; }

    /// <summary>
    /// Enable/disable stock tracking for this product at this warehouse.
    /// When false, stock levels are not enforced (useful for digital products, made-to-order, dropship, etc.)
    /// </summary>
    public bool TrackStock { get; set; } = false;

    /// <summary>
    /// Stock quantity reserved by pending orders (only used when TrackStock = true)
    /// Available stock = Stock - ReservedStock
    /// </summary>
    public int ReservedStock { get; set; }

    /// <summary>
    /// Concurrency token for optimistic locking.
    /// Prevents race conditions during concurrent stock updates.
    /// Auto-initialized with current timestamp for new records.
    /// </summary>
    public byte[] RowVersion { get; set; } = BitConverter.GetBytes(DateTime.UtcNow.Ticks);
}


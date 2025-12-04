namespace Merchello.Core.Warehouses.Models;

/// <summary>
/// Represents a portion of an order allocated to a specific warehouse
/// </summary>
public class WarehouseAllocation
{
    /// <summary>
    /// The warehouse fulfilling this portion
    /// </summary>
    public Warehouse Warehouse { get; set; } = null!;

    /// <summary>
    /// Quantity allocated from this warehouse
    /// </summary>
    public int AllocatedQuantity { get; set; }

    /// <summary>
    /// Available stock at this warehouse
    /// </summary>
    public int AvailableStock { get; set; }
}


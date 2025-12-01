using Merchello.Core.Warehouses.Models;

namespace Merchello.Core.Warehouses.Services.Models;

/// <summary>
/// Result of warehouse selection for a product
/// </summary>
public class WarehouseSelectionResult
{
    /// <summary>
    /// The selected warehouse (null if none eligible)
    /// Primary warehouse for single-warehouse fulfillment
    /// </summary>
    public Warehouse? Warehouse { get; set; }

    /// <summary>
    /// Whether a suitable warehouse was found
    /// </summary>
    public bool Success => Warehouse != null || WarehouseAllocations.Any();

    /// <summary>
    /// Reason for failure (if applicable)
    /// </summary>
    public string? FailureReason { get; set; }

    /// <summary>
    /// Available stock at the selected warehouse
    /// </summary>
    public int AvailableStock { get; set; }

    /// <summary>
    /// Multiple warehouse allocations for split fulfillment
    /// Used when no single warehouse can fulfill the full quantity
    /// </summary>
    public List<WarehouseAllocation> WarehouseAllocations { get; set; } = [];

    /// <summary>
    /// Total available quantity across all allocated warehouses
    /// </summary>
    public int TotalAllocatedQuantity => WarehouseAllocations.Sum(wa => wa.AllocatedQuantity);
}

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


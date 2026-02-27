namespace Merchello.Core.Warehouses.Models;

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
    /// Whether the failure is due to insufficient stock (vs region/eligibility)
    /// </summary>
    public bool IsStockFailure { get; set; }

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


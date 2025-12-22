namespace Merchello.Core.Shipping.Dtos;

/// <summary>
/// Result for product fulfillment options lookup.
/// Returns the best warehouse that can fulfill a product to a destination.
/// Used by product picker modal to determine shipping eligibility without iterating warehouses on the frontend.
/// </summary>
public class ProductFulfillmentOptionsDto
{
    /// <summary>
    /// Whether this product can be added to an order for the given destination.
    /// This is the authoritative backend decision that consolidates:
    /// - Region eligibility (warehouse can serve destination)
    /// - Stock availability (if tracked, stock > 0)
    /// - Product availability (availableForPurchase flag)
    /// Frontend should use this instead of local validation logic.
    /// </summary>
    public bool CanAddToOrder { get; set; }

    /// <summary>
    /// The warehouse that can fulfill this product for the given destination.
    /// Null if no warehouse can serve the region or has stock.
    /// </summary>
    public FulfillmentWarehouseDto? FulfillingWarehouse { get; set; }

    /// <summary>
    /// Reason why product cannot be added to order (if CanAddToOrder is false).
    /// Examples: "Out of stock", "Cannot ship to region", "Not available for purchase"
    /// </summary>
    public string? BlockedReason { get; set; }

    /// <summary>
    /// Whether stock is tracked and available
    /// </summary>
    public bool HasAvailableStock { get; set; }

    /// <summary>
    /// Total available stock across all eligible warehouses
    /// </summary>
    public int AvailableStock { get; set; }

    /// <summary>
    /// Aggregate stock status across all warehouses (InStock/LowStock/OutOfStock/Untracked).
    /// Calculated by backend - frontend should use this instead of deriving from warehouse data.
    /// </summary>
    public string AggregateStockStatus { get; set; } = "InStock";
}

/// <summary>
/// Warehouse that can fulfill a product
/// </summary>
public class FulfillmentWarehouseDto
{
    /// <summary>
    /// Warehouse ID
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Warehouse display name
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Available stock at this warehouse (Stock - ReservedStock)
    /// </summary>
    public int AvailableStock { get; set; }
}

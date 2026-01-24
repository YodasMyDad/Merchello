using Merchello.Core.Checkout.Models;
using Merchello.Core.Locality.Models;
using Merchello.Core.Products.Models;
using Merchello.Core.Warehouses.Models;

namespace Merchello.Core.Checkout.Strategies.Models;

/// <summary>
/// Context provided to order grouping strategies containing all information
/// needed to determine how basket items should be grouped into orders.
/// </summary>
public class OrderGroupingContext
{
    /// <summary>
    /// The basket containing line items to be grouped.
    /// </summary>
    public required Basket Basket { get; init; }

    /// <summary>
    /// The billing address for the order.
    /// </summary>
    public required Address BillingAddress { get; init; }

    /// <summary>
    /// The shipping address for the order.
    /// </summary>
    public required Address ShippingAddress { get; init; }

    /// <summary>
    /// Customer ID if the customer is logged in.
    /// </summary>
    public Guid? CustomerId { get; init; }

    /// <summary>
    /// Customer email address if available.
    /// </summary>
    public string? CustomerEmail { get; init; }

    /// <summary>
    /// Dictionary of products keyed by ProductId for line items in the basket.
    /// Preloaded to avoid N+1 queries in strategy implementations.
    /// </summary>
    public required IReadOnlyDictionary<Guid, Product> Products { get; init; }

    /// <summary>
    /// Dictionary of available warehouses keyed by WarehouseId.
    /// Preloaded to avoid N+1 queries in strategy implementations.
    /// </summary>
    public required IReadOnlyDictionary<Guid, Warehouse> Warehouses { get; init; }

    /// <summary>
    /// Previously selected shipping options per group (if any).
    /// Key: GroupId, Value: SelectionKey ("so:{guid}" for flat-rate, "dyn:{provider}:{serviceCode}" for dynamic)
    /// </summary>
    public Dictionary<Guid, string> SelectedShippingOptions { get; init; } = [];

    /// <summary>
    /// Per-line-item shipping selections. Used when adding products with specific shipping options.
    /// Key: LineItemId (or ProductId for pending items), Value: (WarehouseId, SelectionKey)
    /// </summary>
    public Dictionary<Guid, (Guid WarehouseId, string SelectionKey)> LineItemShippingSelections { get; init; } = [];

    /// <summary>
    /// Extended data for custom strategy implementations.
    /// Can be used to pass additional context-specific data.
    /// </summary>
    public Dictionary<string, object> ExtendedData { get; init; } = [];
}


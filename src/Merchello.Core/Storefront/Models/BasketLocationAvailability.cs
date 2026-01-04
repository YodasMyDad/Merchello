namespace Merchello.Core.Storefront.Models;

/// <summary>
/// Availability information for a single basket item at a shipping location.
/// </summary>
public record BasketItemLocationAvailability(
    /// <summary>The basket line item ID</summary>
    Guid LineItemId,

    /// <summary>The product variant ID</summary>
    Guid ProductId,

    /// <summary>True if this item can ship to the location</summary>
    bool CanShipToLocation,

    /// <summary>True if there's sufficient stock for this item</summary>
    bool HasStock,

    /// <summary>User-friendly status message</summary>
    string StatusMessage);

/// <summary>
/// Availability information for an entire basket at a shipping location.
/// </summary>
public record BasketLocationAvailability(
    /// <summary>True if all items in the basket can ship to the location with sufficient stock</summary>
    bool AllItemsAvailable,

    /// <summary>Per-item availability details</summary>
    IReadOnlyList<BasketItemLocationAvailability> Items);

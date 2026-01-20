namespace Merchello.Core.Storefront.Models;

/// <summary>
/// Availability information for an entire basket at a shipping location.
/// </summary>
public record BasketLocationAvailability(
    /// <summary>True if all items in the basket can ship to the location with sufficient stock</summary>
    bool AllItemsAvailable,

    /// <summary>Per-item availability details</summary>
    IReadOnlyList<BasketItemLocationAvailability> Items);

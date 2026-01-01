namespace Merchello.Core.Storefront.Models;

/// <summary>
/// Product availability information for a specific shipping location.
/// </summary>
public record ProductLocationAvailability(
    /// <summary>True if any warehouse can ship to this country/region</summary>
    bool CanShipToLocation,

    /// <summary>True if there's stock in warehouses that can ship to this location</summary>
    bool HasStock,

    /// <summary>Total stock available from warehouses that can ship to this location</summary>
    int AvailableStock,

    /// <summary>User-friendly status message (e.g., "In Stock", "Out of Stock", "Not available in United Kingdom")</summary>
    string StatusMessage,

    /// <summary>Whether to show stock counts (from MerchelloSettings.ShowStockLevels)</summary>
    bool ShowStockLevels);
